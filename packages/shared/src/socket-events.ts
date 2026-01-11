/**
 * Socket.io event type definitions for type-safe communication between frontend and backend.
 *
 * @remarks
 * Uses discriminated unions for realtime events to ensure type safety across the network boundary.
 * Server and client events are kept separate to prevent logic errors.
 */

/**
 * Events sent from server to client.
 */
export interface ServerToClientEvents {
    "game:created": (gameId: string) => void
    "game:joined": (data: { gameId: string; playerId: string; playerCount: number }) => void
    "game:started": (data: { gameId: string }) => void
    "game:phase-changed": (data: { phase: GamePhase }) => void
    "game:state": (data: GameStateUpdate) => void
    "player:joined": (data: { playerId: string; playerName: string }) => void
    "player:left": (data: { playerId: string }) => void
    "player:ready": (data: { playerId: string; isReady: boolean }) => void
    "chat:message": (data: ChatMessageData) => void
    "round:started": (data: { roundNumber: number; endsAt: string }) => void
    "round:ended": (data: { eliminatedPlayerId: string | null; eliminatedPlayerName: string | null }) => void
    "vote:cast": (data: { voterId: string; hasVoted: boolean }) => void
    "game:over": (data: { winners: string[]; winningTeam: PlayerRole }) => void
    "error": (data: { message: string; code: string }) => void
}

/**
 * Events sent from client to server.
 */
export interface ClientToServerEvents {
    "game:create": (callback: (response: CreateGameResponse) => void) => void
    "game:join": (
        data: { gameId: string },
        callback: (response: JoinGameResponse) => void
    ) => void
    "player:ready": (data: { gameId: string; isReady: boolean }) => void
    "game:start": (data: { gameId: string }, callback: (response: StartGameResponse) => void) => void
    "chat:send": (data: { gameId: string; message: string }) => void
    "vote:cast": (data: { gameId: string; targetPlayerId: string }, callback: (response: VoteResponse) => void) => void
    "game:action": (data: { gameId: string; action: GameAction }) => void
}

/**
 * Game phases representing the current state of a game.
 */
export enum GamePhase {
    Lobby = "lobby",
    RoundInProgress = "round-in-progress",
    Voting = "voting",
    Elimination = "elimination",
    GameOver = "game-over",
}

/**
 * Supported game actions by players.
 */
export type GameAction =
    | { type: "vote"; playerId: string }
    | { type: "nominate"; playerId: string }
    | { type: "reveal"; role: PlayerRole }

/**
 * Player roles in the game.
 */
export enum PlayerRole {
    Traitor = "traitor",
    Faithful = "faithful",
}

/**
 * Response for game creation.
 */
export interface CreateGameResponse {
    success: boolean
    gameId?: string
    playerId?: string
    playerName?: string
    error?: string
}

/**
 * Response for joining a game.
 */
export interface JoinGameResponse {
    success: boolean
    playerId?: string
    playerName?: string
    gameId?: string
    error?: string
}

/**
 * Response for starting a game.
 */
export interface StartGameResponse {
    success: boolean
    error?: string
}

/**
 * Response for casting a vote.
 */
export interface VoteResponse {
    success: boolean
    error?: string
}

/**
 * Chat message data sent to clients.
 */
export interface ChatMessageData {
    id: string
    playerId: string
    playerName: string
    message: string
    timestamp: string
}

/**
 * Game state update sent to clients.
 */
export interface GameStateUpdate {
    gameId: string
    phase: GamePhase
    playerCount: number
    playersReady?: number
    myRole?: PlayerRole | null
    knownRoles?: { playerId: string; playerName: string; role: PlayerRole | null }[]
    currentRoundNumber?: number
    roundEndsAt?: string
    votesReceived?: number
    eliminatedPlayers?: string[]
}
