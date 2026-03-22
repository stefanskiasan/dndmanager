import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createMeshyClient,
  createMockMeshyClient,
  optimizeModelPrompt,
} from '@dndmanager/ai-services'
import type { MeshyClient } from '@dndmanager/ai-services'

function getMeshyClient(): MeshyClient {
  if (process.env.MESHY_API_KEY) {
    return createMeshyClient()
  }
  console.warn('[model-generate] No MESHY_API_KEY — using mock client')
  return createMockMeshyClient()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { characterId } = body as { characterId: string }

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
  }

  // Fetch character (verifies ownership via RLS)
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('id, name, data, owner_id, model_status')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }

  if (character.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your character' }, { status: 403 })
  }

  if (character.model_status === 'pending' || character.model_status === 'processing') {
    return NextResponse.json({ error: 'Generation already in progress' }, { status: 409 })
  }

  // Mark as pending
  await supabase
    .from('characters')
    .update({ model_status: 'pending' })
    .eq('id', characterId)

  // Extract character details from JSONB data
  const charData = (character.data ?? {}) as Record<string, string>
  const description = charData.description ?? charData.concept ?? character.name
  const ancestry = charData.ancestry ?? ''
  const className = charData.class ?? ''

  try {
    // Step 1: Optimize prompt via Claude
    const optimized = await optimizeModelPrompt({
      characterName: character.name,
      characterDescription: description,
      ancestry,
      className,
    })

    // Step 2: Create Meshy task
    const meshyClient = getMeshyClient()
    const taskId = await meshyClient.createTextTo3DTask({
      mode: 'preview',
      prompt: optimized.prompt,
      art_style: optimized.artStyle,
      negative_prompt: optimized.negativePrompt,
    })

    // Step 3: Update status to processing
    await supabase
      .from('characters')
      .update({ model_status: 'processing' })
      .eq('id', characterId)

    // Step 4: Poll in background (fire-and-forget for the API response)
    // The client will poll /api/ai/model-status for updates
    pollAndStore(meshyClient, taskId, characterId, user.id, supabase).catch((err) => {
      console.error(`[model-generate] Background poll failed for ${characterId}:`, err)
    })

    return NextResponse.json({
      meshyTaskId: taskId,
      status: 'processing',
    })
  } catch (err) {
    await supabase
      .from('characters')
      .update({ model_status: 'failed' })
      .eq('id', characterId)

    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Background task: poll Meshy, download GLB, upload to Supabase Storage,
 * update the character record.
 */
async function pollAndStore(
  meshyClient: MeshyClient,
  taskId: string,
  characterId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const task = await meshyClient.pollUntilComplete(taskId, {
    intervalMs: 5000,
    maxAttempts: 120, // ~10 min max
  })

  // Download the GLB
  const glbBuffer = await meshyClient.downloadGlb(task.model_urls.glb)

  // Upload GLB to Supabase Storage
  const glbPath = `${userId}/${characterId}/model.glb`
  const { error: uploadError } = await supabase.storage
    .from('character-models')
    .upload(glbPath, glbBuffer, {
      contentType: 'model/gltf-binary',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Failed to upload GLB: ${uploadError.message}`)
  }

  // Get public URL
  const { data: { publicUrl: modelUrl } } = supabase.storage
    .from('character-models')
    .getPublicUrl(glbPath)

  // Download and upload thumbnail
  let thumbnailUrl: string | null = null
  if (task.thumbnail_url) {
    const thumbResponse = await fetch(task.thumbnail_url)
    const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer())
    const thumbPath = `${userId}/${characterId}/thumbnail.png`

    await supabase.storage
      .from('character-models')
      .upload(thumbPath, thumbBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    thumbnailUrl = supabase.storage
      .from('character-models')
      .getPublicUrl(thumbPath).data.publicUrl
  }

  // Update character record
  await supabase
    .from('characters')
    .update({
      model_url: modelUrl,
      model_thumbnail_url: thumbnailUrl,
      model_status: 'succeeded',
    })
    .eq('id', characterId)
}
