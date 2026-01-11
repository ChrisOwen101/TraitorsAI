# Traitors AI - AI Coding Agent Instructions

## Architecture Overview

This is a **real-time multiplayer social deduction game** using a monorepo structure with three packages:

- **`packages/shared`**: Source of truth for all types (game models, Socket.IO events). Both frontend and backend depend on this.
- **`packages/frontend`**: React 18 + Vite client that connects via Socket.IO
- **`packages/backend`**: Express + Socket.IO server with in-memory game state management

**Critical pattern**: All cross-boundary communication (client ↔ server) uses strictly typed Socket.IO events defined in `packages/shared/src/socket-events.ts`. These use discriminated unions and callback-based response patterns for type safety.

## Data Flow & Service Boundaries

```
Frontend (React) → SocketService → Socket.IO → Backend Server → GameManager (in-memory store)
```

1. **Frontend** emits typed events via `socket-service.ts` singleton
2. **Backend** `index.ts` handles Socket.IO events, delegates business logic to `GameManager`
3. **GameManager** (`game-manager.ts`) maintains the `Map<string, Game>` state (no database yet)
4. Server broadcasts state changes to rooms using `io.to(gameId).emit(...)`

## Development Workflows

**Start development** (runs frontend + backend concurrently):

```bash
npm run dev
```

- Frontend: http://localhost:5173 (Vite dev server with HMR)
- Backend: http://localhost:3000 (Socket.IO server)
- Vite proxies `/socket.io` requests to backend (see `vite.config.ts`)

**Production build & run**:

```bash
npm run build  # Builds shared → frontend → backend in order
npm start      # Serves both frontend static files and API from port 3000
```

**Type checking across all packages**:

```bash
npm run type-check
```

## Project-Specific Conventions

### Socket.IO Event Patterns

- All events use **callbacks for responses** (not acknowledgments):
  ```typescript
  socket.on("game:create", (data, callback) => {
    callback({ success: true, gameId: game.id });
  });
  ```
- Events follow naming: `resource:action` (e.g., `game:join`, `player:left`)
- Server events broadcast to rooms: `io.to(gameId).emit("event", data)`

### Type Safety Across Network

- **Never define Socket.IO event types in frontend or backend**. Always import from `@traitors-ai/shared`.
- Server/client sockets are typed:

  ```typescript
  // Backend
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {...})

  // Frontend
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url)
  ```

### Module System

- Uses **ES modules** (`"type": "module"` in package.json)
- All imports must include `.js` extensions even for TypeScript files:
  ```typescript
  import { GamePhase } from "./socket-events.js";
  ```
- Shared package imports use workspace alias: `import type { Game } from "@traitors-ai/shared"`

### Code Organization

- **Services are singletons**: Export instance directly (e.g., `export const socketService = new SocketService()`)
- **Game logic lives in GameManager**: Backend `index.ts` is thin - just Socket.IO wiring
- **Enums over string unions**: Use `enum GamePhase` not `type GamePhase = "lobby" | ...`

## Key Files Reference

- [`packages/shared/src/socket-events.ts`](packages/shared/src/socket-events.ts) - All Socket.IO event contracts
- [`packages/backend/src/game-manager.ts`](packages/backend/src/game-manager.ts) - Game state & business logic
- [`packages/frontend/src/services/socket-service.ts`](packages/frontend/src/services/socket-service.ts) - Typed Socket.IO client wrapper
- [`vite.config.ts`](packages/frontend/vite.config.ts) - WebSocket proxy config for dev mode

## Common Pitfalls

- **Don't forget `.js` extensions** in imports (ES module requirement)
- **Don't mutate shared types** - they're the contract between frontend and backend
- **Room management**: Players must `socket.join(gameId)` before receiving game-specific broadcasts
- **Dev vs Prod**: In dev, frontend runs on `:5173` and proxies Socket.IO; in prod, everything's on `:3000`
