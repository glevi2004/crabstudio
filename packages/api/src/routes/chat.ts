import { Hono } from 'hono'
import { z } from 'zod'
import { getGatewayClient } from '../services/gateway/index.js'

const app = new Hono()

const SendMessageSchema = z.object({
  message: z.string().min(1),
  agentId: z.string().optional(),
  sessionKey: z.string().optional(),
  extraSystemPrompt: z.string().optional(),
})

// Send message to agent
app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = SendMessageSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400)
    }
    
    const gateway = getGatewayClient()
    
    if (!gateway.connected) {
      return c.json({ error: 'Gateway not connected' }, 503)
    }
    
    const result = await gateway.sendMessage({
      message: parsed.data.message,
      to: parsed.data.agentId,
      sessionKey: parsed.data.sessionKey,
      extraSystemPrompt: parsed.data.extraSystemPrompt,
    })
    
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

export default app
