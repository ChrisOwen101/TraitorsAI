/**
 * Game manager service that handles game state and logic.
 *
 * @remarks
 * Manages the in-memory store of games and player states. Designed to be extended
 * with database persistence as needed.
 */

import { randomUUID } from "crypto"
import type { Game, Player, ChatMessage, Round } from "@traitors-ai/shared"
import { GamePhase, PlayerRole, getUniqueName } from "@traitors-ai/shared"
import { AIPlayer } from "./ai-player.js"

const ROUND_DURATION_MS = 3 * 60 * 1000 // 3 minutes
const AI_CHAT_INTERVAL_MS = 15 * 1000 // AI chats every 15 seconds

/**
 * Manages game instances and player states.
 */
class GameManager {
    private games: Map<string, Game> = new Map()
    private aiPlayers: Map<string, AIPlayer> = new Map()
    private roundTimers: Map<string, NodeJS.Timeout> = new Map()
    private aiChatTimers: Map<string, NodeJS.Timeout> = new Map()
    private eventEmitter: ((event: string, gameId: string, data?: unknown) => void) | null = null

    /**
     * Set the event emitter for broadcasting game events.
     */
    setEventEmitter(emitter: (event: string, gameId: string, data?: unknown) => void): void {
        this.eventEmitter = emitter
    }

    /**
     * Create a new game instance.
     *
     * @param socketId - The socket ID of the player creating the game
     * @returns The newly created game and player
     */
    createGame(socketId: string): { game: Game; player: Player } {
        const gameId = randomUUID()
        const playerId = socketId
        const playerName = getUniqueName([])

        const player: Player = {
            id: playerId,
            name: playerName,
            role: null,
            isEliminated: false,
            isReady: false,
            isAI: false,
            joinedAt: new Date(),
        }

        const game: Game = {
            id: gameId,
            phase: GamePhase.Lobby,
            players: [player],
            chatMessages: [],
            currentRound: null,
            rounds: [],
            createdAt: new Date(),
            startedAt: null,
            endedAt: null,
        }

        this.games.set(gameId, game)
        return { game, player }
    }

    /**
     * Join an existing game.
     *
     * @param gameId - The ID of the game to join
     * @param socketId - The socket ID of the player joining
     * @returns The game and player if successful, null otherwise
     */
    joinGame(gameId: string, socketId: string): { game: Game; player: Player } | null {
        const game = this.games.get(gameId)

        if (!game || game.phase !== GamePhase.Lobby) {
            return null
        }

        const usedNames = game.players.map(p => p.name)
        const playerName = getUniqueName(usedNames)

        const player: Player = {
            id: socketId,
            name: playerName,
            role: null,
            isEliminated: false,
            isReady: false,
            isAI: false,
            joinedAt: new Date(),
        }

        game.players.push(player)
        return { game, player }
    }

    /**
     * Set player ready status.
     */
    setPlayerReady(gameId: string, playerId: string, isReady: boolean): boolean {
        const game = this.games.get(gameId)
        if (!game || game.phase !== GamePhase.Lobby) {
            return false
        }

        const player = game.players.find(p => p.id === playerId)
        if (!player) {
            return false
        }

        player.isReady = isReady
        return true
    }

    /**
     * Check if all players are ready.
     */
    areAllPlayersReady(gameId: string): boolean {
        const game = this.games.get(gameId)
        if (!game || game.players.length === 0) {
            return false
        }

        return game.players.every(p => p.isReady)
    }

    /**
     * Start a game - adds AI players and assigns roles.
     *
     * @param gameId - The ID of the game to start
     * @returns The started game if successful, null otherwise
     */
    startGame(gameId: string): Game | null {
        const game = this.games.get(gameId)

        if (!game || game.players.length < 1) {
            return null
        }

        // Add 2 AI players
        this.addAIPlayers(game, 2)

        game.phase = GamePhase.RoundInProgress
        game.startedAt = new Date()

        // Assign roles (2 traitors, rest faithful)
        this.assignRoles(game)

        // Start first round
        this.startNewRound(game)

        // Start AI chat timer
        this.startAIChatTimer(gameId)

        return game
    }

    /**
     * Add AI players to the game.
     */
    private addAIPlayers(game: Game, count: number): void {
        const usedNames = game.players.map(p => p.name)

        for (let i = 0; i < count; i++) {
            const playerId = randomUUID()
            const playerName = getUniqueName(usedNames)
            usedNames.push(playerName)

            const player: Player = {
                id: playerId,
                name: playerName,
                role: null,
                isEliminated: false,
                isReady: true,
                isAI: true,
                joinedAt: new Date(),
            }

            game.players.push(player)
            this.aiPlayers.set(playerId, new AIPlayer())
        }
    }

    /**
     * Start a new round in the game.
     */
    private startNewRound(game: Game): void {
        const roundNumber = game.rounds.length + 1
        const startedAt = new Date()
        const endsAt = new Date(startedAt.getTime() + ROUND_DURATION_MS)

        const round: Round = {
            number: roundNumber,
            startedAt,
            endsAt,
            votes: [],
            eliminated: null,
        }

        game.currentRound = round
        game.phase = GamePhase.RoundInProgress

        // Emit round started event
        if (this.eventEmitter) {
            this.eventEmitter("round:started", game.id, {
                roundNumber,
                endsAt: endsAt.toISOString(),
            })
        }

        // Set timer to end round
        const timer = setTimeout(() => {
            this.endRound(game.id)
        }, ROUND_DURATION_MS)

        this.roundTimers.set(game.id, timer)
    }

    /**
     * End the current round and transition to voting.
     */
    private endRound(gameId: string): void {
        const game = this.games.get(gameId)
        if (!game || !game.currentRound) {
            return
        }

        game.phase = GamePhase.Voting

        // Emit phase change
        if (this.eventEmitter) {
            this.eventEmitter("game:phase-changed", game.id, { phase: GamePhase.Voting })
        }

        // AI players cast votes automatically after a delay
        setTimeout(() => {
            this.makeAIVotes(game)
        }, 2000)
    }

    /**
     * Make AI players vote.
     */
    private makeAIVotes(game: Game): void {
        const aiPlayers = game.players.filter(p => p.isAI && !p.isEliminated)

        for (const aiPlayer of aiPlayers) {
            const ai = this.aiPlayers.get(aiPlayer.id)
            if (ai) {
                const targetId = ai.chooseVoteTarget(aiPlayer, game)
                if (targetId) {
                    this.castVote(game.id, aiPlayer.id, targetId)
                }
            }
        }
    }

    /**
     * Cast a vote for a player.
     */
    castVote(gameId: string, voterId: string, targetId: string): boolean {
        const game = this.games.get(gameId)

        if (!game || game.phase !== GamePhase.Voting || !game.currentRound) {
            return false
        }

        const voter = game.players.find(p => p.id === voterId)
        const target = game.players.find(p => p.id === targetId)

        if (!voter || !target || voter.isEliminated || target.isEliminated) {
            return false
        }

        // Remove existing vote from this voter
        game.currentRound.votes = game.currentRound.votes.filter(v => v.voterId !== voterId)

        // Add new vote
        game.currentRound.votes.push({ voterId, targetId })

        // Emit vote cast event (but hide who they voted for)
        if (this.eventEmitter) {
            this.eventEmitter("vote:cast", game.id, { voterId, hasVoted: true })
        }

        // Check if all alive players have voted
        const alivePlayers = game.players.filter(p => !p.isEliminated)
        if (game.currentRound.votes.length === alivePlayers.length) {
            this.tallyVotes(gameId)
        }

        return true
    }

    /**
     * Tally votes and eliminate the player with the most votes.
     */
    private tallyVotes(gameId: string): void {
        const game = this.games.get(gameId)

        if (!game || !game.currentRound) {
            return
        }

        const voteCounts = new Map<string, number>()

        // Count votes
        for (const vote of game.currentRound.votes) {
            voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) ?? 0) + 1)
        }

        // Find player with most votes
        let maxVotes = 0
        let eliminatedId: string | null = null

        for (const [playerId, count] of voteCounts) {
            if (count > maxVotes) {
                maxVotes = count
                eliminatedId = playerId
            }
        }

        // Eliminate player
        if (eliminatedId) {
            const player = game.players.find(p => p.id === eliminatedId)
            if (player) {
                player.isEliminated = true
                game.currentRound.eliminated = eliminatedId

                // Emit elimination event
                if (this.eventEmitter) {
                    this.eventEmitter("round:ended", game.id, {
                        eliminatedPlayerId: eliminatedId,
                        eliminatedPlayerName: player.name,
                    })
                }
            }
        } else {
            // No one eliminated (tie or no votes)
            if (this.eventEmitter) {
                this.eventEmitter("round:ended", game.id, {
                    eliminatedPlayerId: null,
                    eliminatedPlayerName: null,
                })
            }
        }

        // Save round to history
        game.rounds.push(game.currentRound)
        game.currentRound = null

        // Check win conditions
        if (this.checkGameOver(game)) {
            return
        }

        // Start next round after a delay
        setTimeout(() => {
            this.startNewRound(game)
        }, 5000)
    }

    /**
     * Check if the game is over and determine winners.
     */
    private checkGameOver(game: Game): boolean {
        const alivePlayers = game.players.filter(p => !p.isEliminated)
        const aliveTraitors = alivePlayers.filter(p => p.role === PlayerRole.Traitor)
        const aliveFaithful = alivePlayers.filter(p => p.role === PlayerRole.Faithful)

        let gameOver = false
        let winningTeam: PlayerRole | null = null

        // Traitors win if they equal or outnumber faithful
        if (aliveTraitors.length >= aliveFaithful.length && aliveTraitors.length > 0) {
            gameOver = true
            winningTeam = PlayerRole.Traitor
        }

        // Faithful win if all traitors are eliminated
        if (aliveTraitors.length === 0) {
            gameOver = true
            winningTeam = PlayerRole.Faithful
        }

        if (gameOver && winningTeam) {
            game.phase = GamePhase.GameOver
            game.endedAt = new Date()

            const winners = game.players.filter(p => p.role === winningTeam).map(p => p.id)

            // Clear timers
            this.clearGameTimers(game.id)

            // Emit game over event
            if (this.eventEmitter) {
                this.eventEmitter("game:over", game.id, {
                    winners,
                    winningTeam,
                })
            }
        }

        return gameOver
    }

    /**
     * Add a chat message to the game.
     */
    addChatMessage(gameId: string, playerId: string, message: string): ChatMessage | null {
        const game = this.games.get(gameId)

        if (!game) {
            return null
        }

        const player = game.players.find(p => p.id === playerId)

        if (!player || player.isEliminated) {
            return null
        }

        const chatMessage: ChatMessage = {
            id: randomUUID(),
            playerId,
            playerName: player.name,
            message,
            timestamp: new Date(),
        }

        game.chatMessages.push(chatMessage)
        return chatMessage
    }

    /**
     * Start AI chat timer to periodically generate messages.
     */
    private startAIChatTimer(gameId: string): void {
        const timer = setInterval(() => {
            const game = this.games.get(gameId)
            if (!game || game.phase === GamePhase.GameOver) {
                this.clearGameTimers(gameId)
                return
            }

            // Only chat during rounds, not voting
            if (game.phase !== GamePhase.RoundInProgress) {
                return
            }

            // Have each AI potentially send a message
            const aiPlayers = game.players.filter(p => p.isAI && !p.isEliminated)

            for (const aiPlayer of aiPlayers) {
                const ai = this.aiPlayers.get(aiPlayer.id)
                if (ai) {
                    const message = ai.generateChatMessage(aiPlayer, game)
                    if (message) {
                        const chatMessage = this.addChatMessage(gameId, aiPlayer.id, message)
                        if (chatMessage && this.eventEmitter) {
                            this.eventEmitter("chat:message", gameId, {
                                id: chatMessage.id,
                                playerId: chatMessage.playerId,
                                playerName: chatMessage.playerName,
                                message: chatMessage.message,
                                timestamp: chatMessage.timestamp.toISOString(),
                            })
                        }
                    }
                }
            }
        }, AI_CHAT_INTERVAL_MS)

        this.aiChatTimers.set(gameId, timer)
    }

    /**
     * Clear all timers for a game.
     */
    private clearGameTimers(gameId: string): void {
        const roundTimer = this.roundTimers.get(gameId)
        if (roundTimer) {
            clearTimeout(roundTimer)
            this.roundTimers.delete(gameId)
        }

        const chatTimer = this.aiChatTimers.get(gameId)
        if (chatTimer) {
            clearInterval(chatTimer)
            this.aiChatTimers.delete(gameId)
        }
    }

    /**
     * Get a game by ID.
     *
     * @param gameId - The ID of the game to retrieve
     * @returns The game if found, null otherwise
     */
    getGame(gameId: string): Game | null {
        return this.games.get(gameId) ?? null
    }

    /**
     * Get player by ID in a game.
     */
    getPlayer(gameId: string, playerId: string): Player | null {
        const game = this.games.get(gameId)
        if (!game) {
            return null
        }

        return game.players.find(p => p.id === playerId) ?? null
    }

    /**
     * Get roles that a player should know about.
     * Traitors know all roles, Faithful only know their own.
     */
    getKnownRoles(gameId: string, playerId: string): { playerId: string; playerName: string; role: PlayerRole }[] {
        const game = this.games.get(gameId)
        const player = this.getPlayer(gameId, playerId)

        if (!game || !player || !player.role) {
            return []
        }

        if (player.role === PlayerRole.Traitor) {
            // Traitors know everyone's roles
            return game.players
                .filter(p => p.role !== null)
                .map(p => ({
                    playerId: p.id,
                    playerName: p.name,
                    role: p.role!,
                }))
        }

        // Faithful only know their own role
        return []
    }

    /**
     * Assign random roles to players in a game.
     *
     * @remarks
     * Always assigns exactly 2 traitors, rest are faithful.
     */
    private assignRoles(game: Game): void {
        const traitorCount = 2
        const shuffled = [...game.players].sort(() => Math.random() - 0.5)

        for (let i = 0; i < shuffled.length; i++) {
            shuffled[i].role = i < traitorCount ? PlayerRole.Traitor : PlayerRole.Faithful
        }
    }

    /**
     * Remove a player from a game.
     */
    removePlayer(gameId: string, playerId: string): void {
        const game = this.games.get(gameId)

        if (!game) {
            return
        }

        game.players = game.players.filter(p => p.id !== playerId)

        // If no players left, clean up game
        if (game.players.length === 0) {
            this.clearGameTimers(gameId)
            this.games.delete(gameId)
        }
    }
}

export const gameManager = new GameManager()

