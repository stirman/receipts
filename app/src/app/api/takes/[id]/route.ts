import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/takes/[id] - Fetch a single take
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const take = await prisma.take.findUnique({
      where: { id },
    })

    if (!take) {
      return NextResponse.json(
        { error: 'Take not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(take)
  } catch (error) {
    console.error('Error fetching take:', error)
    return NextResponse.json(
      { error: 'Failed to fetch take' },
      { status: 500 }
    )
  }
}
