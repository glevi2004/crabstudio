import { Hono } from 'hono'
import { z } from 'zod'
import { getGatewayClient } from '../services/gateway/index.js'
import { agentService } from '../services/agent-service.js'

const app = new Hono()

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  personality: z.string().min(1),
  model: z.string().optional(),
})

const UpdateAgentSchema = z.object({
  personality: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
})

// List all agents (from Gateway + local config)
app.get('/', async (c) => {
  try {
    const gateway = getGatewayClient()
    
    // Try to get agents from gateway if connected
    if (gateway.connected) {
      const result = await gateway.listAgents()
      return c.json(result)
    }
    
    // Fallback to local config
    const agents = await agentService.listAgents()
    return c.json({ agents })
  } catch (error) {
    console.error('Failed to list agents:', error)
    // Fallback to local config
    const agents = await agentService.listAgents()
    return c.json({ agents })
  }
})

// Get agent detail
app.get('/:agentId', async (c) => {
  const { agentId } = c.req.param()
  
  try {
    const detail = await agentService.getAgentDetail(agentId)
    return c.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 404)
  }
})

// Create new agent
app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CreateAgentSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400)
    }
    
    const agent = await agentService.createAgent(parsed.data)
    return c.json(agent, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// Update agent
app.patch('/:agentId', async (c) => {
  const { agentId } = c.req.param()
  
  try {
    const body = await c.req.json()
    const parsed = UpdateAgentSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400)
    }
    
    const agent = await agentService.updateAgent(agentId, parsed.data)
    return c.json(agent)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 404)
  }
})

// Update agent memory
app.put('/:agentId/memory', async (c) => {
  const { agentId } = c.req.param()
  
  try {
    const body = await c.req.json()
    const content = body.content
    
    if (typeof content !== 'string') {
      return c.json({ error: 'Content must be a string' }, 400)
    }
    
    await agentService.updateMemory(agentId, content)
    return c.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// Delete agent
app.delete('/:agentId', async (c) => {
  const { agentId } = c.req.param()
  
  try {
    await agentService.deleteAgent(agentId)
    return c.json({ deleted: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 404)
  }
})

export default app
