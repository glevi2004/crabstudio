import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface NewAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateAgent: (params: { name: string; personality: string; model?: string }) => Promise<void>
}

const TEMPLATES = [
  {
    name: 'Assistant',
    personality: 'You are a helpful and friendly AI assistant. You provide clear, concise answers and help users accomplish their tasks efficiently.',
  },
  {
    name: 'Coder',
    personality: 'You are an expert software engineer. You write clean, efficient code and explain technical concepts clearly. You follow best practices and consider edge cases.',
  },
  {
    name: 'Writer',
    personality: 'You are a skilled writer with expertise in various styles. You help craft compelling content, from creative stories to professional documents.',
  },
]

export function NewAgentDialog({ open, onOpenChange, onCreateAgent }: NewAgentDialogProps) {
  const [name, setName] = useState('')
  const [personality, setPersonality] = useState('')
  const [model, setModel] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || !personality.trim()) {
      setError('Name and personality are required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      await onCreateAgent({
        name: name.trim(),
        personality: personality.trim(),
        model: model.trim() || undefined,
      })
      // Reset form
      setName('')
      setPersonality('')
      setModel('')
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create agent')
    } finally {
      setIsCreating(false)
    }
  }

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    if (!name) setName(template.name)
    setPersonality(template.personality)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Give your agent a name and personality. You can use a template or write your own.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Templates */}
          <div>
            <label className="mb-2 block text-sm font-medium">Quick Start</label>
            <div className="flex gap-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-secondary"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Agent"
              className="bg-muted/30"
            />
          </div>

          {/* Personality */}
          <div>
            <label htmlFor="personality" className="mb-2 block text-sm font-medium">
              Personality (SOUL.md)
            </label>
            <Textarea
              id="personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Describe your agent's personality, capabilities, and how it should behave..."
              className="min-h-[120px] bg-muted/30"
            />
          </div>

          {/* Model (optional) */}
          <div>
            <label htmlFor="model" className="mb-2 block text-sm font-medium">
              Model <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="anthropic/claude-sonnet-4-20250514"
              className="bg-muted/30"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
