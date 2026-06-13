export type TeamStatus = 'active' | 'question' | 'inactive' | 'submitted' | 'linkIssue'

export type ArtifactType = 'table' | 'figma' | 'mixed'

export type LinkStatus = 'ok' | 'denied' | 'unchecked'

export type Team = {
  id: number
  name: string
  status: TeamStatus
  artifactType: ArtifactType
  questions: number
  updates: number
  outputLabel: string
  linkStatus: LinkStatus
  lastActivity: string
  summary: string
  question?: string
  figmaUrl?: string
}

export type Alert = {
  id: number
  type: 'linkIssue' | 'inactive' | 'question'
  title: string
  description: string
  time: string
}

export type TimelineItem = {
  id: number
  time: string
  tone: 'blue' | 'green' | 'red' | 'amber'
  text: string
}

export type FeedbackSummary = {
  label: string
  count: number
  note: string
}
