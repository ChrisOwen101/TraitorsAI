export interface Game {
  id: string
  name: string
  status: 'lobby' | 'active' | 'finished'
  players: Player[]
  createdAt: Date
}

export interface Player {
  id: string
  name: string
  role: 'loyal' | 'traitor'
  isAlive: boolean
  gameId: string
}

export interface GameSession {
  gameId: string
  round: number
  phase: 'discussion' | 'voting' | 'elimination'
  timeRemaining: number
}

export interface WebSocketMessage {
  type: string
  payload: unknown
}
