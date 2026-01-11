import { Server as HTTPServer } from 'http'
import { SocketManager } from './manager'

let socketManager: SocketManager | null = null

export function initializeSocket(httpServer: HTTPServer): SocketManager {
  if (!socketManager) {
    socketManager = SocketManager.getInstance()
    socketManager.initialize(httpServer)
  }
  return socketManager
}

export function getSocketManager(): SocketManager {
  if (!socketManager) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.')
  }
  return socketManager
}
