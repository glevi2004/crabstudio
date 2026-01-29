const API_BASE = '/api'

export interface Agent {
  id: string
  name: string
  workspace?: string
  model?: {
    provider?: string
    model?: string
  }
  default?: boolean
}

export interface AgentDetail extends Agent {
  soul: string
  memory: string
}

export interface Session {
  key: string
  agentId: string
  createdAt: number
  lastActivityAt: number
  messageCount: number
}

export interface CreateAgentParams {
  name: string
  personality: string
  model?: string
}

export interface SendMessageParams {
  message: string
  agentId?: string
  sessionKey?: string
}

// Agents API
export async function listAgents(): Promise<{ agents: Agent[] }> {
  const res = await fetch(`${API_BASE}/agents`)
  if (!res.ok) throw new Error('Failed to fetch agents')
  return res.json()
}

export async function getAgent(agentId: string): Promise<AgentDetail> {
  const res = await fetch(`${API_BASE}/agents/${agentId}`)
  if (!res.ok) throw new Error('Failed to fetch agent')
  return res.json()
}

export async function createAgent(params: CreateAgentParams): Promise<AgentDetail> {
  const res = await fetch(`${API_BASE}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create agent' }))
    throw new Error(error.error || 'Failed to create agent')
  }
  return res.json()
}

export async function updateAgent(
  agentId: string,
  params: { personality?: string; name?: string }
): Promise<AgentDetail> {
  const res = await fetch(`${API_BASE}/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Failed to update agent')
  return res.json()
}

export async function deleteAgent(agentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/agents/${agentId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete agent')
}

// Sessions API
export async function listSessions(): Promise<{ sessions: Session[] }> {
  const res = await fetch(`${API_BASE}/sessions`)
  if (!res.ok) throw new Error('Failed to fetch sessions')
  return res.json()
}

// Chat API
export async function sendMessage(params: SendMessageParams): Promise<{ accepted: boolean; runId?: string }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to send message' }))
    throw new Error(error.error || 'Failed to send message')
  }
  return res.json()
}

// Gateway status
export async function getGatewayStatus(): Promise<{ connected: boolean; url: string }> {
  const res = await fetch(`${API_BASE.replace('/api', '')}/gateway/status`)
  if (!res.ok) throw new Error('Failed to fetch gateway status')
  return res.json()
}
