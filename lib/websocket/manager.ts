import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { WebSocketMessage } from '../types/index'

export class SocketManager {
  private static instance: SocketManager
  private io: SocketIOServer | null = null
  private connections: Map<string, Set<string>> = new Map()

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager()
    }
    return SocketManager.instance
  }

  initialize(httpServer: HTTPServer): SocketIOServer {
    if (!this.io) {
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      })

      this.setupListeners()
    }
    return this.io
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO not initialized')
    }
    return this.io
  }

  private setupListeners(): void {
    if (!this.io) return

    this.io.on('connection', (socket: Socket) => {
      socket.on('join-game', (gameId: string) => {
        socket.join(`game:${gameId}`)
        if (!this.connections.has(gameId)) {
          this.connections.set(gameId, new Set())
        }
        this.connections.get(gameId)!.add(socket.id)
      })

      socket.on('leave-game', (gameId: string) => {
        socket.leave(`game:${gameId}`)
        const gameConnections = this.connections.get(gameId)
        if (gameConnections) {
          gameConnections.delete(socket.id)
          if (gameConnections.size === 0) {
            this.connections.delete(gameId)
          }
        }
      })

      socket.on('disconnect', () => {
        this.connections.forEach(gameConnections => {
          gameConnections.delete(socket.id)
        })
      })
    })
  }

  broadcast(gameId: string, event: string, message: unknown): void {
    if (!this.io) return
    this.io.to(`game:${gameId}`).emit(event, message)
  }

  broadcastToAll(event: string, message: unknown): void {
    if (!this.io) return
    this.io.emit(event, message)
  }

  sendToSocket(socketId: string, event: string, message: unknown): void {
    if (!this.io) return
    this.io.to(socketId).emit(event, message)
  }

  getConnectionCount(gameId: string): number {
    return this.connections.get(gameId)?.size || 0
  }
}

