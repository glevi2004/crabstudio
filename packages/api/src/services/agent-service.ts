import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const CLAWDBOT_CONFIG_PATH = path.join(os.homedir(), '.clawdbot', 'moltbot.json')
const WORKSPACES_BASE = path.join(os.homedir(), 'crabstudio', 'workspaces')

export interface AgentCreateParams {
  name: string
  personality: string
  model?: string
}

export interface AgentUpdateParams {
  personality?: string
  name?: string
}

export interface AgentDetail {
  id: string
  name: string
  workspace: string
  soul: string
  memory: string
  model?: {
    provider?: string
    model?: string
  }
}

async function readConfig(): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(CLAWDBOT_CONFIG_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    // Return empty config if file doesn't exist
    return { agents: { list: [] } }
  }
}

async function writeConfig(config: Record<string, unknown>): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(path.dirname(CLAWDBOT_CONFIG_PATH), { recursive: true })
  await fs.writeFile(CLAWDBOT_CONFIG_PATH, JSON.stringify(config, null, 2))
}

export const agentService = {
  async createAgent(params: AgentCreateParams): Promise<AgentDetail> {
    const agentId = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const workspacePath = path.join(WORKSPACES_BASE, agentId)

    // 1. Create workspace directory
    await fs.mkdir(workspacePath, { recursive: true })
    await fs.mkdir(path.join(workspacePath, 'memory'), { recursive: true })

    // 2. Write SOUL.md
    const soulContent = `# ${params.name}

${params.personality}
`
    await fs.writeFile(path.join(workspacePath, 'SOUL.md'), soulContent)

    // 3. Write empty MEMORY.md
    await fs.writeFile(
      path.join(workspacePath, 'MEMORY.md'),
      `# Memory

This file stores persistent memory for the agent.
`
    )

    // 4. Update Clawdbot config
    const config = await readConfig()
    const agents = (config.agents as Record<string, unknown>) || {}
    const list = (agents.list as unknown[]) || []

    const newAgent = {
      id: agentId,
      name: params.name,
      workspace: workspacePath,
      ...(params.model && { model: { model: params.model } }),
    }

    list.push(newAgent)
    config.agents = { ...agents, list }

    await writeConfig(config)

    return {
      id: agentId,
      name: params.name,
      workspace: workspacePath,
      soul: soulContent,
      memory: '# Memory\n\nThis file stores persistent memory for the agent.\n',
      model: params.model ? { model: params.model } : undefined,
    }
  },

  async getAgentDetail(agentId: string): Promise<AgentDetail> {
    const config = await readConfig()
    const agents = (config.agents as Record<string, unknown>) || {}
    const list = (agents.list as Array<Record<string, unknown>>) || []

    const agent = list.find((a) => a.id === agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    const workspace = agent.workspace as string
    const soulPath = path.join(workspace, 'SOUL.md')
    const memoryPath = path.join(workspace, 'MEMORY.md')

    const [soul, memory] = await Promise.all([
      fs.readFile(soulPath, 'utf-8').catch(() => ''),
      fs.readFile(memoryPath, 'utf-8').catch(() => ''),
    ])

    return {
      id: agent.id as string,
      name: (agent.name as string) || (agent.id as string),
      workspace,
      soul,
      memory,
      model: agent.model as { provider?: string; model?: string } | undefined,
    }
  },

  async updateAgent(agentId: string, updates: AgentUpdateParams): Promise<AgentDetail> {
    const detail = await this.getAgentDetail(agentId)

    if (updates.personality !== undefined) {
      const soulContent = `# ${updates.name || detail.name}

${updates.personality}
`
      await fs.writeFile(path.join(detail.workspace, 'SOUL.md'), soulContent)
    }

    // Update config if name changed
    if (updates.name && updates.name !== detail.name) {
      const config = await readConfig()
      const agents = (config.agents as Record<string, unknown>) || {}
      const list = (agents.list as Array<Record<string, unknown>>) || []

      const agentIndex = list.findIndex((a) => a.id === agentId)
      if (agentIndex !== -1) {
        list[agentIndex].name = updates.name
        config.agents = { ...agents, list }
        await writeConfig(config)
      }
    }

    return this.getAgentDetail(agentId)
  },

  async updateMemory(agentId: string, memoryContent: string): Promise<void> {
    const detail = await this.getAgentDetail(agentId)
    await fs.writeFile(path.join(detail.workspace, 'MEMORY.md'), memoryContent)
  },

  async deleteAgent(agentId: string): Promise<void> {
    const config = await readConfig()
    const agents = (config.agents as Record<string, unknown>) || {}
    const list = (agents.list as Array<Record<string, unknown>>) || []

    const agentIndex = list.findIndex((a) => a.id === agentId)
    if (agentIndex === -1) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    const agent = list[agentIndex]
    const workspace = agent.workspace as string

    // Remove from config
    list.splice(agentIndex, 1)
    config.agents = { ...agents, list }
    await writeConfig(config)

    // Remove workspace directory
    try {
      await fs.rm(workspace, { recursive: true, force: true })
    } catch (e) {
      console.error(`Failed to remove workspace: ${e}`)
    }
  },

  async listAgents(): Promise<Array<{ id: string; name: string; workspace: string }>> {
    const config = await readConfig()
    const agents = (config.agents as Record<string, unknown>) || {}
    const list = (agents.list as Array<Record<string, unknown>>) || []

    return list.map((a) => ({
      id: a.id as string,
      name: (a.name as string) || (a.id as string),
      workspace: a.workspace as string,
    }))
  },
}
