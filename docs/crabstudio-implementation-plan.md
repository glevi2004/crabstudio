# Crabstudio: Implementation Plan

## Overview

This document outlines the phased implementation plan for Crabstudio, starting with a single-user MVP and progressing to a multi-tenant production system.

---

## Phase 1: Single-User MVP (Week 1)

**Goal**: Working dashboard for personal use to manage and chat with agents

**Deliverable**: Web app running locally that I can use to manage my own Clawdbot agents

### Week 1, Day 1-2: Project Setup & Gateway Client

#### Tasks
- [ ] Initialize project structure (monorepo with pnpm workspaces)
- [ ] Set up frontend (React + Vite + TanStack Router)
- [ ] Set up backend (Hono + TypeScript)
- [ ] Copy and adapt Gateway client from Crabwalk
- [ ] Test Gateway connection and basic RPC calls

#### Code to Write

**Project Structure**:
```
crabstudio/
├── packages/
│   ├── web/                 # React frontend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   └── api/                 # Hono backend
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   └── index.ts
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

**Gateway Client** (`packages/api/src/services/gateway-client.ts`):
```typescript
import WebSocket from 'ws';

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private eventListeners: ((event: any) => void)[] = [];
  private connected = false;
  private requestId = 0;

  constructor(
    private url: string = 'ws://127.0.0.1:18789',
    private token?: string
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => {
        // Wait for challenge-response if token provided
        if (!this.token) {
          this.connected = true;
          resolve();
        }
      });

      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg, resolve, reject);
      });

      this.ws.on('error', reject);
    });
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || !this.connected) throw new Error('Not connected');
    
    const id = `req-${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ type: 'req', id, method, params }));
      
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  onEvent(callback: (event: any) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      const idx = this.eventListeners.indexOf(callback);
      if (idx >= 0) this.eventListeners.splice(idx, 1);
    };
  }

  // Convenience methods
  async listAgents() {
    return this.request<{ agents: any[] }>('agents.list');
  }

  async sendMessage(params: {
    message: string;
    agentId?: string;
    sessionKey?: string;
    extraSystemPrompt?: string;
  }) {
    return this.request('agent', {
      ...params,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async listSessions(params?: { agentId?: string; activeMinutes?: number }) {
    return this.request<{ sessions: any[] }>('sessions.list', params);
  }
}
```

### Week 1, Day 3-4: Agent Management UI

#### Tasks
- [ ] Create agent list page (display all agents from Gateway)
- [ ] Create agent detail page (show SOUL.md, MEMORY.md)
- [ ] Create agent form (create new agent)
- [ ] Implement agent CRUD via config file manipulation

#### API Endpoints

```typescript
// packages/api/src/routes/agents.ts

import { Hono } from 'hono';
import { gateway } from '../services/gateway';
import { agentService } from '../services/agent-service';

const app = new Hono();

// List all agents
app.get('/', async (c) => {
  const result = await gateway.listAgents();
  return c.json(result);
});

// Get agent detail (SOUL.md, MEMORY.md content)
app.get('/:agentId', async (c) => {
  const { agentId } = c.req.param();
  const detail = await agentService.getAgentDetail(agentId);
  return c.json(detail);
});

// Create agent
app.post('/', async (c) => {
  const body = await c.req.json();
  const agent = await agentService.createAgent({
    name: body.name,
    personality: body.personality,
    model: body.model,
  });
  return c.json(agent, 201);
});

// Update agent (SOUL.md)
app.patch('/:agentId', async (c) => {
  const { agentId } = c.req.param();
  const body = await c.req.json();
  const agent = await agentService.updateAgent(agentId, body);
  return c.json(agent);
});

// Delete agent
app.delete('/:agentId', async (c) => {
  const { agentId } = c.req.param();
  await agentService.deleteAgent(agentId);
  return c.json({ deleted: true });
});

export default app;
```

#### Agent Service

```typescript
// packages/api/src/services/agent-service.ts

import fs from 'fs/promises';
import path from 'path';

const CLAWDBOT_CONFIG_PATH = path.join(process.env.HOME!, '.clawdbot', 'moltbot.json');
const WORKSPACES_BASE = path.join(process.env.HOME!, 'crabstudio', 'workspaces');

export const agentService = {
  async createAgent(params: { name: string; personality: string; model?: string }) {
    const agentId = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const workspacePath = path.join(WORKSPACES_BASE, agentId);
    
    // 1. Create workspace directory
    await fs.mkdir(workspacePath, { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'memory'), { recursive: true });
    
    // 2. Write SOUL.md
    await fs.writeFile(
      path.join(workspacePath, 'SOUL.md'),
      `# ${params.name}\n\n${params.personality}`
    );
    
    // 3. Write empty MEMORY.md
    await fs.writeFile(path.join(workspacePath, 'MEMORY.md'), '# Memory\n');
    
    // 4. Update Clawdbot config
    const config = JSON.parse(await fs.readFile(CLAWDBOT_CONFIG_PATH, 'utf-8'));
    config.agents = config.agents || { list: [] };
    config.agents.list = config.agents.list || [];
    
    config.agents.list.push({
      id: agentId,
      name: params.name,
      workspace: workspacePath,
      ...(params.model && { model: params.model }),
    });
    
    await fs.writeFile(CLAWDBOT_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    return { id: agentId, name: params.name, workspace: workspacePath };
  },

  async getAgentDetail(agentId: string) {
    const config = JSON.parse(await fs.readFile(CLAWDBOT_CONFIG_PATH, 'utf-8'));
    const agent = config.agents?.list?.find((a: any) => a.id === agentId);
    if (!agent) throw new Error('Agent not found');
    
    const soulPath = path.join(agent.workspace, 'SOUL.md');
    const memoryPath = path.join(agent.workspace, 'MEMORY.md');
    
    const [soul, memory] = await Promise.all([
      fs.readFile(soulPath, 'utf-8').catch(() => ''),
      fs.readFile(memoryPath, 'utf-8').catch(() => ''),
    ]);
    
    return { ...agent, soul, memory };
  },

  async updateAgent(agentId: string, updates: { personality?: string }) {
    const detail = await this.getAgentDetail(agentId);
    
    if (updates.personality) {
      await fs.writeFile(
        path.join(detail.workspace, 'SOUL.md'),
        `# ${detail.name}\n\n${updates.personality}`
      );
    }
    
    return this.getAgentDetail(agentId);
  },

  async deleteAgent(agentId: string) {
    const config = JSON.parse(await fs.readFile(CLAWDBOT_CONFIG_PATH, 'utf-8'));
    const agentIndex = config.agents?.list?.findIndex((a: any) => a.id === agentId);
    
    if (agentIndex === -1) throw new Error('Agent not found');
    
    const agent = config.agents.list[agentIndex];
    
    // Remove from config
    config.agents.list.splice(agentIndex, 1);
    await fs.writeFile(CLAWDBOT_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    // Remove workspace (optional - could archive instead)
    await fs.rm(agent.workspace, { recursive: true, force: true });
  },
};
```

### Week 1, Day 5-6: Chat Interface

#### Tasks
- [ ] Create session list component
- [ ] Create chat view with message history
- [ ] Implement message sending
- [ ] Implement streaming response display
- [ ] Add WebSocket connection for real-time events

#### Chat Components

```tsx
// packages/web/src/routes/chat/[sessionKey].tsx

import { useState, useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';

export default function ChatPage() {
  const { sessionKey } = useParams({ from: '/chat/$sessionKey' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to Crabstudio WebSocket for events
    const ws = new WebSocket(`ws://localhost:3001/chat/stream?sessionKey=${sessionKey}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'delta') {
        // Streaming text update
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, content: data.text }];
          }
          return prev;
        });
      } else if (data.type === 'done') {
        setStreaming(false);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, streaming: false }];
          }
          return prev;
        });
      }
    };
    
    wsRef.current = ws;
    return () => ws.close();
  }, [sessionKey]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setStreaming(true);
    
    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);
    
    // Send via REST (WebSocket will receive events)
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, sessionKey }),
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
      </div>
      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2"
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={streaming}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Week 1, Day 7: Polish & Testing

#### Tasks
- [ ] Fix bugs from testing
- [ ] Add loading states and error handling
- [ ] Improve UI styling
- [ ] Test all flows end-to-end
- [ ] Document setup instructions

#### Success Criteria for Week 1
- ✅ Can see list of agents on dashboard
- ✅ Can create a new agent with name and personality
- ✅ Can edit agent's SOUL.md from UI
- ✅ Can view agent's MEMORY.md
- ✅ Can start a chat session with an agent
- ✅ Can see streaming responses in real-time
- ✅ Can switch between chat sessions

---

## Phase 2: Enhanced Memory (Week 2-3)

**Goal**: Add semantic memory that provides better context to agents

### Week 2: Memory Backend Integration

#### Tasks
- [ ] Set up Supermemory account and API
- [ ] Create memory service in backend
- [ ] Implement memory recall before agent calls
- [ ] Implement memory extraction after responses
- [ ] Add context injection via `extraSystemPrompt`

#### Memory Service

```typescript
// packages/api/src/services/memory-service.ts

import { Supermemory } from 'supermemory';

const memory = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

export const memoryService = {
  async recall(query: string, containerTag: string, limit = 5) {
    const results = await memory.recall({
      query,
      containerTag,
      limit,
    });
    return results.memories;
  },

  async save(content: string, containerTag: string, metadata?: Record<string, any>) {
    await memory.save({
      content,
      containerTag,
      metadata,
    });
  },

  async forget(query: string, containerTag: string) {
    await memory.forget({
      query,
      containerTag,
    });
  },

  buildContextPrompt(memories: any[]): string {
    if (!memories.length) return '';
    
    return `
## Relevant Context from Previous Conversations
${memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}

Use this context to provide more personalized and informed responses.
`.trim();
  },

  extractLearnings(conversation: { user: string; assistant: string }): string[] {
    // Simple extraction - can be enhanced with LLM
    const learnings: string[] = [];
    
    // Extract user preferences mentioned
    const prefMatches = conversation.user.match(/I (prefer|like|want|need|always|never) .+/gi);
    if (prefMatches) learnings.push(...prefMatches);
    
    // Extract facts user shared
    const factMatches = conversation.user.match(/My (name|job|company|location) is .+/gi);
    if (factMatches) learnings.push(...factMatches);
    
    return learnings;
  },
};
```

#### Enhanced Chat Flow

```typescript
// packages/api/src/routes/chat.ts

app.post('/', async (c) => {
  const { message, sessionKey, agentId } = await c.req.json();
  const containerTag = `agent_${agentId}`;
  
  // 1. Recall relevant memories
  const memories = await memoryService.recall(message, containerTag);
  const contextPrompt = memoryService.buildContextPrompt(memories);
  
  // 2. Send to Gateway with context
  const result = await gateway.sendMessage({
    message,
    agentId,
    sessionKey,
    extraSystemPrompt: contextPrompt,
  });
  
  // 3. Extract and save learnings (async, don't block response)
  extractAndSaveLearnings(message, result.response, containerTag).catch(console.error);
  
  return c.json(result);
});

async function extractAndSaveLearnings(
  userMessage: string,
  assistantResponse: string,
  containerTag: string
) {
  const learnings = memoryService.extractLearnings({
    user: userMessage,
    assistant: assistantResponse,
  });
  
  for (const learning of learnings) {
    await memoryService.save(learning, containerTag, {
      source: 'conversation',
      extractedAt: Date.now(),
    });
  }
}
```

### Week 3: Memory UI & User Profiles

#### Tasks
- [ ] Create memory viewer page
- [ ] Add memory search functionality
- [ ] Create user profile system
- [ ] Profile editing UI
- [ ] Profile injection into context

#### Memory Viewer

```tsx
// packages/web/src/routes/memory/index.tsx

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState('');

  const searchMemories = async () => {
    const results = await api.post('/memory/search', { query: search });
    setMemories(results.memories);
  };

  const deleteMemory = async (id: string) => {
    await api.delete(`/memory/${id}`);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Memory</h1>
      
      <div className="flex gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          className="flex-1 border rounded px-4 py-2"
        />
        <button onClick={searchMemories} className="px-4 py-2 bg-blue-500 text-white rounded">
          Search
        </button>
      </div>
      
      <div className="space-y-4">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} onDelete={deleteMemory} />
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 3: Multi-Tenant (Week 4-6)

**Goal**: Support multiple users with isolated workspaces

### Week 4: Authentication

#### Tasks
- [ ] Set up PostgreSQL database
- [ ] Create users table
- [ ] Implement signup/login endpoints
- [ ] Add JWT authentication
- [ ] Create auth middleware
- [ ] Add auth to frontend

#### Database Schema

```typescript
// packages/api/src/db/schema.ts

import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const spaces = pgTable('spaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'cascade' }).notNull(),
  clawdbotAgentId: varchar('clawdbot_agent_id', { length: 64 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### Auth Endpoints

```typescript
// packages/api/src/routes/auth.ts

import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';

const app = new Hono();

app.post('/signup', async (c) => {
  const { email, password, name } = await c.req.json();
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    name,
  }).returning();
  
  // Create default space
  await db.insert(spaces).values({
    ownerId: user.id,
    name: 'default',
  });
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  
  return c.json({ user: { id: user.id, email, name }, token });
});

app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  
  return c.json({ user: { id: user.id, email: user.email, name: user.name }, token });
});

export default app;
```

### Week 5: User Isolation

#### Tasks
- [ ] Update agent service for user isolation
- [ ] Update memory service for user isolation
- [ ] Add space management
- [ ] Update frontend for auth flow
- [ ] Test isolation between users

#### Multi-Tenant Agent Service

```typescript
// packages/api/src/services/agent-service.ts (updated)

export const agentService = {
  async createAgent(userId: string, spaceId: string, params: { name: string; personality: string }) {
    // Generate unique agent ID with user/space prefix
    const agentId = `${userId}_${spaceId}_${params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const workspacePath = path.join(WORKSPACES_BASE, userId, spaceId, agentId);
    
    // Create workspace (isolated by user/space path)
    await fs.mkdir(workspacePath, { recursive: true });
    // ... rest of creation logic
    
    // Store in database
    await db.insert(agents).values({
      spaceId,
      clawdbotAgentId: agentId,
      displayName: params.name,
    });
    
    return { id: agentId, name: params.name };
  },
  
  async listAgents(userId: string, spaceId: string) {
    // Only return agents owned by user in this space
    return db.query.agents.findMany({
      where: eq(agents.spaceId, spaceId),
    });
  },
};
```

### Week 6: Polish Multi-Tenant

#### Tasks
- [ ] Space management UI
- [ ] User settings page
- [ ] Invite collaborators (optional)
- [ ] Email verification (optional)
- [ ] Password reset flow

---

## Phase 4: Scale & Production (Week 7-8)

**Goal**: Production-ready deployment

### Week 7: Security & Performance

#### Tasks
- [ ] Add rate limiting
- [ ] Add request validation (Zod)
- [ ] Add audit logging
- [ ] Optimize database queries
- [ ] Add caching where appropriate
- [ ] Security audit

### Week 8: Deployment

#### Tasks
- [ ] Set up production infrastructure
- [ ] Configure CI/CD pipeline
- [ ] Set up monitoring (errors, performance)
- [ ] Write deployment documentation
- [ ] Load testing
- [ ] Launch!

#### Deployment Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (CDN + WAF)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  Static Assets  │           │   API Server    │
    │   (Vercel/CF)   │           │   (Fly.io)      │
    └─────────────────┘           └────────┬────────┘
                                           │
                      ┌────────────────────┼────────────────────┐
                      │                    │                    │
                      ▼                    ▼                    ▼
            ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
            │   PostgreSQL    │  │    Gateway      │  │    Memory       │
            │   (Neon/Supabase│  │   (Self-hosted) │  │   (Supermemory) │
            └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Summary Timeline

| Week | Phase | Focus | Deliverable |
|------|-------|-------|-------------|
| 1 | MVP | Single-user dashboard | Working local app |
| 2 | Memory | Backend integration | Context injection working |
| 3 | Memory | UI + Profiles | Full memory management |
| 4 | Multi-tenant | Authentication | User signup/login |
| 5 | Multi-tenant | Isolation | Per-user agents & memory |
| 6 | Multi-tenant | Polish | Complete multi-tenant |
| 7 | Scale | Security | Hardened for production |
| 8 | Scale | Deploy | Live in production |

---

## Getting Started (Week 1 Day 1)

### Prerequisites
- Clawdbot installed and Gateway running (`moltbot gateway run`)
- Node.js 20+
- pnpm

### Quick Start

```bash
# Create project directory
mkdir crabstudio && cd crabstudio

# Initialize monorepo
pnpm init
echo 'packages:\n  - "packages/*"' > pnpm-workspace.yaml

# Create packages
mkdir -p packages/web packages/api

# Initialize frontend
cd packages/web
pnpm create vite . --template react-ts
pnpm add @tanstack/react-router @tanstack/react-query

# Initialize backend
cd ../api
pnpm init
pnpm add hono ws
pnpm add -D typescript @types/node @types/ws tsx

# Start development
cd ../..
pnpm add -D concurrently
```

### Verify Gateway Connection

```bash
# Test that Gateway is running
curl -s http://127.0.0.1:18789/health

# Or via WebSocket (in Node REPL)
const ws = new (require('ws'))('ws://127.0.0.1:18789');
ws.on('open', () => console.log('Connected!'));
```

---

## Next Steps After This Plan

1. **Read through `wrapper-goal-specs.md`** to understand the full scope
2. **Read through `wrapper-architecture.md`** to understand technical decisions
3. **Start Week 1 Day 1** tasks from this document
4. **Track progress** by checking off tasks as completed
5. **Adjust timeline** based on actual progress
