type MessageHandler = (data: WebSocketMessage) => void

export interface WebSocketMessage {
  type: 'status' | 'chat' | 'agent' | 'event'
  connected?: boolean
  runId?: string
  sessionKey?: string
  seq?: number
  state?: 'delta' | 'final' | 'aborted' | 'error'
  message?: {
    role: 'assistant'
    content: Array<{ type: 'text'; text: string }>
  }
  stream?: string
  data?: Record<string, unknown>
  event?: string
  payload?: unknown
}

// Singleton pattern - survives React StrictMode double-mount
let globalWs: WebSocket | null = null
let globalHandlers: Set<MessageHandler> = new Set()
let globalConnected = false
let globalReconnectTimer: ReturnType<typeof setTimeout> | null = null
let globalReconnectAttempts = 0

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws`
}

function doConnect() {
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
    return
  }

  try {
    globalWs = new WebSocket(getWebSocketUrl())

    globalWs.onopen = () => {
      console.log('[ws] Connected')
      globalConnected = true
      globalReconnectAttempts = 0
      // Notify handlers of connection status
      globalHandlers.forEach(h => h({ type: 'status', connected: true }))
    }

    globalWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage
        globalHandlers.forEach((handler) => {
          try {
            handler(data)
          } catch (e) {
            console.error('[ws] Handler error:', e)
          }
        })
      } catch (e) {
        console.error('[ws] Parse error:', e)
      }
    }

    globalWs.onclose = (event) => {
      console.log('[ws] Closed:', event.code)
      globalConnected = false
      globalWs = null
      
      // Notify handlers
      globalHandlers.forEach(h => h({ type: 'status', connected: false }))
      
      // Reconnect if not clean close and we have handlers
      if (event.code !== 1000 && globalHandlers.size > 0) {
        scheduleReconnect()
      }
    }

    globalWs.onerror = () => {
      // Will be followed by close
      globalConnected = false
    }
  } catch (e) {
    console.error('[ws] Create error:', e)
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (globalReconnectTimer || globalReconnectAttempts >= 10) return
  
  const delay = Math.min(2000 * Math.pow(1.5, globalReconnectAttempts), 30000)
  globalReconnectAttempts++
  
  console.log(`[ws] Reconnecting in ${Math.round(delay)}ms...`)
  globalReconnectTimer = setTimeout(() => {
    globalReconnectTimer = null
    if (globalHandlers.size > 0) {
      doConnect()
    }
  }, delay)
}

class WebSocketClient {
  get connected() {
    return globalConnected
  }

  connect() {
    doConnect()
  }

  subscribe(handler: MessageHandler): () => void {
    globalHandlers.add(handler)
    
    // Connect if this is the first subscriber
    if (globalHandlers.size === 1 && !globalWs) {
      doConnect()
    }
    
    // Send current status to new subscriber
    if (globalConnected) {
      handler({ type: 'status', connected: true })
    }
    
    return () => {
      globalHandlers.delete(handler)
      // Don't disconnect when handlers are removed - keep connection alive
    }
  }

  disconnect() {
    if (globalReconnectTimer) {
      clearTimeout(globalReconnectTimer)
      globalReconnectTimer = null
    }
    globalReconnectAttempts = 0
    if (globalWs) {
      globalWs.close(1000)
      globalWs = null
    }
    globalConnected = false
  }
}

export const wsClient = new WebSocketClient()
