export type TeamStatus = 'active' | 'question' | 'inactive' | 'submitted' | 'linkIssue'

export type ArtifactType = 'table' | 'figma' | 'mixed'

export type LinkStatus = 'ok' | 'denied' | 'unchecked'

export type TeamReadiness = 'ready' | 'blocked' | 'inProgress' | 'waiting'

export type StudentChecklistItem = {
  label: string
  done: boolean
}

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
  readiness: TeamReadiness
  needsHelp: boolean
  professorFeedback: string
  checklist: StudentChecklistItem[]
  noticeCount: number
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

export type PresentationQueueItem = {
  teamId: number
  status: TeamReadiness
  label: string
  detail: string
}

export type ClassNotice = {
  id: number
  title: string
  body: string
  target: string
  tone: 'link' | 'question' | 'inactive'
}

export type FormatPhase = 'preClass' | 'inClass'

export type SubmissionType = 'figmaLink' | 'table' | 'both'

export type TableRowRole = 'prompt' | 'response'

export type TableColumn = {
  id: string
  label: string
  width: number
}

export type TableRow = {
  id: string
  label: string
  role: TableRowRole
  cells: Record<string, string>
}

export type TableTemplate = {
  columns: TableColumn[]
  rows: TableRow[]
}

export type ClassFormat = {
  phase: FormatPhase
  submissionType: SubmissionType
  title: string
  description: string
  instructions: string
  figmaPrompt: string
  tableTemplate: TableTemplate
  publishedAt?: string
}

export type ClassWeek = {
  id: string
  weekNumber: number
  title: string
  format: ClassFormat
  formats: Record<FormatPhase, ClassFormat>
}
