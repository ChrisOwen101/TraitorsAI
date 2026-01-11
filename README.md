# Traitors AI

A social deduction game built with React, Express, and Socket.IO in a monorepo structure.

## Overview

- **Architecture**: Monorepo with separate frontend and backend packages
- **Frontend**: React 18 with Vite and TypeScript
- **Backend**: Express with Socket.IO for real-time communication
- **Language**: TypeScript 5.x targeting ES2022
- **Data Storage**: In-memory (prepared for database integration)

## Monorepo Structure

```
traitors-ai/
├── packages/
│   ├── shared/                    # Shared types and utilities
│   │   ├── src/
│   │   │   ├── socket-events.ts  # Socket.IO event definitions
│   │   │   ├── game-types.ts     # Game domain types
│   │   │   └── index.ts          # Entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── frontend/                  # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/       # React components
│   │   │   ├── services/
│   │   │   │   └── socket-service.ts
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── backend/                   # Express + Socket.IO backend
│       ├── src/
│       │   ├── index.ts          # Server entry point
│       │   └── game-manager.ts   # Game state management
│       ├── package.json
│       └── tsconfig.json
│
├── tsconfig.json                 # Root TypeScript config with path aliases
├── package.json                  # Workspace configuration
├── .gitignore
└── .env.example
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

3. **Build for production**

   ```bash
   npm run build
   ```

   This builds the shared package, frontend (Vite), and backend (TypeScript) in the correct order. The frontend is served by the backend at the root path `/`.

4. **Run production server**

   ```bash
   npm start
   ```

   The backend serves both the API and the frontend at `http://localhost:3000`

## Development vs Production

**Development** (`npm run dev`):

- Frontend runs on Vite dev server at http://localhost:5173
- Backend runs on http://localhost:3000
- Socket.IO requests from frontend are proxied to backend via Vite config

**Production** (`npm run build && npm start`):

- Frontend is compiled to static assets and bundled into the backend
- Both are served from a single Express server at http://localhost:3000
- Frontend assets are served at `/`, API endpoints at `/api`, Socket.IO at `/socket.io`

## Available Scripts

### Root level (monorepo commands)

```bash
npm run dev              # Start all packages in development mode
npm run build            # Build frontend & backend (frontend -> backend assets)
npm run start            # Run production server
npm run type-check       # Type-check all packages
npm run lint             # Lint all packages
```

### Frontend (`packages/frontend`)

```bash
npm run dev              # Start Vite dev server on :5173
npm run build            # Build production bundle
npm run preview          # Preview production build
npm run type-check       # Type-check TypeScript
npm run lint             # Run ESLint
```

### Backend (`packages/backend`)

```bash
npm run dev              # Start server with hot reload via tsx
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled server
npm run type-check       # Type-check TypeScript
npm run lint             # Run ESLint
```

### Shared (`packages/shared`)

```bash
npm run build            # Compile shared package
npm run dev              # Watch mode compilation
npm run type-check       # Type-check TypeScript
```

## Socket.IO Events

### Server → Client

- `game:created` - Game has been created
- `game:joined` - Player joined a game
- `game:started` - Game has started
- `game:phase-changed` - Game phase has changed
- `player:joined` - Player joined the game
- `player:left` - Player left the game
- `error` - Error occurred

### Client → Server

- `game:create` - Create a new game
- `game:join` - Join an existing game
- `game:start` - Start a game
- `game:action` - Perform a game action (vote, nominate, etc.)

## Using Socket.IO Client

```typescript
import { socketService } from "@traitors-ai/frontend/src/services/socket-service";

// Connect to server
socketService.connect();

// Listen for events
socketService.on("game:created", (gameId) => {
  console.log("Game created:", gameId);
});

// Emit events
socketService.emit("game:create", { playerName: "Alice" }, (response) => {
  console.log("Response:", response);
});

// Disconnect
socketService.disconnect();
```

## TypeScript Configuration

The monorepo uses path aliases for convenient imports:

- `@shared/*` → `packages/shared/src/*`
- `@frontend/*` → `packages/frontend/src/*`
- `@backend/*` → `packages/backend/src/*`

All packages target **ES2022** with strict TypeScript checking enabled.

## Development Guidelines

See [.github/instructions/typescript-5-es2022.instructions.md](.github/instructions/typescript-5-es2022.instructions.md) for TypeScript development standards and best practices.

## Features

- ✅ Monorepo structure with npm workspaces
- ✅ Typed Socket.IO communication
- ✅ React + Vite frontend
- ✅ Express + Socket.IO backend
- ✅ Shared type definitions
- ✅ In-memory game state management
- ⏳ Game logic implementation
- ⏳ AI players
- ⏳ Database persistence
