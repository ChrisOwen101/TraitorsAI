import { NextRequest } from 'next/server'
import * as db from '@/lib/db/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const game = await db.getGame(params.gameId)
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 })
    }
    return Response.json(game)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const updates = await request.json()
    const game = await db.updateGame(params.gameId, updates)
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 })
    }
    return Response.json(game)
  } catch (error) {
    return Response.json({ error: 'Failed to update game' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const success = await db.deleteGame(params.gameId)
    if (!success) {
      return Response.json({ error: 'Game not found' }, { status: 404 })
    }
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed to delete game' }, { status: 500 })
  }
}
