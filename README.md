# 🦀 Crabstudio

A full-stack web platform for managing AI agents powered by [Clawdbot](https://github.com/moltbot/moltbot).

## What This Is

**Crabstudio** provides a complete web interface to:
- Create and manage AI agents with custom personalities
- Chat with agents in real-time with streaming responses
- View and edit agent configuration (SOUL.md, MEMORY.md)
- Monitor active sessions across messaging platforms

## Architecture

```
┌─────────────────────────────────────────┐
│         Clawdbot Gateway                │
│         (port 18789)                    │
│         Must be running separately      │
└──────────────┬──────────────────────────┘
               │
               │ WebSocket
               ▼
┌─────────────────────────────────────────┐
│      Crabstudio                         │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Frontend   │  │   Backend    │    │
│  │   (React)    │◀▶│   (Hono)     │    │
│  │   :5173      │  │   :3001      │    │
│  └──────────────┘  └──────┬───────┘    │
│                            │            │
│                            ▼            │
│                    ┌──────────────┐     │
│                    │ File System  │     │
│                    │ ~/.clawdbot/ │     │
│                    │ ~/crabstudio/│     │
│                    └──────────────┘     │
└─────────────────────────────────────────┘
```

## Prerequisites

1. **Clawdbot installed and Gateway running**
   ```bash
   # Install Clawdbot
   npm i -g moltbot
   
   # Start Gateway (in a separate terminal)
   moltbot gateway run
   ```

2. **Node.js 20+ and pnpm**
   ```bash
   node --version  # Should be 20+
   npm i -g pnpm
   ```

## Quick Start

```bash
# 1. Clone and install
cd crabstudio
pnpm install

# 2. Verify Gateway is running
curl http://127.0.0.1:18789/health

# 3. Start development servers
pnpm dev

# 4. Open browser
open http://localhost:5173
```

## Development

### Project Structure

```
crabstudio/
├── packages/
│   ├── web/          # React frontend (Vite + TanStack Router)
│   │   └── src/
│   │       ├── routes/       # Page components
│   │       ├── lib/          # API client, WebSocket
│   │       └── styles.css    # Global styles
│   └── api/          # Hono backend server
│       └── src/
│           ├── routes/       # API endpoints
│           └── services/     # Business logic
├── package.json      # Root workspace config
└── pnpm-workspace.yaml
```

### Running Locally

```bash
# Start both frontend and backend (recommended)
pnpm dev

# Or run separately
pnpm --filter web dev      # Frontend only (port 5173)
pnpm --filter api dev      # Backend only (port 3001)
```

### Environment Variables

Create `.env` in root (optional):

```bash
# Gateway connection
CLAWDBOT_URL=ws://127.0.0.1:18789
CLAWDBOT_API_TOKEN=your-token-here  # If Gateway has auth enabled

# API server
PORT=3001
```

## Tech Stack

### Frontend (`packages/web`)
- React 18 + TypeScript
- TanStack Router (routing)
- TanStack Query (data fetching)
- Tailwind CSS v4
- Lucide React (icons)

### Backend (`packages/api`)
- Hono (HTTP framework)
- WebSocket (real-time events)
- Zod (validation)
- File system access (agent workspaces)

## Features

### Dashboard
- Overview of all agents
- Quick actions (create agent, start chat)
- Activity statistics

### Agent Management
- Create agents with custom personalities
- Quick-start templates (assistant, coder, writer)
- Edit SOUL.md and MEMORY.md through UI
- Delete agents with workspace cleanup

### Chat Interface
- Real-time streaming responses
- Agent selection
- Markdown rendering
- Message history (per session)

## How It Works

1. **Backend** connects to Clawdbot Gateway via WebSocket
2. **Backend** reads/writes agent configs and workspaces:
   - `~/.clawdbot/moltbot.json` - Agent configuration
   - `~/crabstudio/workspaces/{agentId}/` - Agent workspaces
3. **Frontend** communicates with backend via REST API
4. **Frontend** receives real-time streaming via WebSocket

## Comparison with Crabwalk

| Feature | Crabwalk | Crabstudio |
|---------|----------|------------|
| Type | Monitor (read-only) | Full platform (read/write) |
| Purpose | Visualize activity | Manage agents & chat |
| File Access | None | Full (configs + workspaces) |
| Agent Creation | ❌ | ✅ |
| Chat Interface | ❌ | ✅ |
| Config Editing | ❌ | ✅ |

## Documentation

- [Goals & Specs](./crabstudio-goal-specs.md)
- [Architecture](./crabstudio-architecture.md)
- [Implementation Plan](./crabstudio-implementation-plan.md)

## License

MIT
# crabstudio
