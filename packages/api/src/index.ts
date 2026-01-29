import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

// Load .env from workspace root (try multiple paths)
const envPaths = [
  resolve(process.cwd(), '.env'),           // When running from root
  resolve(process.cwd(), '../../.env'),      // When running from packages/api
]
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath })
    break
  }
}
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { WebSocketServer, WebSocket } from 'ws'

import agentsRoutes from './routes/agents.js'
import sessionsRoutes from './routes/sessions.js'
import chatRoutes from './routes/chat.js'
import {
  getGatewayClient,
  isChatEvent,
  isAgentEvent,
  type EventFrame,
} from './services/gateway/index.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  })
)

// Health check
app.get('/health', (c) => {
  const gateway = getGatewayClient()
  return c.json({
    status: 'ok',
    gateway: gateway.connected ? 'connected' : 'disconnected',
    timestamp: Date.now(),
  })
})

// Gateway connection status
app.get('/gateway/status', (c) => {
  const gateway = getGatewayClient()
  return c.json({
    connected: gateway.connected,
    url: process.env.CLAWDBOT_URL || 'ws://127.0.0.1:18789',
  })
})

// API Routes
app.route('/api/agents', agentsRoutes)
app.route('/api/sessions', sessionsRoutes)
app.route('/api/chat', chatRoutes)

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10)

const server = serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`🦀 Crabstudio API running on http://localhost:${PORT}`)

// WebSocket server for real-time events
// @ts-expect-error - Hono's serve returns a compatible server
const wss = new WebSocketServer({ server, path: '/ws' })

// Track connected clients
const clients = new Set<WebSocket>()

wss.on('connection', (ws) => {
  console.log('[ws] Client connected')
  clients.add(ws)

  ws.on('close', () => {
    console.log('[ws] Client disconnected')
    clients.delete(ws)
  })

  ws.on('error', (err) => {
    console.error('[ws] Client error:', err)
    clients.delete(ws)
  })

  // Send initial connection status
  const gateway = getGatewayClient()
  ws.send(
    JSON.stringify({
      type: 'status',
      connected: gateway.connected,
    })
  )
})

// Broadcast event to all WebSocket clients
function broadcast(data: unknown) {
  const message = JSON.stringify(data)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}

// Connect to Gateway and forward events
async function connectToGateway() {
  const gateway = getGatewayClient()

  try {
    console.log('[gateway] Connecting to Clawdbot Gateway...')
    await gateway.connect()
    console.log('[gateway] ✅ Connected!')

    // Broadcast connection status
    broadcast({ type: 'status', connected: true })

    // Subscribe to events and forward to WebSocket clients
    gateway.onEvent((event: EventFrame) => {
      if (isChatEvent(event)) {
        // Forward chat events (streaming responses)
        broadcast({
          type: 'chat',
          ...event.payload,
        })
      } else if (isAgentEvent(event)) {
        // Forward agent events (tool calls, etc.)
        broadcast({
          type: 'agent',
          ...event.payload,
        })
      } else {
        // Forward other events
        broadcast({
          type: 'event',
          event: event.event,
          payload: event.payload,
        })
      }
    })
  } catch (error) {
    console.error('[gateway] ❌ Failed to connect:', error)
    broadcast({ type: 'status', connected: false })

    // Retry in 5 seconds
    setTimeout(connectToGateway, 5000)
  }
}

// Start Gateway connection
connectToGateway()

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  const gateway = getGatewayClient()
  gateway.disconnect()
  wss.close()
  process.exit(0)
})
