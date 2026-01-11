/**
 * Socket.io client service for real-time communication with the backend.
 */

import { io, Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@traitors-ai/shared"

/**
 * Manages the Socket.io connection and provides a typed interface for events.
 */
class SocketService {
    private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

    /**
     * Initialize the socket connection to the backend server.
     *
     * @param url - The backend server URL. Defaults to the current origin if not provided.
     */
    connect(url = window.location.origin): void {
        if (this.socket?.connected) {
            return
        }

        this.socket = io(url, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        })

        this.setupErrorHandlers()
    }

    /**
     * Disconnect from the backend server.
     */
    disconnect(): void {
        this.socket?.disconnect()
        this.socket = null
    }

    /**
     * Listen for events from the server.
     *
     * @example
     * socketService.on("game:created", (gameId) => {
     *   console.log("Game created:", gameId);
     * });
     */
    on<T extends keyof ServerToClientEvents>(event: T, listener: ServerToClientEvents[T]): void {
        this.socket?.on(event, listener as never)
    }

    /**
     * Stop listening for a specific event.
     */
    off<T extends keyof ServerToClientEvents>(event: T): void {
        this.socket?.off(event)
    }

    /**
     * Emit an event to the server.
     *
     * @example
     * socketService.emit("game:create", { playerName: "Alice" }, (response) => {
     *   console.log("Game created:", response);
     * });
     */
    emit<T extends keyof ClientToServerEvents>(event: T, ...args: Parameters<ClientToServerEvents[T]>): void {
        this.socket?.emit(event, ...args)
    }

    /**
     * Check if the socket is currently connected.
     */
    isConnected(): boolean {
        return this.socket?.connected ?? false
    }

    /**
     * Setup error handlers for socket events.
     */
    private setupErrorHandlers(): void {
        this.on("error", (data) => {
            console.error("Socket error:", data)
        })

        this.socket?.on("disconnect", (reason) => {
            console.warn("Socket disconnected:", reason)
        })

        this.socket?.on("connect_error", (error) => {
            console.error("Socket connection error:", error)
        })
    }
}

export const socketService = new SocketService()
