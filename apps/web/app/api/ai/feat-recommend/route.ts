import { NextRequest, NextResponse } from 'next/server'
import { recommendFeats } from '@dndmanager/ai-services'
import type { FeatRecommendationRequest } from '@dndmanager/ai-services'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeatRecommendationRequest

    if (!body.character || !body.featType || !body.maxFeatLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: character, featType, maxFeatLevel' },
        { status: 400 }
      )
    }

    const result = await recommendFeats(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Feat recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate feat recommendations' },
      { status: 500 }
    )
  }
}
