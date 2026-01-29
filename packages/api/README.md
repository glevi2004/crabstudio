# Crabstudio API

Hono backend server for Crabstudio.

## Tech Stack

- Hono (fast HTTP framework)
- TypeScript
- WebSocket (real-time events)
- Zod (validation)

## Development

```bash
pnpm dev
```

Runs on http://localhost:3001

## API Endpoints

### Health

- `GET /health` - Server health check with Gateway status

### Agents

- `GET /api/agents` - List all agents
- `GET /api/agents/:agentId` - Get agent details (including SOUL.md, MEMORY.md)
- `POST /api/agents` - Create new agent
- `PATCH /api/agents/:agentId` - Update agent
- `PUT /api/agents/:agentId/memory` - Update agent memory
- `DELETE /api/agents/:agentId` - Delete agent

### Sessions

- `GET /api/sessions` - List sessions (supports `agentId`, `activeMinutes` params)

### Chat

- `POST /api/chat` - Send message to agent

### WebSocket

- `ws://localhost:3001/ws` - Real-time events (streaming responses, tool calls)

## Project Structure

```
src/
├── index.ts        # Server entry point
├── routes/         # API route handlers
│   ├── agents.ts
│   ├── sessions.ts
│   └── chat.ts
└── services/
    ├── agent-service.ts   # Agent CRUD operations
    └── gateway/           # Clawdbot Gateway client
        ├── client.ts
        ├── protocol.ts
        └── index.ts
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `CLAWDBOT_URL` - Gateway WebSocket URL (default: ws://127.0.0.1:18789)
- `CLAWDBOT_API_TOKEN` - Gateway authentication token (optional)
