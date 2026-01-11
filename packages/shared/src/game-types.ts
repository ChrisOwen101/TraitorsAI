/**
 * Core game types and domain models.
 */

import { GamePhase, PlayerRole } from "./socket-events.js"

/**
 * Represents a player in the game.
 */
export interface Player {
    id: string
    name: string
    role: PlayerRole | null
    isEliminated: boolean
    isReady: boolean
    isAI: boolean
    joinedAt: Date
}

/**
 * Represents a chat message in the game.
 */
export interface ChatMessage {
    id: string
    playerId: string
    playerName: string
    message: string
    timestamp: Date
}

/**
 * Represents a vote in the game.
 */
export interface Vote {
    voterId: string
    targetId: string
}

/**
 * Represents a round in the game.
 */
export interface Round {
    number: number
    startedAt: Date
    endsAt: Date
    votes: Vote[]
    eliminated: string | null
}

/**
 * Represents a game instance.
 */
export interface Game {
    id: string
    phase: GamePhase
    players: Player[]
    chatMessages: ChatMessage[]
    currentRound: Round | null
    rounds: Round[]
    createdAt: Date
    startedAt: Date | null
    endedAt: Date | null
}

/**
 * Represents the result of a game.
 */
export interface GameResult {
    gameId: string
    winners: Player[]
    losers: Player[]
    endedAt: Date
}
