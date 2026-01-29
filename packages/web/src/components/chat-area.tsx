import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, Sparkles, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Agent } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  streaming?: boolean
}

interface ChatAreaProps {
  agent: Agent | null
  messages: Message[]
  isStreaming: boolean
  onSendMessage: (message: string) => void
  gatewayConnected: boolean
}

export function ChatArea({
  agent,
  messages,
  isStreaming,
  onSendMessage,
  gatewayConnected,
}: ChatAreaProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = () => {
    if (!input.trim() || isStreaming || !gatewayConnected) return
    onSendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  // Empty state - no messages
  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {/* Empty centered state */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            {/* Model selector */}
            <div className="mb-6 flex justify-center">
              <button className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
                {agent ? (agent.name || agent.id) : 'Select Agent'}
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Input area */}
            <div className="relative rounded-xl border border-border bg-muted/30 p-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  adjustTextareaHeight()
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  agent
                    ? `Message ${agent.name || agent.id}...`
                    : 'Select an agent to start chatting'
                }
                disabled={!agent || !gatewayConnected}
                className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                rows={1}
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {agent?.model?.model && (
                    <span className="rounded bg-secondary px-2 py-0.5">
                      {agent.model.model}
                    </span>
                  )}
                </div>
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  disabled={!input.trim() || isStreaming || !agent || !gatewayConnected}
                  onClick={handleSubmit}
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <QuickAction label="Start a conversation" icon={<Sparkles className="h-3 w-3" />} />
              <QuickAction label="Learn about the agent" icon={<Bot className="h-3 w-3" />} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Chat view with messages
  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border-subtle p-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-xl border border-border bg-muted/30 p-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                adjustTextareaHeight()
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              disabled={!gatewayConnected}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
            />
            <div className="flex items-center justify-end px-3 pb-2">
              <Button
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={!input.trim() || isStreaming || !gatewayConnected}
                onClick={handleSubmit}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn('mb-4 flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.streaming && (
          <span className="inline-block h-4 w-1 animate-pulse bg-current" />
        )}
      </div>
    </div>
  )
}

function QuickAction({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-secondary">
      {icon}
      {label}
    </button>
  )
}
