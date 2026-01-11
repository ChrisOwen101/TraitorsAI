import { NextApiRequest, NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { SocketManager } from '@/lib/websocket/manager'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    const socketManager = SocketManager.getInstance()
    res.socket.server.io = socketManager.initialize(res.socket.server as any)
  }

  res.status(200).json({ success: true })
}

