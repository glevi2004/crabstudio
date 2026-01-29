import { Hono } from 'hono'
import { getGatewayClient } from '../services/gateway/index.js'

const app = new Hono()

// List sessions
app.get('/', async (c) => {
  const agentId = c.req.query('agentId')
  const activeMinutes = c.req.query('activeMinutes')
  const limit = c.req.query('limit')
  
  try {
    const gateway = getGatewayClient()
    
    if (!gateway.connected) {
      return c.json({ error: 'Gateway not connected' }, 503)
    }
    
    const sessions = await gateway.listSessions({
      agentId: agentId || undefined,
      activeMinutes: activeMinutes ? parseInt(activeMinutes, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      includeLastMessage: true,
    })
    
    return c.json({ sessions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

export default app
