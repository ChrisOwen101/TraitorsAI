import { NextRequest } from 'next/server'
import * as db from '@/lib/db/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const player = await db.getPlayer(params.playerId)
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }
    return Response.json(player)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch player' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const updates = await request.json()
    const player = await db.updatePlayer(params.playerId, updates)
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }
    return Response.json(player)
  } catch (error) {
    return Response.json({ error: 'Failed to update player' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const success = await db.deletePlayer(params.playerId)
    if (!success) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed to delete player' }, { status: 500 })
  }
}
