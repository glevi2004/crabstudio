// Clawdbot Gateway Protocol v3 types

// Frame types
export interface RequestFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export interface ResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code: string; message: string }
}

export interface EventFrame {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: { presence: number; health: number }
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame

// Connection
export interface ClientInfo {
  id: string
  displayName?: string
  version: string
  platform: string
  mode: 'ui' | 'cli' | 'bot'
}

export interface ConnectParams {
  minProtocol: 3
  maxProtocol: 3
  client: ClientInfo
  role: string
  scopes: string[]
  auth?: { token?: string }
}

export interface HelloOk {
  type: 'hello-ok'
  protocol: number
  snapshot: {
    presence: PresenceEntry[]
    health: unknown
    stateVersion: { presence: number; health: number }
  }
  features: { methods: string[]; events: string[] }
}

export interface PresenceEntry {
  key: string
  client: ClientInfo
  connectedAt: number
}

// Chat events
export interface ChatEvent {
  runId: string
  sessionKey: string
  seq: number
  state: 'delta' | 'final' | 'aborted' | 'error'
  message?: {
    role: 'assistant'
    content: Array<{ type: 'text'; text: string }>
  }
  errorMessage?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  stopReason?: string
}

// Agent events (tool calls, lifecycle, etc.)
export interface AgentEvent {
  runId: string
  seq: number
  stream: string
  ts: number
  data: Record<string, unknown>
  sessionKey?: string
}

// Sessions
export interface SessionsListParams {
  limit?: number
  activeMinutes?: number
  includeLastMessage?: boolean
  agentId?: string
}

export interface SessionInfo {
  key: string
  agentId: string
  createdAt: number
  lastActivityAt: number
  messageCount: number
  lastMessage?: unknown
  spawnedBy?: string
}

// Agents
export interface AgentInfo {
  id: string
  name?: string
  workspace?: string
  agentDir?: string
  model?: {
    provider?: string
    model?: string
  }
  default?: boolean
}

export interface AgentsListResult {
  agents: AgentInfo[]
}

// Agent RPC params
export interface AgentParams {
  message: string
  images?: string[]
  to?: string
  sessionId?: string
  sessionKey?: string
  idempotencyKey?: string
  extraSystemPrompt?: string
}

// Helper functions
export function parseSessionKey(key: string): {
  agentId: string
  platform: string
  recipient: string
  isGroup: boolean
} {
  const parts = key.split(':')
  const agentId = parts[1] || 'unknown'
  const platform = parts[2] || 'unknown'
  const hasType = ['channel', 'group', 'dm', 'thread'].includes(parts[3] || '')
  const isGroup = parts[3] === 'group' || parts[3] === 'channel'
  const recipient = hasType ? parts.slice(3).join(':') : parts.slice(3).join(':')

  return { agentId, platform, recipient, isGroup }
}

export function createConnectParams(token?: string): ConnectParams {
  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'cli',  // Gateway expects 'cli' as valid client ID
      displayName: 'Crabstudio',
      version: '0.1.0',
      platform: process.platform,
      mode: 'cli',
    },
    role: 'operator',
    scopes: ['operator.read', 'operator.write'],
    auth: token ? { token } : undefined,
  }
}
