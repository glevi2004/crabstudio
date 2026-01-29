import { useState, useEffect, useCallback } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ChatArea } from '@/components/chat-area'
import { NewAgentDialog } from '@/components/new-agent-dialog'
import {
  listAgents,
  createAgent,
  deleteAgent as deleteAgentApi,
  sendMessage,
  type Agent,
  type CreateAgentParams,
} from '@/lib/api'
import { wsClient, type WebSocketMessage } from '@/lib/websocket'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  streaming?: boolean
}

function AppContent() {
  const qc = useQueryClient()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showNewAgentDialog, setShowNewAgentDialog] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [gatewayConnected, setGatewayConnected] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)

  // Fetch agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
  })

  const agents = agentsData?.agents ?? []

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: (params: CreateAgentParams) => createAgent(params),
    onSuccess: (newAgent) => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      setSelectedAgent(newAgent)
    },
  })

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => deleteAgentApi(agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      setSelectedAgent(null)
      setMessages([])
    },
  })

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === 'status') {
      setGatewayConnected(data.connected ?? false)
      return
    }

    if (data.type === 'chat') {
      // Handle streaming response
      if (data.state === 'delta' && data.message?.content) {
        const text = data.message.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('')

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.role === 'assistant' && lastMessage.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: text },
            ]
          }
          return prev
        })
      } else if (data.state === 'final') {
        setIsStreaming(false)
        setCurrentRunId(null)
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.role === 'assistant' && lastMessage.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, streaming: false },
            ]
          }
          return prev
        })
      } else if (data.state === 'error' || data.state === 'aborted') {
        setIsStreaming(false)
        setCurrentRunId(null)
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.role === 'assistant' && lastMessage.streaming) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: lastMessage.content || 'Message was interrupted',
                streaming: false,
              },
            ]
          }
          return prev
        })
      }
    }
  }, [])

  // Subscribe to WebSocket (singleton, stays connected)
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(handleWebSocketMessage)
    return unsubscribe
  }, [handleWebSocketMessage])

  // Send message handler
  const handleSendMessage = async (content: string) => {
    if (!selectedAgent || isStreaming) return

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Add placeholder for assistant response
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    }
    setMessages((prev) => [...prev, assistantMessage])
    setIsStreaming(true)

    try {
      const result = await sendMessage({
        message: content,
        agentId: selectedAgent.id,
      })
      if (result.runId) {
        setCurrentRunId(result.runId)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsStreaming(false)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.streaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              content: 'Failed to send message. Please try again.',
              streaming: false,
            },
          ]
        }
        return prev
      })
    }
  }

  // Handle agent selection - clear messages when switching
  const handleSelectAgent = (agent: Agent | null) => {
    if (agent?.id !== selectedAgent?.id) {
      setMessages([])
      setIsStreaming(false)
      setCurrentRunId(null)
    }
    setSelectedAgent(agent)
  }

  // Handle agent deletion
  const handleDeleteAgent = (agent: Agent) => {
    if (confirm(`Are you sure you want to delete "${agent.name || agent.id}"?`)) {
      deleteAgentMutation.mutate(agent.id)
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        agents={agents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleSelectAgent}
        onNewAgent={() => setShowNewAgentDialog(true)}
        onDeleteAgent={handleDeleteAgent}
        isLoading={agentsLoading}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          {selectedAgent && (
            <span className="font-medium">{selectedAgent.name || selectedAgent.id}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${gatewayConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {gatewayConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatArea
            agent={selectedAgent}
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            gatewayConnected={gatewayConnected}
          />
        </div>
      </SidebarInset>

      <NewAgentDialog
        open={showNewAgentDialog}
        onOpenChange={setShowNewAgentDialog}
        onCreateAgent={async (params) => {
          await createAgentMutation.mutateAsync(params)
        }}
      />
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
