import { NextRequest } from 'next/server'
import * as db from '@/lib/db/storage'

export async function GET(request: NextRequest) {
  try {
    const games = await db.getAllGames()
    return Response.json(games)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    if (!name) {
      return Response.json({ error: 'Game name is required' }, { status: 400 })
    }
    const game = await db.createGame({
      name,
      status: 'lobby',
      players: []
    })
    return Response.json(game, { status: 201 })
  } catch (error) {
    return Response.json({ error: 'Failed to create game' }, { status: 500 })
  }
}
