# Crabstudio: Goals & Specifications

## What We're Building

**Crabstudio** is a web application that wraps Clawdbot (the AI agent framework) to provide a user-friendly interface for creating, managing, and chatting with AI agents—without requiring any technical knowledge.

### The Problem

Clawdbot is powerful but technical:
- Requires command-line usage (`moltbot agents add`, `moltbot config set`)
- Configuration via JSON files (`~/.clawdbot/moltbot.json`)
- Memory managed through markdown files (`SOUL.md`, `MEMORY.md`)
- No visual dashboard or web interface for management

**Non-technical users can't use it.**

### The Solution

A web platform that:
1. Provides a beautiful dashboard to create and manage AI agents
2. Offers a chat interface to interact with agents
3. Handles all Clawdbot configuration behind the scenes
4. Adds enhanced memory capabilities (semantic recall, user profiles)
5. Eventually supports multiple users (multi-tenant)

---

## Core Concepts

### What is Clawdbot?

Clawdbot is an AI agent framework that:
- Runs a **Gateway** server (WebSocket on port 18789)
- Manages multiple **Agents** (each with its own workspace/personality)
- Handles **Sessions** (conversation history)
- Provides **Memory Search** (semantic search over markdown files)
- Supports multiple messaging **Channels** (WhatsApp, Telegram, Discord, etc.)

**We're not replacing Clawdbot—we're building a UI on top of it.**

### What is Crabstudio?

Crabstudio is:
- A **web backend** (Express/Hono) that communicates with Clawdbot's Gateway
- A **web frontend** (React) that provides the user interface
- A **database** (PostgreSQL) for user accounts and metadata
- A **memory backend** (Supermemory or similar) for enhanced AI memory

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER                                      │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 CRABSTUDIO (What We Build)                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │    │
│  │  │   React UI  │  │   Express   │  │    PostgreSQL   │  │    │
│  │  │  Dashboard  │◀▶│   Backend   │◀▶│  Users/Spaces   │  │    │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────┘  │    │
│  │                          │                               │    │
│  │                          │ WebSocket                     │    │
│  │                          ▼                               │    │
│  └──────────────────────────┼───────────────────────────────┘    │
│                             │                                    │
│  ┌──────────────────────────┼───────────────────────────────┐    │
│  │              CLAWDBOT (Already Exists)                    │    │
│  │                          │                                │    │
│  │              ┌───────────▼───────────┐                    │    │
│  │              │    Gateway Server     │                    │    │
│  │              │    (port 18789)       │                    │    │
│  │              └───────────┬───────────┘                    │    │
│  │                          │                                │    │
│  │    ┌─────────────────────┼─────────────────────┐         │    │
│  │    │                     │                     │         │    │
│  │    ▼                     ▼                     ▼         │    │
│  │ ┌──────┐             ┌──────┐             ┌──────┐       │    │
│  │ │Agent1│             │Agent2│             │AgentN│       │    │
│  │ └──────┘             └──────┘             └──────┘       │    │
│  │                                                           │    │
│  └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### Phase 1: Single User MVP

**Goal**: A working dashboard for myself to manage my own agents.

#### 1.1 Agent Management
- [ ] **List agents**: See all configured agents with status
- [ ] **Create agent**: Form to create new agent with name, personality, model
- [ ] **Edit agent**: Modify agent personality (SOUL.md content)
- [ ] **Delete agent**: Remove agent and its workspace

#### 1.2 Chat Interface
- [ ] **Session list**: See all conversations per agent
- [ ] **Chat view**: Real-time chat with streaming responses
- [ ] **Session management**: Create new, reset, or delete sessions

#### 1.3 Memory Viewer
- [ ] **View MEMORY.md**: See and edit agent's memory file
- [ ] **Search memories**: Use existing memory_search functionality
- [ ] **View memory folder**: Browse files in `memory/` directory

### Phase 2: Enhanced Memory

**Goal**: Add semantic memory that persists across sessions.

#### 2.1 Memory Backend Integration
- [ ] **Automatic memory extraction**: Extract learnings from conversations
- [ ] **Semantic recall**: Inject relevant memories into context
- [ ] **Memory management UI**: View, edit, delete stored memories

#### 2.2 User Profiles
- [ ] **Profile facts**: Store user preferences/facts
- [ ] **Profile injection**: Include profile in agent context
- [ ] **Profile UI**: Let users view/edit their profile

### Phase 3: Multi-Tenant

**Goal**: Support multiple users with isolated spaces.

#### 3.1 Authentication
- [ ] **User signup/login**: Email + password auth
- [ ] **Session management**: JWT tokens, refresh flow
- [ ] **Password reset**: Email-based recovery

#### 3.2 Spaces (Workspaces)
- [ ] **Create spaces**: Isolated environments for agents
- [ ] **Space switching**: UI to switch between spaces
- [ ] **Space settings**: Configure per-space defaults

#### 3.3 Isolation
- [ ] **Agent isolation**: Each user's agents are separate
- [ ] **Memory isolation**: Memories scoped to user/space
- [ ] **Workspace isolation**: Filesystem separation

### Phase 4: Scale & Polish

**Goal**: Production-ready for broader use.

#### 4.1 Security
- [ ] **Rate limiting**: Per-user request limits
- [ ] **Input validation**: Sanitize all user inputs
- [ ] **Audit logging**: Track sensitive operations

#### 4.2 Performance
- [ ] **Connection pooling**: Efficient Gateway connections
- [ ] **Caching**: Cache agent metadata and configs
- [ ] **Background jobs**: Async memory sync

#### 4.3 UX Polish
- [ ] **Onboarding flow**: Guided first-time setup
- [ ] **Error handling**: Graceful error messages
- [ ] **Mobile responsive**: Works on all devices

---

## Success Criteria

### MVP (Phase 1) Success
- I can create a new agent from the web UI
- I can chat with the agent and see streaming responses
- I can view and edit the agent's SOUL.md and MEMORY.md
- I can see all my sessions and switch between them

### Production Success (Phase 4)
- New users can sign up and start using agents in <5 minutes
- System handles 100 concurrent users without issues
- Memory system provides useful context in conversations
- No data leaks between users

---

## Non-Goals (Out of Scope)

1. **Replacing Clawdbot CLI**: Power users can still use CLI directly
2. **Custom messaging channels**: We use webchat only (no WhatsApp/Telegram integration in platform)
3. **Agent-to-agent communication**: Focus on user-to-agent only
4. **Code execution sandboxing**: Trust Clawdbot's existing sandbox
5. **Custom tool development UI**: Tools managed via filesystem/config

---

## Technical Constraints

1. **Clawdbot Gateway must be running**: Crabstudio requires active Gateway
2. **Single Gateway (initially)**: One Gateway process handles all agents
3. **Local filesystem**: Agent workspaces stored on Gateway host
4. **Node.js runtime**: Crabstudio runs on Node.js (same as Clawdbot)

---

## Open Questions

1. **Memory backend choice**: Supermemory vs Mem0 vs custom?
2. **Hosting model**: Self-hosted vs cloud service?
3. **Pricing model**: Free tier + paid? Per-agent? Per-message?
4. **Gateway scaling**: When/how to add multiple Gateway instances?
