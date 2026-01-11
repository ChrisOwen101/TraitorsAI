import { Game, Player } from '../types/index'

// In-memory storage
const games = new Map<string, Game>()
const players = new Map<string, Player>()

// Database stub functions for games
export async function createGame(gameData: Omit<Game, 'id' | 'createdAt'>): Promise<Game> {
  const id = Math.random().toString(36).substr(2, 9)
  const game: Game = {
    id,
    name: gameData.name,
    status: gameData.status,
    players: gameData.players,
    createdAt: new Date()
  }
  games.set(id, game)
  return game
}

export async function getGame(gameId: string): Promise<Game | null> {
  return games.get(gameId) || null
}

export async function getAllGames(): Promise<Game[]> {
  return Array.from(games.values())
}

export async function updateGame(gameId: string, updates: Partial<Game>): Promise<Game | null> {
  const game = games.get(gameId)
  if (!game) return null
  const updated = { ...game, ...updates }
  games.set(gameId, updated)
  return updated
}

export async function deleteGame(gameId: string): Promise<boolean> {
  return games.delete(gameId)
}

// Database stub functions for players
export async function createPlayer(playerData: Omit<Player, 'id'>): Promise<Player> {
  const id = Math.random().toString(36).substr(2, 9)
  const player: Player = { id, ...playerData }
  players.set(id, player)
  return player
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  return players.get(playerId) || null
}

export async function getPlayersByGame(gameId: string): Promise<Player[]> {
  return Array.from(players.values()).filter(p => p.gameId === gameId)
}

export async function updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player | null> {
  const player = players.get(playerId)
  if (!player) return null
  const updated = { ...player, ...updates }
  players.set(playerId, updated)
  return updated
}

export async function deletePlayer(playerId: string): Promise<boolean> {
  return players.delete(playerId)
}
