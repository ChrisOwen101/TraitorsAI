import { NextRequest } from 'next/server'
import * as db from '@/lib/db/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const players = await db.getPlayersByGame(params.gameId)
    return Response.json(players)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}
