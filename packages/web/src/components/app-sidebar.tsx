import { useState } from 'react'
import { Search, Plus, Bot, Trash2 } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import type { Agent } from '@/lib/api'

interface AppSidebarProps {
  agents: Agent[]
  selectedAgent: Agent | null
  onSelectAgent: (agent: Agent | null) => void
  onNewAgent: () => void
  onDeleteAgent: (agent: Agent) => void
  isLoading?: boolean
}

export function AppSidebar({
  agents,
  selectedAgent,
  onSelectAgent,
  onNewAgent,
  onDeleteAgent,
  isLoading,
}: AppSidebarProps) {
  const [search, setSearch] = useState('')

  const filteredAgents = agents.filter((agent) => {
    const name = agent.name || agent.id || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarInput
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarGroupAction title="New Agent" onClick={onNewAgent}>
            <Plus />
            <span className="sr-only">New Agent</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              ) : filteredAgents.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {search ? 'No agents found' : 'No agents yet'}
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <SidebarMenuItem key={agent.id}>
                    <SidebarMenuButton
                      isActive={selectedAgent?.id === agent.id}
                      onClick={() => onSelectAgent(agent)}
                      tooltip={agent.name || agent.id}
                    >
                      <Bot />
                      <span>{agent.name || agent.id}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteAgent(agent)
                      }}
                      className="hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 />
                      <span className="sr-only">Delete</span>
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
