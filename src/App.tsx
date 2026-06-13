import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Link as LinkIcon,
  Menu,
  MessageCircle,
  Megaphone,
  Monitor,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { ChangeEvent, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { alerts, feedbackSummary, teams, timeline } from './data/mockClass'
import type { Alert, ArtifactType, LinkStatus, Team, TeamStatus } from './types'

type TeamFilter = 'all' | TeamStatus
type SortMode = 'team' | 'status' | 'activity'
type WorkspaceMode = 'table' | 'figma' | 'both'

const statusMeta: Record<TeamStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'is-active' },
  question: { label: 'Question', className: 'is-question' },
  inactive: { label: 'Inactive', className: 'is-inactive' },
  submitted: { label: 'Submitted', className: 'is-submitted' },
  linkIssue: { label: 'Link Issue', className: 'is-link-issue' },
}

const artifactLabels: Record<ArtifactType, string> = {
  table: 'Table',
  figma: 'Figma',
  mixed: 'Mixed',
}

const artifactLongLabels: Record<ArtifactType, string> = {
  table: 'Text Table',
  figma: 'Figma Link',
  mixed: 'Mixed (Table + Figma)',
}

const linkLabels: Record<LinkStatus, string> = {
  ok: 'Link OK',
  denied: 'Access Denied',
  unchecked: 'Unchecked',
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/professor" replace />} />
      <Route path="/professor" element={<ProfessorDashboard />} />
      <Route path="/student" element={<StudentWorkspace />} />
      <Route path="*" element={<Navigate to="/professor" replace />} />
    </Routes>
  )
}

function ProfessorDashboard() {
  const [filter, setFilter] = useState<TeamFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('team')

  const visibleTeams = useMemo(() => {
    const filtered = filter === 'all' ? teams : teams.filter((team) => team.status === filter)
    return [...filtered].sort((a, b) => {
      if (sortMode === 'status') {
        return a.status.localeCompare(b.status) || a.id - b.id
      }
      if (sortMode === 'activity') {
        const priority: Record<TeamStatus, number> = {
          linkIssue: 0,
          inactive: 1,
          question: 2,
          active: 3,
          submitted: 4,
        }
        return priority[a.status] - priority[b.status] || a.id - b.id
      }
      return a.id - b.id
    })
  }, [filter, sortMode])

  const pulse = {
    active: teams.filter((team) => team.status === 'active').length,
    questions: teams.reduce((sum, team) => sum + team.questions, 0),
    submitted: teams.filter((team) => team.status === 'submitted').length,
    linkIssues: teams.filter((team) => team.status === 'linkIssue').length,
  }

  return (
    <div className="professor-app">
      <ProfessorSidebar />

      <main className="professor-main">
        <header className="topbar">
          <div>
            <h1>IN-CLASS Control Tower</h1>
            <p>HCI Week 7 · Team Activity</p>
          </div>
          <div className="topbar-actions">
            <button className="status-select" type="button">
              <span className="live-dot" />
              In class
              <ChevronRight size={15} />
            </button>
            <span className="time-chip">
              <Clock3 size={17} />
              10:24 AM
            </span>
            <button className="ghost-button" type="button">
              Class Tools
              <ChevronRight size={15} />
            </button>
          </div>
        </header>

        <div className="professor-content">
          <section className="dashboard-area" aria-label="Live team status">
            <div className="section-head">
              <div>
                <h2>Live Team Status</h2>
                <p>팀별 진행, 질문, 링크 권한 문제를 먼저 확인합니다.</p>
              </div>
              <div className="control-row">
                <label>
                  <span>View</span>
                  <select value={filter} onChange={(event) => setFilter(event.target.value as TeamFilter)}>
                    <option value="all">All Teams</option>
                    <option value="active">Active</option>
                    <option value="question">Question</option>
                    <option value="inactive">Inactive</option>
                    <option value="submitted">Submitted</option>
                    <option value="linkIssue">Link Issue</option>
                  </select>
                </label>
                <label>
                  <span>Sort</span>
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                    <option value="team">Team No.</option>
                    <option value="status">Status</option>
                    <option value="activity">Action Priority</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="team-grid">
              {visibleTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>

            <QuickClassActions />
            <FeedbackPanel />
          </section>

          <aside className="insight-rail" aria-label="Class insights">
            <ActionNeededPanel />
            <ClassPulse pulse={pulse} />
            <TimelinePanel />
          </aside>
        </div>
      </main>
    </div>
  )
}

function ProfessorSidebar() {
  const items = [
    { label: 'Live Status', icon: LayoutDashboard, active: true },
    { label: 'Presentations', icon: Monitor },
    { label: 'Activity Summary', icon: BarChart3 },
    { label: 'Feedback', icon: MessageCircle },
    { label: 'Reports', icon: FileText },
  ]

  return (
    <aside className="professor-sidebar">
      <Link to="/professor" className="tower-logo" aria-label="Professor dashboard">
        <Monitor size={30} />
      </Link>
      <nav className="side-nav">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button className={item.active ? 'side-nav-item active' : 'side-nav-item'} type="button" key={item.label}>
              <Icon size={21} />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="side-nav bottom">
        <Link className="side-nav-item" to="/student">
          <Users size={21} />
          Student View
        </Link>
        <button className="side-nav-item" type="button">
          <Settings size={21} />
          Settings
        </button>
        <button className="side-nav-item danger" type="button">
          <ShieldCheck size={21} />
          End Class
        </button>
      </div>
    </aside>
  )
}

function TeamCard({ team }: { team: Team }) {
  const meta = statusMeta[team.status]
  const isProblem = team.status === 'linkIssue' || team.status === 'inactive'

  return (
    <article className={`team-card ${meta.className}`}>
      <div className="team-card-top">
        <h3>{team.name}</h3>
        <span className={`status-pill ${meta.className}`}>
          <span />
          {meta.label}
        </span>
      </div>

      <div className="artifact-row">
        <span>Artifact</span>
        <strong className={`artifact-badge ${team.artifactType}`}>{artifactLabels[team.artifactType]}</strong>
      </div>

      <div className="team-metrics">
        <Metric icon={MessageCircle} value={team.questions} label={team.questions === 1 ? 'Question' : 'Questions'} />
        <Metric icon={ClipboardList} value={team.updates} label={team.updates === 1 ? 'Update' : 'Updates'} />
        <Metric
          icon={team.status === 'submitted' ? CheckCircle2 : team.status === 'linkIssue' ? AlertTriangle : ClipboardList}
          value={team.outputLabel}
          label={team.status === 'linkIssue' ? 'Link' : 'Output'}
          alert={isProblem}
        />
      </div>

      <p className="team-summary">{team.summary}</p>

      <div className="team-card-footer">
        <span className={isProblem ? 'footer-alert' : undefined}>
          <Clock3 size={16} />
          {team.lastActivity}
        </span>
        <button className={isProblem ? 'primary-mini' : 'icon-link'} type="button">
          {isProblem ? 'Open only if needed' : <ChevronRight size={18} />}
        </button>
      </div>
    </article>
  )
}

function Metric({
  icon: Icon,
  value,
  label,
  alert,
}: {
  icon: typeof MessageCircle
  value: number | string
  label: string
  alert?: boolean
}) {
  return (
    <div className={alert ? 'metric alert' : 'metric'}>
      <Icon size={23} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function QuickClassActions() {
  const actions = [
    { label: 'Class Notice', detail: 'Send announcement', icon: Megaphone, tone: 'teal' },
    { label: 'Ask a Question', detail: 'Pose to all teams', icon: MessageCircle, tone: 'amber' },
    { label: 'Extend Time', detail: 'Add time for teams', icon: Clock3, tone: 'blue' },
    { label: 'Share Resource', detail: 'Provide material', icon: Monitor, tone: 'purple' },
  ]

  return (
    <section className="panel quick-actions">
      <h3>Quick Class Actions</h3>
      <div className="action-grid">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button className={`quick-action ${action.tone}`} type="button" key={action.label}>
              <Icon size={31} />
              <span>
                <strong>{action.label}</strong>
                <small>{action.detail}</small>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ActionNeededPanel() {
  return (
    <section className="rail-card">
      <div className="rail-title">
        <h3>Action Needed</h3>
        <span className="count-badge">{alerts.length}</span>
      </div>
      <div className="alert-list">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
      <button className="text-button" type="button">
        View all alerts
        <ChevronRight size={17} />
      </button>
    </section>
  )
}

function AlertItem({ alert }: { alert: Alert }) {
  const Icon = alert.type === 'linkIssue' ? AlertTriangle : alert.type === 'inactive' ? Clock3 : MessageCircle
  return (
    <button className="alert-item" type="button">
      <Icon size={34} />
      <span>
        <strong>{alert.title}</strong>
        <small>{alert.description}</small>
        <em>{alert.time}</em>
      </span>
      <ChevronRight size={19} />
    </button>
  )
}

function ClassPulse({ pulse }: { pulse: { active: number; questions: number; submitted: number; linkIssues: number } }) {
  const stats = [
    { label: 'Active Teams', value: pulse.active, icon: Users, tone: 'green' },
    { label: 'Questions', value: pulse.questions, icon: MessageCircle, tone: 'amber' },
    { label: 'Submitted', value: pulse.submitted, icon: FileText, tone: 'blue' },
    { label: 'Link Issues', value: pulse.linkIssues, icon: AlertTriangle, tone: 'red' },
  ]

  return (
    <section className="rail-card">
      <h3>Class Pulse</h3>
      <p>Real-time overview of the class</p>
      <div className="pulse-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`pulse-card ${stat.tone}`} key={stat.label}>
              <Icon size={25} />
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TimelinePanel() {
  return (
    <section className="rail-card">
      <h3>Class Timeline</h3>
      <p>See what is happening now</p>
      <div className="timeline-list">
        {timeline.map((item) => (
          <div className="timeline-item" key={item.id}>
            <span className={`timeline-dot ${item.tone}`} />
            <time>{item.time}</time>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <button className="text-button" type="button">
        View timeline
        <ChevronRight size={17} />
      </button>
    </section>
  )
}

function FeedbackPanel() {
  return (
    <section className="panel feedback-panel">
      <div>
        <h3>Student Feedback Summary</h3>
        <p>After-class 보고서를 다음 수업 조정 note로 연결합니다.</p>
      </div>
      <div className="feedback-grid">
        {feedbackSummary.map((item) => (
          <article className="feedback-card" key={item.label}>
            <strong>{item.count}</strong>
            <span>{item.label}</span>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function StudentWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>('both')
  const [fields, setFields] = useState({
    did: 'Grouped interview notes and affinity mapped.',
    decision: 'Focus on in-class visibility for the main concern.',
    evidence: 'See Figma board (user flow + IA updated).',
    blocked: 'Need feedback on feature priority.',
    question: 'Which metric should we prioritize for evaluation?',
  })
  const [figmaUrl, setFigmaUrl] = useState('https://www.figma.com/design/abc123/team3')
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('ok')
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'shared'>('saved')

  const artifactType: ArtifactType = mode === 'both' ? 'mixed' : mode

  const handleFieldChange = (key: keyof typeof fields) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    setFields((current) => ({ ...current, [key]: event.target.value }))
    setSaveState('idle')
  }

  const checkAccess = () => {
    setLinkStatus(figmaUrl.trim().includes('figma.com') ? 'ok' : 'denied')
    setSaveState('idle')
  }

  return (
    <div className="student-app">
      <header className="student-topbar">
        <div className="student-title">
          <Menu size={23} />
          <strong>HCI Week 7 · Team 3 Workspace</strong>
        </div>
        <div className="student-status">
          <span>
            <span className="live-dot" />
            In class
          </span>
          <span>
            <Clock3 size={17} />
            Auto saved&nbsp; 2:12 PM
          </span>
          <span className="notification">
            <Bell size={20} />
            <em>2</em>
          </span>
          <span className="avatar">SJ</span>
        </div>
      </header>

      <div className="student-layout">
        <StudentSidebar />

        <main className="workspace-main">
          <section className="workspace-head">
            <h1>Team Activity Workspace</h1>
            <p>짧은 checkpoint와 Figma 작업 링크를 공유합니다.</p>
            <div className="mode-tabs" role="tablist" aria-label="Activity input mode">
              {[
                { value: 'table', label: 'Text Table' },
                { value: 'figma', label: 'Figma Link' },
                { value: 'both', label: 'Both' },
              ].map((item) => (
                <button
                  className={mode === item.value ? 'active' : ''}
                  type="button"
                  key={item.value}
                  onClick={() => setMode(item.value as WorkspaceMode)}
                >
                  {item.label}
                  {mode === item.value && <Check size={18} />}
                </button>
              ))}
            </div>
          </section>

          <div className="workspace-grid">
            {(mode === 'table' || mode === 'both') && (
              <section className="workspace-card">
                <div className="card-title">
                  <span>1</span>
                  <div>
                    <h2>Activity Table</h2>
                    <p>Briefly share your team's progress.</p>
                  </div>
                  <strong className="saved-badge">
                    <CheckCircle2 size={16} />
                    {saveState === 'idle' ? 'Editing' : saveState === 'shared' ? 'Shared' : 'Saved'}
                  </strong>
                </div>
                <div className="activity-table">
                  <ActivityField icon={ClipboardList} label="What we did" value={fields.did} onChange={handleFieldChange('did')} />
                  <ActivityField icon={Eye} label="Decision" value={fields.decision} onChange={handleFieldChange('decision')} />
                  <ActivityField icon={FileText} label="Evidence" value={fields.evidence} onChange={handleFieldChange('evidence')} />
                  <ActivityField icon={AlertTriangle} label="Blocked on" value={fields.blocked} onChange={handleFieldChange('blocked')} />
                  <ActivityField
                    icon={MessageCircle}
                    label="Question to professor"
                    value={fields.question}
                    onChange={handleFieldChange('question')}
                  />
                </div>
              </section>
            )}

            {(mode === 'figma' || mode === 'both') && (
              <section className="workspace-card figma-card">
                <div className="card-title">
                  <span>2</span>
                  <div>
                    <h2>Figma Work Link</h2>
                    <p>Paste your Figma file link.</p>
                  </div>
                </div>
                <label className="url-field">
                  <span>Figma URL</span>
                  <input
                    value={figmaUrl}
                    onChange={(event) => {
                      setFigmaUrl(event.target.value)
                      setLinkStatus('unchecked')
                      setSaveState('idle')
                    }}
                  />
                </label>
                <div className="link-check-row">
                  <span className={`link-badge ${linkStatus}`}>{linkLabels[linkStatus]}</span>
                  <button className="outline-button" type="button" onClick={checkAccess}>
                    <RefreshCw size={17} />
                    Check access
                  </button>
                </div>
                <div className="figma-preview" aria-label="Figma preview">
                  <div className="figma-frame large" />
                  <div className="figma-frame medium" />
                  <div className="figma-frame small" />
                  <div className="figma-node a" />
                  <div className="figma-node b" />
                  <div className="figma-node c" />
                  <div className="figma-brand">F</div>
                </div>
                <div className="preview-footer">
                  <span>Last updated</span>
                  <strong>2 min ago</strong>
                  <button type="button">
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                </div>
              </section>
            )}
          </div>

          <section className="submit-strip">
            <span>
              <ShieldCheck size={22} />
              Only your team and professor can see this.
            </span>
            <div>
              <button className="outline-button" type="button" onClick={() => setSaveState('saved')}>
                <Save size={18} />
                Save draft
              </button>
              <button className="share-button" type="button" onClick={() => setSaveState('shared')}>
                <Send size={18} />
                Share Snapshot
              </button>
            </div>
          </section>
        </main>

        <aside className="professor-preview">
          <h2>Professor Preview</h2>
          <p>
            <Eye size={17} />
            This is what your professor sees.
          </p>
          <article className="preview-card">
            <div className="preview-team">
              <Users size={24} />
              <strong>Team 3</strong>
              <span className="status-pill is-active">
                <span />
                Active
              </span>
            </div>
            <div className="preview-row">
              <span>Artifact</span>
              <strong className={`artifact-badge ${artifactType}`}>{artifactLongLabels[artifactType]}</strong>
            </div>
            <hr />
            <div className="preview-summary">
              <span>Summary</span>
              <p>
                {fields.did} {fields.decision} {fields.blocked}
              </p>
            </div>
            <hr />
            <div className="preview-question">
              <span>
                <HelpCircle size={18} />
                Question to professor
              </span>
              <p>{fields.question}</p>
            </div>
            <hr />
            <div className="preview-row">
              <span>Figma link</span>
              <strong className={`link-badge ${linkStatus}`}>{linkLabels[linkStatus]}</strong>
            </div>
            <a href={figmaUrl} target="_blank" rel="noreferrer">
              {figmaUrl.replace('https://www.', '')}
              <ExternalLink size={16} />
            </a>
          </article>
          <div className="preview-note">
            <LinkIcon size={20} />
            <span>
              <strong>Professor sees summary first.</strong>
              Full Figma opens only if needed.
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function StudentSidebar() {
  const items = [
    { label: 'Today', icon: CalendarDays },
    { label: 'Team Space', icon: Users, active: true },
    { label: 'Materials', icon: FileText },
    { label: 'Questions', icon: HelpCircle, badge: 2 },
    { label: 'Report', icon: BarChart3 },
  ]

  return (
    <aside className="student-sidebar">
      <nav>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button className={item.active ? 'student-nav active' : 'student-nav'} type="button" key={item.label}>
              <Icon size={22} />
              {item.label}
              {item.badge && <span>{item.badge}</span>}
            </button>
          )
        })}
      </nav>
      <div className="timer-card">
        <span>
          <Clock3 size={21} />
          Activity time left
        </span>
        <strong>34:20</strong>
        <div className="progress-track">
          <span />
        </div>
        <p>Checkpoint closes at 3:00 PM</p>
      </div>
      <Link className="student-back-link" to="/professor">
        Professor dashboard
      </Link>
    </aside>
  )
}

function ActivityField({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof ClipboardList
  label: string
  value: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <label className="activity-field">
      <span>
        <Icon size={19} />
        {label}
      </span>
      <textarea value={value} onChange={onChange} rows={2} />
    </label>
  )
}

export default App
