import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamCoGMResponse } from '@dndmanager/ai-services'
import type { CoGMRequest } from '@dndmanager/ai-services'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: CoGMRequest
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.message || !body.gameContext) {
    return new Response('Missing message or gameContext', { status: 400 })
  }

  // Verify user is GM of this session
  const { data: session } = await supabase
    .from('sessions')
    .select('campaign_id, campaigns!inner(gm_id)')
    .eq('id', body.gameContext.sessionId)
    .single()

  if (!session || (session.campaigns as any).gm_id !== user.id) {
    return new Response('Forbidden: not the GM', { status: 403 })
  }

  try {
    const stream = await streamCoGMResponse(body)

    // Convert Anthropic stream to a ReadableStream for the response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('Co-GM error:', err)
    return new Response('AI service error', { status: 500 })
  }
}
