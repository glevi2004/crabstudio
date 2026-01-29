# Crabstudio: Architecture Design

## Overview

This document describes the technical architecture for Crabstudio—a web wrapper around Clawdbot that provides a user-friendly interface for AI agent management.

---

## System Architecture

### High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USERS                                        │
│                    Browser / Mobile / API Client                          │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ HTTPS
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           CRABSTUDIO                                      │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                        FRONTEND (React)                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │   Dashboard │  │   Chat UI   │  │  Agent Mgmt │  │  Memory   │  │  │
│  │  │    Page     │  │    Page     │  │    Page     │  │  Viewer   │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                  │                                        │
│                                  │ REST + WebSocket                       │
│                                  ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                        BACKEND (Express/Hono)                       │  │
│  │                                                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │   Auth      │  │   Agents    │  │   Chat      │  │  Memory   │  │  │
│  │  │   Service   │  │   Service   │  │   Service   │  │  Service  │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │  │
│  │         │                │                │               │        │  │
│  │         ▼                │                │               ▼        │  │
│  │  ┌─────────────┐         │                │        ┌───────────┐   │  │
│  │  │ PostgreSQL  │         │                │        │  Memory   │   │  │
│  │  │  Database   │         │                │        │  Backend  │   │  │
│  │  └─────────────┘         │                │        │ (External)│   │  │
│  │                          │                │        └───────────┘   │  │
│  │                          ▼                ▼                        │  │
│  │                   ┌─────────────────────────────┐                  │  │
│  │                   │    Gateway Client           │                  │  │
│  │                   │    (WebSocket Connection)   │                  │  │
│  │                   └──────────────┬──────────────┘                  │  │
│  │                                  │                                 │  │
│  └──────────────────────────────────┼─────────────────────────────────┘  │
│                                     │                                     │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │
                                      │ WebSocket (ws://127.0.0.1:18789)
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         CLAWDBOT GATEWAY                                  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                     Gateway Server (port 18789)                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │   Channel   │  │    Node     │  │   Session   │  │  Config   │  │  │
│  │  │   Manager   │  │  Registry   │  │   Manager   │  │  Loader   │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │     Agent 1      │  │     Agent 2      │  │     Agent N      │        │
│  │  ┌────────────┐  │  │  ┌────────────┐  │  │  ┌────────────┐  │        │
│  │  │  SOUL.md   │  │  │  │  SOUL.md   │  │  │  │  SOUL.md   │  │        │
│  │  │  MEMORY.md │  │  │  │  MEMORY.md │  │  │  │  MEMORY.md │  │        │
│  │  │  memory/   │  │  │  │  memory/   │  │  │  │  memory/   │  │        │
│  │  └────────────┘  │  │  └────────────┘  │  │  └────────────┘  │        │
│  │    ~/clawd-agent1│  │    ~/clawd-agent2│  │    ~/clawd-agentN│        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                           │
│  Config: ~/.clawdbot/moltbot.json                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (React)

**Purpose**: User interface for all platform features

**Technology Stack**:
- React 18+ with TypeScript
- TanStack Router (file-based routing)
- TanStack Query (server state management)
- Tailwind CSS (styling)
- Shadcn/UI (component library)

**Key Components**:
```
src/
├── routes/
│   ├── index.tsx           # Dashboard
│   ├── agents/
│   │   ├── index.tsx       # Agent list
│   │   ├── [id].tsx        # Agent detail/edit
│   │   └── new.tsx         # Create agent
│   ├── chat/
│   │   ├── index.tsx       # Session list
│   │   └── [sessionKey].tsx # Chat view
│   └── memory/
│       └── index.tsx       # Memory viewer
├── components/
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── StreamingMessage.tsx
│   └── agents/
│       ├── AgentCard.tsx
│       └── AgentForm.tsx
└── lib/
    ├── api.ts              # REST API client
    └── websocket.ts        # Real-time events
```

### 2. Backend (Express/Hono)

**Purpose**: API server that bridges frontend and Clawdbot

**Technology Stack**:
- Hono or Express (HTTP framework)
- PostgreSQL (database)
- Drizzle ORM (database access)
- WebSocket (real-time events)

**API Structure**:
```
src/
├── routes/
│   ├── auth.ts             # POST /auth/login, /auth/signup
│   ├── agents.ts           # GET/POST/PATCH/DELETE /agents
│   ├── sessions.ts         # GET/DELETE /sessions
│   ├── chat.ts             # POST /chat, WebSocket /chat/stream
│   └── memory.ts           # GET/POST /memory
├── services/
│   ├── gateway-client.ts   # Clawdbot Gateway WebSocket client
│   ├── agent-service.ts    # Agent CRUD (config file manipulation)
│   ├── session-service.ts  # Session management
│   └── memory-service.ts   # Memory backend integration
├── db/
│   ├── schema.ts           # Drizzle schema
│   └── migrations/         # Database migrations
└── middleware/
    ├── auth.ts             # JWT validation
    └── error-handler.ts    # Error handling
```

### 3. Gateway Client

**Purpose**: Communicate with Clawdbot Gateway via WebSocket

**Based on**: Crabwalk's `ClawdbotClient` implementation

```typescript
// services/gateway-client.ts

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventListeners: EventCallback[] = [];

  constructor(
    private url: string = 'ws://127.0.0.1:18789',
    private token?: string
  ) {}

  // Connect with challenge-response auth
  async connect(): Promise<HelloOk> { ... }

  // Send request and wait for response
  async request<T>(method: string, params?: unknown): Promise<T> { ... }

  // Subscribe to real-time events
  onEvent(callback: EventCallback): () => void { ... }

  // High-level methods
  async sendMessage(agentId: string, message: string, sessionKey?: string) {
    return this.request('agent', {
      message,
      agentId,
      sessionKey,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async listSessions(params?: { agentId?: string }) {
    return this.request('sessions.list', params);
  }

  async listAgents() {
    return this.request('agents.list');
  }
}
```

### 4. Database Schema

**Purpose**: Store Crabstudio-specific data (users, spaces, agent metadata)

```sql
-- Users (Phase 3: Multi-tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Spaces (Phase 3: Multi-tenant)
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, name)
);

-- Agents (metadata only - actual config in Clawdbot)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  clawdbot_agent_id VARCHAR(64) NOT NULL,  -- References Clawdbot config
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clawdbot_agent_id)
);

-- Agent settings (Crabstudio-specific)
CREATE TABLE agent_settings (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE PRIMARY KEY,
  memory_enabled BOOLEAN DEFAULT true,
  memory_extraction BOOLEAN DEFAULT true,
  context_injection BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'
);
```

---

## Architecture Options

### Option A: Thin Wrapper (Recommended for MVP)

**Approach**: Crabstudio backend is a thin proxy to Clawdbot

```
Frontend ──► Crabstudio API ──► Clawdbot Gateway
                 │
                 └──► Config Files (for agent CRUD)
```

**Pros**:
- Minimal code to write
- Leverages all Clawdbot features
- Fast to implement

**Cons**:
- Limited customization
- Dependent on Clawdbot's API

**When to use**: MVP, single-user, quick iteration

### Option B: Enhanced Wrapper (Recommended for Production)

**Approach**: Crabstudio adds memory backend and context injection

```
Frontend ──► Crabstudio API ──► Memory Backend
                 │                │
                 │                ▼
                 │         Context Builder
                 │                │
                 └────────────────┼──► Clawdbot Gateway
                                  │
                              extraSystemPrompt
```

**Pros**:
- Rich memory features
- User profiles
- Better personalization

**Cons**:
- More complexity
- Additional service dependency

**When to use**: Multi-user, production

### Option C: Full Platform (Future)

**Approach**: Crabstudio handles most logic, Clawdbot only for LLM execution

```
Frontend ──► Crabstudio API ──► Custom Session Manager
                 │                │
                 │                ▼
                 │          Custom Memory
                 │                │
                 │                ▼
                 │          Custom Tools
                 │                │
                 └────────────────┼──► Clawdbot Gateway (LLM only)
```

**Pros**:
- Full control
- Custom features
- Independent scaling

**Cons**:
- Significant development effort
- Duplicates Clawdbot functionality

**When to use**: Enterprise, specialized requirements

---

## Multi-Tenant Architecture

### User Isolation Strategy

```
/platform/
├── workspaces/
│   ├── user_abc123/
│   │   ├── agent_assistant/
│   │   │   ├── SOUL.md
│   │   │   ├── MEMORY.md
│   │   │   └── memory/
│   │   └── agent_researcher/
│   │       └── ...
│   └── user_def456/
│       └── ...
```

### Agent ID Convention

```
Format: {userId}_{spaceName}_{agentName}
Example: abc123_default_assistant

Clawdbot Config:
{
  "agents": {
    "list": [
      { "id": "abc123_default_assistant", "workspace": "/platform/workspaces/user_abc123/agent_assistant" },
      { "id": "def456_default_assistant", "workspace": "/platform/workspaces/user_def456/agent_assistant" }
    ]
  }
}
```

### Memory Isolation

```typescript
// Memory backend containerTag pattern
const containerTag = `user_${userId}_space_${spaceId}`;

// All memory operations scoped by containerTag
await memoryBackend.save({
  containerTag,
  content: "...",
});

await memoryBackend.recall({
  containerTag,
  query: "...",
});
```

---

## Data Flow

### Chat Flow (Detailed)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CHAT REQUEST FLOW                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. User sends message                                                    │
│     ─────────────────────────────────────────────────────────────────    │
│     POST /api/chat { message: "Hello", agentId: "assistant" }            │
│                                                                           │
│  2. Crabstudio backend receives request                                     │
│     ─────────────────────────────────────────────────────────────────    │
│     • Validate user auth                                                  │
│     • Resolve full agent ID (userId_spaceName_agentId)                   │
│     • Build session key                                                   │
│                                                                           │
│  3. [Optional] Memory recall (Phase 2+)                                   │
│     ─────────────────────────────────────────────────────────────────    │
│     • Query memory backend for relevant context                          │
│     • Get user profile facts                                             │
│     • Build extraSystemPrompt with context                               │
│                                                                           │
│  4. Forward to Clawdbot Gateway                                          │
│     ─────────────────────────────────────────────────────────────────    │
│     gateway.request('agent', {                                           │
│       message: "Hello",                                                   │
│       agentId: "abc123_default_assistant",                               │
│       sessionKey: "agent:abc123_default_assistant:webchat:dm:abc123",    │
│       extraSystemPrompt: memoryContext,                                  │
│       idempotencyKey: requestId,                                         │
│     })                                                                    │
│                                                                           │
│  5. Stream response events                                               │
│     ─────────────────────────────────────────────────────────────────    │
│     Gateway broadcasts 'agent' events with:                              │
│     • stream: "assistant", data: { text: "Hi there!" }                   │
│     • stream: "lifecycle", data: { phase: "end" }                        │
│                                                                           │
│  6. Forward to frontend via WebSocket                                    │
│     ─────────────────────────────────────────────────────────────────    │
│     Crabstudio WebSocket emits events to connected client                  │
│                                                                           │
│  7. [Optional] Memory extraction (Phase 2+)                              │
│     ─────────────────────────────────────────────────────────────────    │
│     • Parse agent response for learnable facts                           │
│     • Save new memories to memory backend                                │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Agent Creation Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         AGENT CREATION FLOW                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. User submits agent form                                              │
│     ─────────────────────────────────────────────────────────────────    │
│     POST /api/agents {                                                    │
│       name: "Research Assistant",                                        │
│       personality: "You are a helpful research assistant...",            │
│       model: "anthropic/claude-sonnet-4-20250514"                                 │
│     }                                                                     │
│                                                                           │
│  2. Crabstudio backend processes request                                   │
│     ─────────────────────────────────────────────────────────────────    │
│     • Generate agent ID: abc123_default_research-assistant               │
│     • Generate workspace path: /platform/workspaces/user_abc123/...      │
│                                                                           │
│  3. Create workspace directory                                           │
│     ─────────────────────────────────────────────────────────────────    │
│     mkdir -p /platform/workspaces/user_abc123/agent_research-assistant   │
│     Write SOUL.md with personality content                               │
│     Write empty MEMORY.md                                                │
│     Create memory/ directory                                             │
│                                                                           │
│  4. Update Clawdbot config                                               │
│     ─────────────────────────────────────────────────────────────────    │
│     Load ~/.clawdbot/moltbot.json                                        │
│     Add to agents.list:                                                  │
│     {                                                                     │
│       "id": "abc123_default_research-assistant",                         │
│       "workspace": "/platform/workspaces/user_abc123/...",               │
│       "model": "anthropic/claude-sonnet-4-20250514"                               │
│     }                                                                     │
│     Write config file (hot-reload, no restart needed)                    │
│                                                                           │
│  5. Store metadata in PostgreSQL                                         │
│     ─────────────────────────────────────────────────────────────────    │
│     INSERT INTO agents (clawdbot_agent_id, display_name, ...)            │
│                                                                           │
│  6. Return success to frontend                                           │
│     ─────────────────────────────────────────────────────────────────    │
│     { id: "...", name: "Research Assistant", status: "ready" }           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Memory Architecture Options

### Option M1: Clawdbot Memory Only

**Use existing MEMORY.md + memory_search**

```
Agent reads/writes ──► MEMORY.md + memory/*.md
                              │
                              ▼
                    Clawdbot Memory Index (SQLite + vectors)
```

**Pros**: Zero additional infrastructure
**Cons**: No cross-session semantic memory, no user profiles

### Option M2: Hybrid (Recommended)

**Clawdbot for short-term, Memory Backend for long-term**

```
Agent ──► MEMORY.md (recent, agent-controlled)
              │
              ▼
Crabstudio ──► Memory Backend (long-term, semantic)
              │
              ├── User Profile (facts, preferences)
              ├── Episodic Memory (conversation learnings)
              └── Procedural Memory (how-to knowledge)
```

**Pros**: Best of both worlds
**Cons**: Two systems to maintain

### Option M3: Full Memory Backend

**Replace Clawdbot memory entirely**

```
Crabstudio ──► Memory Backend (everything)
              │
              └──► Injected via extraSystemPrompt
```

**Pros**: Full control, consistent API
**Cons**: Loses Clawdbot's built-in memory features

---

## Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend Framework | React + TypeScript | Industry standard, great ecosystem |
| Frontend Router | TanStack Router | Type-safe, file-based |
| UI Components | Shadcn/UI | Customizable, accessible |
| Backend Framework | Hono | Fast, lightweight, edge-compatible |
| Database | PostgreSQL | Reliable, good JSON support |
| ORM | Drizzle | Type-safe, good DX |
| Auth | JWT + bcrypt | Simple, stateless |
| Real-time | WebSocket | Native browser support |
| Memory Backend | Supermemory | Good API, reasonable pricing |

---

## Security Considerations

### Authentication
- JWT tokens with short expiry (15min access, 7d refresh)
- bcrypt for password hashing (cost factor 12)
- Rate limiting on auth endpoints

### Authorization
- All API endpoints require valid JWT
- Users can only access their own spaces/agents
- Agent IDs validated against user ownership

### Data Isolation
- Workspace directories permission-restricted
- Database queries always filtered by user_id
- Memory backend containerTag enforces isolation

### Gateway Security
- Gateway token stored securely (env var)
- Crabstudio backend is only Gateway client
- Users never connect to Gateway directly
