import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

// GET /api/takes - Fetch all takes
export async function GET() {
  try {
    const takes = await prisma.take.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(takes)
  } catch (error) {
    console.error('Error fetching takes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch takes' },
      { status: 500 }
    )
  }
}

// POST /api/takes - Create a new take
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, author } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Take text is required' },
        { status: 400 }
      )
    }

    if (text.length > 280) {
      return NextResponse.json(
        { error: 'Take must be 280 characters or less' },
        { status: 400 }
      )
    }

    // Create hash for integrity verification
    const hash = crypto
      .createHash('sha256')
      .update(text + Date.now().toString())
      .digest('hex')
      .substring(0, 16)

    const take = await prisma.take.create({
      data: {
        text: text.trim(),
        author: author?.trim() || 'Anonymous',
        hash,
        lockedAt: new Date(),
      },
    })

    return NextResponse.json(take, { status: 201 })
  } catch (error) {
    console.error('Error creating take:', error)
    return NextResponse.json(
      { error: 'Failed to create take' },
      { status: 500 }
    )
  }
}
