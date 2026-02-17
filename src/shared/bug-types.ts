export interface Fix {
  id: string
  summary: string
  detail: string
  status: 'suggested' | 'applying' | 'failed' | 'success'
  suggestedBy: 'claude' | 'codex' | 'user'
  appliedAt?: string
  failedNote?: string
}

export interface Bug {
  id: string
  title: string
  description: string
  status: 'open' | 'resolved'
  createdAt: string
  resolvedAt?: string
  fixes: Fix[]
}

export type BugFilter = 'all' | 'open' | 'resolved'
