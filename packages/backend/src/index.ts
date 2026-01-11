/**
 * Main entry point for the Express + Socket.io backend server.
 */

import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from monorepo root (3 levels up from dist/index.js)
dotenv.config({ path: join(__dirname, "../../../.env") })

import express, { type Express, type Request, type Response, type NextFunction } from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import type { ClientToServerEvents, ServerToClientEvents } from "@traitors-ai/shared"
import { gameManager } from "./game-manager.js"

const app: Express = express()
const port = process.env.PORT ?? 3000

// Middleware
app.use(cors())
app.use(express.json())

// Socket.io setup
const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL ?? "http://localhost:5173",
        credentials: true,
    },
})

// Set up event emitter for game manager
gameManager.setEventEmitter((event, gameId, data) => {
    io.to(gameId).emit(event as keyof ServerToClientEvents, data as never)
})

// Socket.io connection handler
io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`)

    // Create a new game
    socket.on("game:create", (callback) => {
        try {
            const { game, player } = gameManager.createGame(socket.id)
            socket.join(game.id)

            callback({
                success: true,
                gameId: game.id,
                playerId: player.id,
                playerName: player.name,
            })

            // Send initial game state
            socket.emit("game:state", {
                gameId: game.id,
                phase: game.phase,
                playerCount: game.players.length,
                playersReady: game.players.filter(p => p.isReady).length,
            })
        } catch (error) {
            console.error("Error creating game:", error)
            callback({ success: false, error: "Failed to create game" })
        }
    })

    // Join an existing game
    socket.on("game:join", (data, callback) => {
        try {
            const result = gameManager.joinGame(data.gameId, socket.id)

            if (result) {
                const { game, player } = result
                socket.join(data.gameId)

                // Notify room
                io.to(data.gameId).emit("player:joined", {
                    playerId: player.id,
                    playerName: player.name,
                })

                // Update all players with new count
                io.to(data.gameId).emit("game:state", {
                    gameId: game.id,
                    phase: game.phase,
                    playerCount: game.players.length,
                    playersReady: game.players.filter(p => p.isReady).length,
                })

                callback({
                    success: true,
                    playerId: player.id,
                    playerName: player.name,
                    gameId: data.gameId,
                })
            } else {
                callback({ success: false, error: "Game not found or already started" })
            }
        } catch (error) {
            console.error("Error joining game:", error)
            callback({ success: false, error: "Failed to join game" })
        }
    })

    // Player ready/unready
    socket.on("player:ready", (data) => {
        try {
            const success = gameManager.setPlayerReady(data.gameId, socket.id, data.isReady)

            if (success) {
                const game = gameManager.getGame(data.gameId)

                if (game) {
                    io.to(data.gameId).emit("player:ready", {
                        playerId: socket.id,
                        isReady: data.isReady,
                    })

                    io.to(data.gameId).emit("game:state", {
                        gameId: game.id,
                        phase: game.phase,
                        playerCount: game.players.length,
                        playersReady: game.players.filter(p => p.isReady).length,
                    })
                }
            }
        } catch (error) {
            console.error("Error setting player ready:", error)
        }
    })

    // Start the game
    socket.on("game:start", (data, callback) => {
        try {
            // Check if all players are ready
            if (!gameManager.areAllPlayersReady(data.gameId)) {
                callback({ success: false, error: "Not all players are ready" })
                return
            }

            const game = gameManager.startGame(data.gameId)

            if (game) {
                io.to(data.gameId).emit("game:started", { gameId: data.gameId })

                // Send each player their role and known roles
                for (const player of game.players) {
                    const knownRoles = gameManager.getKnownRoles(game.id, player.id)

                    io.to(player.id).emit("game:state", {
                        gameId: game.id,
                        phase: game.phase,
                        playerCount: game.players.length,
                        myRole: player.role,
                        knownRoles,
                        currentRoundNumber: game.currentRound?.number,
                        roundEndsAt: game.currentRound?.endsAt.toISOString(),
                    })
                }

                callback({ success: true })
            } else {
                callback({ success: false, error: "Failed to start game" })
            }
        } catch (error) {
            console.error("Error starting game:", error)
            callback({ success: false, error: "Failed to start game" })
        }
    })

    // Send chat message
    socket.on("chat:send", (data) => {
        try {
            const chatMessage = gameManager.addChatMessage(data.gameId, socket.id, data.message)

            if (chatMessage) {
                io.to(data.gameId).emit("chat:message", {
                    id: chatMessage.id,
                    playerId: chatMessage.playerId,
                    playerName: chatMessage.playerName,
                    message: chatMessage.message,
                    timestamp: chatMessage.timestamp.toISOString(),
                })
            }
        } catch (error) {
            console.error("Error sending chat message:", error)
        }
    })

    // Cast vote
    socket.on("vote:cast", (data, callback) => {
        try {
            const success = gameManager.castVote(data.gameId, socket.id, data.targetPlayerId)

            if (success) {
                callback({ success: true })
            } else {
                callback({ success: false, error: "Failed to cast vote" })
            }
        } catch (error) {
            console.error("Error casting vote:", error)
            callback({ success: false, error: "Failed to cast vote" })
        }
    })

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`)
        // Note: We could implement player removal here, but for now we keep them in the game
    })
})

// Health check endpoint
app.get("/health", (_req, res) => {
    res.json({ status: "ok" })
})

// Serve static frontend files
const frontendDistPath = join(__dirname, "../../frontend/dist")
app.use(express.static(frontendDistPath))

// SPA fallback: serve index.html for all non-API routes
app.get("*", (_req: Request, res: Response, _next: NextFunction) => {
    res.sendFile(join(frontendDistPath, "index.html"))
})

// Start server
httpServer.listen(port, () => {
    console.log(`🎮 Traitors AI server running on port ${port}`)
})
