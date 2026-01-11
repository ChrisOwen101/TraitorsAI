# Traitors AI

A social deduction game built with Next.js and Socket.IO.

## Overview

- **Framework**: Next.js 14 with TypeScript
- **Real-time Communication**: Socket.IO for real-time game updates
- **Styling**: Tailwind CSS
- **Data Storage**: In-memory (prepared for database integration)

## Project Structure

```
traitors-ai/
├── app/
│   ├── api/
│   │   ├── games/           # Game CRUD endpoints
│   │   ├── players/         # Player CRUD endpoints
│   │   └── ws/              # Socket.IO endpoint
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── lib/
│   ├── db/
│   │   └── storage.ts       # In-memory storage & DB stubs
│   ├── hooks/
│   │   └── useSocket.ts     # Socket.IO client hook
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   └── websocket/
│       ├── manager.ts       # Socket.IO connection manager
│       └── index.ts         # Socket initialization utilities
└── public/                  # Static assets
```

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## API Endpoints

### Games

- `GET /api/games` - List all games
- `POST /api/games` - Create a new game
- `GET /api/games/:gameId` - Get a specific game
- `PUT /api/games/:gameId` - Update a game
- `DELETE /api/games/:gameId` - Delete a game

### Players

- `POST /api/players` - Create a new player
- `GET /api/players/game/:gameId` - Get players for a game
- `GET /api/players/:playerId` - Get a specific player
- `PUT /api/players/:playerId` - Update a player
- `DELETE /api/players/:playerId` - Delete a player

### WebSockets

- `socket.emit('join-game', gameId)` - Join a game room
- `socket.emit('leave-game', gameId)` - Leave a game room
- Custom events broadcast to connected players

## Using Socket.IO in Components

```typescript
'use client'

import { useSocket } from '@/lib/hooks/useSocket'

export function GameComponent() {
  const { socket, isConnected, joinGame, on, emit } = useSocket()

  const handleJoinGame = (gameId: string) => {
    joinGame(gameId)
    
    on('game-update', (data) => {
      console.log('Game updated:', data)
    })
  }

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      {/* Component content */}
    </div>
  )
}
```

## Features Prepared

- ✅ In-memory data storage
- ✅ REST API endpoints
- ✅ Socket.IO for real-time communication
- ✅ Client-side Socket.IO hook
- ✅ TypeScript throughout
- ✅ Stubbed database functions (ready for real DB integration)
- ⏳ Game logic (coming soon)
- ⏳ AI players (coming soon)
