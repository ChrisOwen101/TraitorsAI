import { NextRequest } from 'next/server'
import * as db from '@/lib/db/storage'

export async function POST(request: NextRequest) {
  try {
    const { name, gameId } = await request.json()
    if (!name || !gameId) {
      return Response.json({ error: 'Name and game ID are required' }, { status: 400 })
    }
    const player = await db.createPlayer({
      name,
      gameId,
      role: 'loyal',
      isAlive: true
    })
    return Response.json(player, { status: 201 })
  } catch (error) {
    return Response.json({ error: 'Failed to create player' }, { status: 500 })
  }
}
