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
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { alerts, classNotices, feedbackSummary, presentationQueue, teams, timeline } from './data/mockClass'
import type { Alert, ArtifactType, ClassNotice, LinkStatus, Team, TeamReadiness, TeamStatus } from './types'

type TeamFilter = 'all' | TeamStatus
type SortMode = 'team' | 'status' | 'activity'
type WorkspaceMode = 'table' | 'figma' | 'both'
type SaveState = 'idle' | 'saved' | 'shared'
type FeedbackState = 'none' | 'waiting' | 'received'
type TeamSignal = 'normal' | 'question' | 'blocked' | 'ready'

const statusMeta: Record<TeamStatus, { label: string; className: string }> = {
  active: { label: '활동 중', className: 'is-active' },
  question: { label: '질문 있음', className: 'is-question' },
  inactive: { label: '활동 없음', className: 'is-inactive' },
  submitted: { label: '제출 완료', className: 'is-submitted' },
  linkIssue: { label: '링크 문제', className: 'is-link-issue' },
}

const artifactLabels: Record<ArtifactType, string> = {
  table: '표',
  figma: '피그마',
  mixed: '혼합',
}

const artifactLongLabels: Record<ArtifactType, string> = {
  table: '활동 표',
  figma: '피그마 링크',
  mixed: '혼합 제출 (표 + 피그마)',
}

const linkLabels: Record<LinkStatus, string> = {
  ok: '접근 가능',
  denied: '접근 불가',
  unchecked: '확인 전',
}

const linkHelp: Record<LinkStatus, string> = {
  ok: '교수자가 열어볼 수 있는 링크입니다. 이제 스냅샷을 공유해도 됩니다.',
  denied: '발표 전에 팀원에게 피그마 공유 권한을 수정해 달라고 요청하세요.',
  unchecked: '수업 흐름이 끊기지 않도록 공유 전에 접근 권한을 확인하세요.',
}

const saveLabels: Record<SaveState, string> = {
  idle: '작성 중',
  saved: '저장됨',
  shared: '스냅샷 공유됨',
}

const studentClassBrief = {
  title: '핵심 기능 우선순위 정하기',
  description: '사전 인터뷰와 팀별 논의 내용을 바탕으로 발표 전에 핵심 근거와 막힌 지점을 정리합니다.',
  prompt: '막힌 지점, 결정 근거, 교수님께 확인받고 싶은 질문을 먼저 공유해주세요.',
  meta: [
    { label: '현재 단계', value: '팀별 활동 정리' },
    { label: '제출 마감', value: '오후 3:00' },
    { label: '공유 대상', value: '교수자' },
  ],
}

const studentTodos = [
  { label: '핵심 불편함 3개로 묶기', done: true },
  { label: '근거 자료 위치 적기', done: true },
  { label: '우선순위 질문 남기기', done: true },
  { label: '피그마 접근 권한 확인', done: true },
]

const studentNotices = [
  { label: '교수자 요청', detail: '요약은 2-3문장 안에서 먼저 읽히게 정리합니다.' },
  { label: '공유 전 확인', detail: '피그마 링크는 교수자 계정으로 열 수 있어야 합니다.' },
]

const feedbackCopy: Record<FeedbackState, { title: string; detail: string }> = {
  none: {
    title: '아직 교수자 피드백이 없습니다.',
    detail: '스냅샷을 공유하면 교수자가 요약과 질문을 먼저 확인합니다.',
  },
  waiting: {
    title: '교수자가 스냅샷을 확인 중입니다.',
    detail: '지금은 전체 피그마를 열기보다 요약과 질문을 먼저 보는 단계입니다.',
  },
  received: {
    title: '피드백이 도착했습니다.',
    detail: '링크 문제 알림을 가장 먼저 두고, 활동 없음은 5분 이상 멈췄을 때 강조하는 방향으로 정리해보세요.',
  },
}

const signalOptions: Array<{
  value: TeamSignal
  label: string
  detail: string
  previewLabel: string
  className: string
}> = [
  {
    value: 'normal',
    label: '정상 진행',
    detail: '팀 논의가 계속 이어지고 있습니다.',
    previewLabel: '활동 중',
    className: 'normal',
  },
  {
    value: 'question',
    label: '질문 있음',
    detail: '교수자 확인이 필요한 질문이 있습니다.',
    previewLabel: '질문 있음',
    className: 'question',
  },
  {
    value: 'blocked',
    label: '도움 필요',
    detail: '우선순위나 근거 정리에 막힌 지점이 있습니다.',
    previewLabel: '도움 필요',
    className: 'blocked',
  },
  {
    value: 'ready',
    label: '발표 준비',
    detail: '요약과 근거를 공유할 준비가 되었습니다.',
    previewLabel: '발표 준비',
    className: 'ready',
  },
]

const readinessMeta: Record<TeamReadiness, { label: string; className: string }> = {
  ready: { label: '발표 가능', className: 'ready' },
  blocked: { label: '확인 필요', className: 'blocked' },
  inProgress: { label: '진행 중', className: 'in-progress' },
  waiting: { label: '피드백 대기', className: 'waiting' },
}

function isValidFigmaFileUrl(url: string) {
  const normalizedUrl = url.trim().toLowerCase()
  return normalizedUrl.includes('figma.com/design') || normalizedUrl.includes('figma.com/file')
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
  const [selectedTeamId, setSelectedTeamId] = useState(3)
  const [privateNotes, setPrivateNotes] = useState<Record<number, string>>({
    3: '발표 전 링크 권한을 먼저 확인시키기',
  })
  const [isNoticeOpen, setIsNoticeOpen] = useState(false)
  const [selectedNoticeId, setSelectedNoticeId] = useState(classNotices[0].id)

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
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0]
  const selectedNotice = classNotices.find((notice) => notice.id === selectedNoticeId) ?? classNotices[0]

  return (
    <div className="professor-app">
      <ProfessorSidebar />

      <main className="professor-main">
        <header className="topbar">
          <div>
            <h1>수업 중 컨트롤 타워</h1>
            <p>HCI 7주차 · 팀 활동</p>
          </div>
          <div className="topbar-actions">
            <button className="status-select" type="button">
              <span className="live-dot" />
              수업 중
              <ChevronRight size={15} />
            </button>
            <span className="time-chip">
              <Clock3 size={17} />
              오전 10:24
            </span>
            <button className="ghost-button" type="button">
              수업 도구
              <ChevronRight size={15} />
            </button>
          </div>
        </header>

        <div className="professor-content">
          <section className="dashboard-area" aria-label="실시간 팀 상태">
            <div className="section-head">
              <div>
                <h2>실시간 팀 상태</h2>
                <p>팀별 진행, 질문, 링크 권한 문제를 먼저 확인합니다.</p>
              </div>
              <div className="control-row">
                <label>
                  <span>보기</span>
                  <select value={filter} onChange={(event) => setFilter(event.target.value as TeamFilter)}>
                    <option value="all">전체 팀</option>
                    <option value="active">활동 중</option>
                    <option value="question">질문 있음</option>
                    <option value="inactive">활동 없음</option>
                    <option value="submitted">제출 완료</option>
                    <option value="linkIssue">링크 문제</option>
                  </select>
                </label>
                <label>
                  <span>정렬</span>
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                    <option value="team">팀 번호</option>
                    <option value="status">상태</option>
                    <option value="activity">확인 우선순위</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="team-grid">
              {visibleTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  selected={team.id === selectedTeam.id}
                  onSelect={() => setSelectedTeamId(team.id)}
                />
              ))}
            </div>

            <TeamSnapshotPanel
              team={selectedTeam}
              note={privateNotes[selectedTeam.id] ?? ''}
              onNoteChange={(value) => setPrivateNotes((current) => ({ ...current, [selectedTeam.id]: value }))}
            />

            <QuickClassActions onNoticeOpen={() => setIsNoticeOpen((current) => !current)} />
            {isNoticeOpen && (
              <NoticeRecommendationPanel
                notices={classNotices}
                selectedNotice={selectedNotice}
                selectedNoticeId={selectedNoticeId}
                onSelectNotice={setSelectedNoticeId}
              />
            )}
            <FeedbackPanel />
          </section>

          <aside className="insight-rail" aria-label="수업 인사이트">
            <ActionNeededPanel />
            <PresentationQueuePanel selectedTeamId={selectedTeam.id} onSelectTeam={setSelectedTeamId} />
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
    { label: '실시간 상태', icon: LayoutDashboard, active: true },
    { label: '발표 관리', icon: Monitor },
    { label: '활동 요약', icon: BarChart3 },
    { label: '피드백', icon: MessageCircle },
    { label: '보고서', icon: FileText },
  ]

  return (
    <aside className="professor-sidebar">
      <Link to="/professor" className="tower-logo" aria-label="교수자 대시보드">
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
          학생 화면
        </Link>
        <button className="side-nav-item" type="button">
          <Settings size={21} />
          설정
        </button>
        <button className="side-nav-item danger" type="button">
          <ShieldCheck size={21} />
          수업 종료
        </button>
      </div>
    </aside>
  )
}

function TeamCard({ team, selected, onSelect }: { team: Team; selected: boolean; onSelect: () => void }) {
  const meta = statusMeta[team.status]
  const isProblem = team.status === 'linkIssue' || team.status === 'inactive'

  return (
    <article
      className={`team-card ${meta.className}${selected ? ' selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="team-card-top">
        <h3>{team.name}</h3>
        <span className={`status-pill ${meta.className}`}>
          <span />
          {meta.label}
        </span>
      </div>

      <div className="artifact-row">
        <span>산출물</span>
        <strong className={`artifact-badge ${team.artifactType}`}>{artifactLabels[team.artifactType]}</strong>
      </div>

      <div className="team-metrics">
        <Metric icon={MessageCircle} value={team.questions} label="질문" />
        <Metric icon={ClipboardList} value={team.updates} label="업데이트" />
        <Metric
          icon={team.status === 'submitted' ? CheckCircle2 : team.status === 'linkIssue' ? AlertTriangle : ClipboardList}
          value={team.outputLabel}
          label={team.status === 'linkIssue' ? '링크' : '산출물'}
          alert={isProblem}
        />
      </div>

      <p className="team-summary">{team.summary}</p>

      <div className="team-card-footer">
        <span className={isProblem ? 'footer-alert' : undefined}>
          <Clock3 size={16} />
          {team.lastActivity}
        </span>
        <button
          className={isProblem ? 'primary-mini' : 'icon-link'}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
          }}
        >
          {isProblem ? '필요할 때 열기' : <ChevronRight size={18} />}
        </button>
      </div>
    </article>
  )
}

function TeamSnapshotPanel({
  team,
  note,
  onNoteChange,
}: {
  team: Team
  note: string
  onNoteChange: (value: string) => void
}) {
  const meta = statusMeta[team.status]
  const readiness = readinessMeta[team.readiness]

  return (
    <section className="panel team-snapshot-panel" aria-label="팀 활동 스냅샷">
      <div className="snapshot-header">
        <div>
          <span className="panel-kicker">Team Activity Snapshot</span>
          <h3>{team.name} 활동 스냅샷</h3>
          <p>요약을 먼저 보고, 필요한 팀만 링크나 산출물을 깊게 확인합니다.</p>
        </div>
        <div className="snapshot-badges">
          <span className={`status-pill ${meta.className}`}>
            <span />
            {meta.label}
          </span>
          <span className={`readiness-pill ${readiness.className}`}>{readiness.label}</span>
        </div>
      </div>

      <div className="snapshot-grid">
        <div className="snapshot-block wide">
          <span>활동 요약</span>
          <p>{team.summary}</p>
        </div>
        <div className="snapshot-block">
          <span>링크 권한</span>
          <strong className={`link-badge ${team.linkStatus}`}>{linkLabels[team.linkStatus]}</strong>
        </div>
        <div className="snapshot-block">
          <span>최근 활동</span>
          <strong>{team.lastActivity}</strong>
        </div>
        <div className="snapshot-block">
          <span>질문</span>
          <p>{team.question ?? '현재 등록된 질문이 없습니다.'}</p>
        </div>
        <div className="snapshot-block">
          <span>교수 피드백</span>
          <p>{team.professorFeedback}</p>
        </div>
      </div>

      <div className="snapshot-check-row">
        {team.checklist.map((item) => (
          <span className={item.done ? 'done' : 'pending'} key={item.label}>
            {item.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
            {item.label}
          </span>
        ))}
      </div>

      <label className="private-note-field">
        <span>
          <ShieldCheck size={18} />
          교수자 private note
        </span>
        <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={3} />
      </label>
    </section>
  )
}

function PresentationQueuePanel({
  selectedTeamId,
  onSelectTeam,
}: {
  selectedTeamId: number
  onSelectTeam: (teamId: number) => void
}) {
  return (
    <section className="rail-card presentation-queue">
      <h3>발표 Queue</h3>
      <p>링크 문제 팀을 먼저 걸러 수업 흐름을 끊기지 않게 합니다.</p>
      <div className="queue-list">
        {presentationQueue.map((item) => {
          const team = teams.find((candidate) => candidate.id === item.teamId)
          if (!team) return null
          const readiness = readinessMeta[item.status]
          return (
            <button
              className={selectedTeamId === item.teamId ? 'queue-item selected' : 'queue-item'}
              type="button"
              key={item.teamId}
              onClick={() => onSelectTeam(item.teamId)}
            >
              <span className={`queue-status ${readiness.className}`}>{item.label}</span>
              <strong>{team.name}</strong>
              <small>{item.detail}</small>
              <ChevronRight size={17} />
            </button>
          )
        })}
      </div>
    </section>
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

function QuickClassActions({ onNoticeOpen }: { onNoticeOpen: () => void }) {
  const actions = [
    { label: '전체 공지', detail: '팀 전체에 안내 보내기', icon: Megaphone, tone: 'teal', onClick: onNoticeOpen },
    { label: '질문 던지기', detail: '모든 팀에 질문하기', icon: MessageCircle, tone: 'amber' },
    { label: '시간 연장', detail: '활동 시간 추가하기', icon: Clock3, tone: 'blue' },
    { label: '자료 공유', detail: '수업 자료 제공하기', icon: Monitor, tone: 'purple' },
  ]

  return (
    <section className="panel quick-actions">
      <h3>수업 중 빠른 조치</h3>
      <div className="action-grid">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button className={`quick-action ${action.tone}`} type="button" key={action.label} onClick={action.onClick}>
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

function NoticeRecommendationPanel({
  notices,
  selectedNotice,
  selectedNoticeId,
  onSelectNotice,
}: {
  notices: ClassNotice[]
  selectedNotice: ClassNotice
  selectedNoticeId: number
  onSelectNotice: (noticeId: number) => void
}) {
  return (
    <section className="panel notice-recommendation-panel" aria-label="공지 추천">
      <div className="notice-recommendation-head">
        <div>
          <span className="panel-kicker">Recommended Notice</span>
          <h3>수업 전체 공지 추천</h3>
          <p>교수자가 반복해서 말해야 하는 권한 확인과 유사 질문을 바로 공지로 바꿉니다.</p>
        </div>
        <span className={`notice-tone ${selectedNotice.tone}`}>{selectedNotice.target}</span>
      </div>
      <div className="notice-selector">
        {notices.map((notice) => (
          <button
            className={selectedNoticeId === notice.id ? `notice-option active ${notice.tone}` : `notice-option ${notice.tone}`}
            type="button"
            key={notice.id}
            onClick={() => onSelectNotice(notice.id)}
          >
            <strong>{notice.title}</strong>
            <span>{notice.target}</span>
          </button>
        ))}
      </div>
      <div className="notice-preview">
        <span>공지 미리보기</span>
        <strong>{selectedNotice.title}</strong>
        <p>{selectedNotice.body}</p>
      </div>
    </section>
  )
}

function ActionNeededPanel() {
  return (
    <section className="rail-card">
      <div className="rail-title">
        <h3>확인 필요</h3>
        <span className="count-badge">{alerts.length}</span>
      </div>
      <div className="alert-list">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
      <button className="text-button" type="button">
        모든 알림 보기
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
    { label: '활동 중인 팀', value: pulse.active, icon: Users, tone: 'green' },
    { label: '질문 수', value: pulse.questions, icon: MessageCircle, tone: 'amber' },
    { label: '제출 완료', value: pulse.submitted, icon: FileText, tone: 'blue' },
    { label: '링크 문제', value: pulse.linkIssues, icon: AlertTriangle, tone: 'red' },
  ]

  return (
    <section className="rail-card">
      <h3>수업 현황</h3>
      <p>지금 수업에서 먼저 봐야 할 상태입니다.</p>
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
      <h3>수업 타임라인</h3>
      <p>방금 일어난 팀 활동을 확인합니다.</p>
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
        타임라인 보기
        <ChevronRight size={17} />
      </button>
    </section>
  )
}

function FeedbackPanel() {
  return (
    <section className="panel feedback-panel">
      <div>
        <h3>학생 피드백 요약</h3>
        <p>수업 후 보고서를 다음 수업 조정 노트로 연결합니다.</p>
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
    did: '인터뷰 내용을 세 가지 핵심 불편함으로 묶었습니다.',
    decision: '새로운 학습관리시스템 기능보다 수업 중 팀 상태 가시성을 우선하기로 했습니다.',
    evidence: '피그마 보드에 사용자 흐름, 링크 확인 흐름, 스냅샷 화면을 정리했습니다.',
    blocked: '링크 문제와 활동 없음 중 어떤 알림을 먼저 보여줄지 확인이 필요합니다.',
    question: '링크 문제와 활동 없음 중 어떤 상황을 더 높은 우선순위로 봐야 할까요?',
  })
  const [figmaUrl, setFigmaUrl] = useState('')
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('unchecked')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSharedAt, setLastSharedAt] = useState('아직 공유 전')
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('none')
  const [teamSignal, setTeamSignal] = useState<TeamSignal>('normal')
  const [lastSignalAt, setLastSignalAt] = useState('방금 전송됨')
  const [isFinalized, setIsFinalized] = useState(false)
  const [lastFinalizedAt, setLastFinalizedAt] = useState('마무리 전')

  const artifactType: ArtifactType = mode === 'both' ? 'mixed' : mode
  const requiresFigma = mode !== 'table'
  const hasFigmaUrl = figmaUrl.trim().length > 0
  const canRenderFigmaEmbed = hasFigmaUrl && isValidFigmaFileUrl(figmaUrl)
  const figmaEmbedUrl = canRenderFigmaEmbed
    ? `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(figmaUrl.trim())}`
    : ''
  const canShare = !requiresFigma || (hasFigmaUrl && linkStatus === 'ok')
  const snapshotShared = saveState === 'shared'
  const canFinalize = snapshotShared && feedbackState === 'received'
  const selectedSignal = signalOptions.find((option) => option.value === teamSignal) ?? signalOptions[0]
  const professorSummary = useMemo(
    () => [fields.did, fields.decision, fields.blocked].filter(Boolean).join(' '),
    [fields.blocked, fields.decision, fields.did],
  )
  const currentStages = [
    { label: '사전학습 확인', status: '완료', done: true },
    { label: '팀별 논의', status: snapshotShared ? '정리 완료' : '진행 중', done: snapshotShared, active: !snapshotShared },
    { label: '스냅샷 공유', status: snapshotShared ? '완료' : '준비 중', done: snapshotShared, active: saveState === 'saved' && !snapshotShared },
    {
      label: '교수자 피드백',
      status: feedbackState === 'received' ? '도착' : snapshotShared ? '확인 중' : '다음',
      done: feedbackState === 'received',
      active: feedbackState === 'waiting',
    },
  ]
  const checkpointItems = [
    {
      label: mode === 'figma' ? '피그마 링크 입력됨' : '활동 표 작성됨',
      done: mode === 'figma' ? figmaUrl.trim().length > 0 : fields.did.trim().length > 0,
    },
    { label: '피그마 접근 권한 확인됨', done: !requiresFigma || linkStatus === 'ok' },
    { label: '교수님께 질문 준비됨', done: fields.question.trim().length > 0 },
    { label: '발표 준비 완료', done: isFinalized },
  ]
  const activityFeed = [
    {
      label: '활동 표 저장',
      detail: saveState === 'idle' ? '수정 중입니다.' : '현재 입력 내용이 저장되었습니다.',
      done: saveState !== 'idle',
    },
    {
      label: '링크 권한 확인',
      detail: requiresFigma ? linkLabels[linkStatus] : '활동 표만 공유합니다.',
      done: canShare,
    },
    {
      label: '팀 상태 신호',
      detail: `${selectedSignal.label} · ${lastSignalAt}`,
      done: true,
    },
    {
      label: '스냅샷 공유',
      detail: lastSharedAt,
      done: snapshotShared,
    },
    {
      label: '교수자 피드백',
      detail: feedbackState === 'received' ? '피드백 도착' : feedbackState === 'waiting' ? '확인 중' : '공유 후 표시됩니다.',
      done: feedbackState === 'received',
    },
    {
      label: '발표 준비 완료',
      detail: lastFinalizedAt,
      done: isFinalized,
    },
  ]
  const completionCopy = isFinalized
    ? {
        title: '발표 준비가 완료되었습니다.',
        detail: '최종 상태가 교수자 화면에 반영되어 발표 순서를 기다리는 상태입니다.',
      }
    : canFinalize
      ? {
          title: '마지막 확인만 남았습니다.',
          detail: '교수자 피드백을 반영한 뒤 발표 준비 상태로 마무리할 수 있습니다.',
        }
      : {
          title: '아직 마무리 전입니다.',
          detail: '스냅샷 공유와 교수자 피드백 확인이 끝나면 발표 준비를 완료할 수 있습니다.',
        }

  const handleFieldChange = (key: keyof typeof fields) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    setFields((current) => ({ ...current, [key]: event.target.value }))
    if (snapshotShared) {
      setLastSharedAt('수정 후 다시 공유 필요')
    }
    setSaveState('idle')
    setFeedbackState('none')
    setIsFinalized(false)
    setLastFinalizedAt('수정 후 다시 완료 필요')
  }

  const changeMode = (nextMode: WorkspaceMode) => {
    setMode(nextMode)
    if (snapshotShared) {
      setLastSharedAt('제출 방식 변경 후 다시 공유 필요')
      setSaveState('idle')
      setFeedbackState('none')
      setIsFinalized(false)
      setLastFinalizedAt('제출 방식 변경 후 다시 완료 필요')
    }
  }

  const checkAccess = () => {
    const normalizedUrl = figmaUrl.trim().toLowerCase()
    if (!normalizedUrl) {
      setLinkStatus('unchecked')
      setSaveState('idle')
      setIsFinalized(false)
      setLastFinalizedAt('링크 입력 후 다시 확인 필요')
      return
    }
    setLinkStatus(isValidFigmaFileUrl(normalizedUrl) ? 'ok' : 'denied')
    setSaveState('idle')
    setIsFinalized(false)
    setLastFinalizedAt('권한 확인 후 다시 공유 필요')
  }

  const saveDraft = () => {
    setSaveState('saved')
  }

  const sendTeamSignal = (nextSignal: TeamSignal) => {
    setTeamSignal(nextSignal)
    setLastSignalAt('방금 전송됨')
    if (isFinalized && nextSignal !== 'ready') {
      setIsFinalized(false)
      setLastFinalizedAt('팀 신호 변경 후 다시 완료 필요')
    }
  }

  const shareSnapshot = () => {
    if (!canShare) {
      setLinkStatus('denied')
      setSaveState('idle')
      return
    }
    setSaveState('shared')
    setLastSharedAt('방금 공유됨')
    setFeedbackState('waiting')
    setIsFinalized(false)
    setLastFinalizedAt('피드백 확인 전')
  }

  const receiveProfessorFeedback = () => {
    if (!snapshotShared) return
    setFeedbackState('received')
    setLastFinalizedAt('마무리 대기')
  }

  const finalizePresentation = () => {
    if (!canFinalize) return
    setTeamSignal('ready')
    setLastSignalAt('발표 준비 완료')
    setIsFinalized(true)
    setLastFinalizedAt('방금 완료됨')
  }

  return (
    <div className="student-app">
      <header className="student-topbar">
        <div className="student-title">
          <Menu size={23} />
          <strong>HCI 7주차 · 3팀 활동 공간</strong>
        </div>
        <div className="student-status">
          <span>
            <span className="live-dot" />
            수업 중
          </span>
          <span>
            <Clock3 size={17} />
            {saveLabels[saveState]}
          </span>
          <span className="notification">
            <Bell size={20} />
            <em>{feedbackState === 'received' ? 3 : 2}</em>
          </span>
          <span className="avatar">3팀</span>
        </div>
      </header>

      <div className="student-layout">
        <StudentSidebar />

        <main className="workspace-main">
          <section className="workspace-head">
            <h1>팀 활동 공간</h1>
            <p>교수자가 팀 상태를 먼저 파악할 수 있도록 10-20초 안에 읽히는 체크포인트를 공유합니다.</p>
            <div className="mode-tabs" role="tablist" aria-label="활동 입력 방식">
              {[
                { value: 'table', label: '활동 표' },
                { value: 'figma', label: '피그마 링크' },
                { value: 'both', label: '함께 제출' },
              ].map((item) => (
                <button
                  className={mode === item.value ? 'active' : ''}
                  type="button"
                  key={item.value}
                  onClick={() => changeMode(item.value as WorkspaceMode)}
                >
                  {item.label}
                  {mode === item.value && <Check size={18} />}
                </button>
              ))}
            </div>
          </section>

          <section className="class-brief" aria-label="오늘 수업 안내">
            <div>
              <span className="brief-kicker">오늘 수업</span>
              <h2>{studentClassBrief.title}</h2>
              <p>{studentClassBrief.description}</p>
            </div>
            <div className="teacher-prompt">
              <span>교수자 요청</span>
              <p>{studentClassBrief.prompt}</p>
            </div>
            <div className="brief-meta">
              {studentClassBrief.meta.map((item) => (
                <span key={item.label}>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </span>
              ))}
            </div>
          </section>

          <div className="stage-strip" aria-label="수업 진행 단계">
            {currentStages.map((stage) => (
              <span className={stage.active ? 'stage-step active' : stage.done ? 'stage-step done' : 'stage-step'} key={stage.label}>
                <CheckCircle2 size={17} />
                <strong>{stage.label}</strong>
                <small>{stage.status}</small>
              </span>
            ))}
          </div>

          <section className="team-signal-panel" aria-label="팀 상태 신호">
            <div className={`signal-summary ${selectedSignal.className}`}>
              <span>현재 팀 신호</span>
              <strong>{selectedSignal.label}</strong>
              <p>{selectedSignal.detail}</p>
              <small>{lastSignalAt}</small>
            </div>
            <div className="signal-actions">
              {signalOptions.map((option) => (
                <button
                  className={teamSignal === option.value ? `signal-button active ${option.className}` : `signal-button ${option.className}`}
                  type="button"
                  key={option.value}
                  onClick={() => sendTeamSignal(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>
          </section>

          <div className={`workspace-grid ${mode === 'both' ? 'two-column' : 'single-column'}`}>
            {(mode === 'table' || mode === 'both') && (
              <section className="workspace-card">
                <div className="card-title">
                  <span>1</span>
                  <div>
                    <h2>활동 표</h2>
                    <p>수업 중 바로 읽을 수 있게 짧게 정리합니다.</p>
                  </div>
                  <strong className={`saved-badge ${saveState}`}>
                    <CheckCircle2 size={16} />
                    {saveLabels[saveState]}
                  </strong>
                </div>
                <div className="activity-table">
                  <ActivityField icon={ClipboardList} label="오늘 한 일" value={fields.did} onChange={handleFieldChange('did')} />
                  <ActivityField icon={Eye} label="결정한 내용" value={fields.decision} onChange={handleFieldChange('decision')} />
                  <ActivityField icon={FileText} label="근거 자료" value={fields.evidence} onChange={handleFieldChange('evidence')} />
                  <ActivityField icon={AlertTriangle} label="막힌 점" value={fields.blocked} onChange={handleFieldChange('blocked')} />
                  <ActivityField
                    icon={MessageCircle}
                    label="교수님께 질문"
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
                    <h2>피그마 작업 링크</h2>
                    <p>공유 전에 교수자가 열 수 있는 링크인지 확인합니다.</p>
                  </div>
                </div>
                <label className="url-field">
                  <span>피그마 URL</span>
                  <input
                    value={figmaUrl}
                    placeholder="https://www.figma.com/design/..."
                    onChange={(event) => {
                      setFigmaUrl(event.target.value)
                      setLinkStatus('unchecked')
                      if (snapshotShared) {
                        setLastSharedAt('링크 수정 후 다시 공유 필요')
                      }
                      setSaveState('idle')
                      setFeedbackState('none')
                      setIsFinalized(false)
                      setLastFinalizedAt('링크 수정 후 다시 완료 필요')
                    }}
                  />
                </label>
                <div className="link-check-row">
                  <span className={`link-badge ${linkStatus}`}>{linkLabels[linkStatus]}</span>
                  <button className="outline-button" type="button" onClick={checkAccess}>
                    <RefreshCw size={17} />
                    권한 확인
                  </button>
                </div>
                <p className={`link-help ${linkStatus}`}>
                  {linkStatus === 'denied' && <AlertTriangle size={17} />}
                  {linkStatus === 'ok' && <CheckCircle2 size={17} />}
                  {linkStatus === 'unchecked' && <ShieldCheck size={17} />}
                  {linkHelp[linkStatus]}
                </p>
                {hasFigmaUrl ? (
                  <>
                    {canRenderFigmaEmbed ? (
                      <div className="figma-preview" aria-label="피그마 미리보기">
                        <iframe title="피그마 작업 미리보기" src={figmaEmbedUrl} allowFullScreen />
                      </div>
                    ) : (
                      <div className="figma-empty-state denied">
                        <AlertTriangle size={22} />
                        <strong>피그마 파일 링크를 확인해 주세요.</strong>
                        <p>design 또는 file 주소를 입력해야 미리보기를 열 수 있습니다.</p>
                      </div>
                    )}
                    {canRenderFigmaEmbed && (
                      <div className="preview-footer">
                        <span>최근 수정</span>
                        <strong>2분 전</strong>
                        <button type="button" onClick={checkAccess}>
                          <RefreshCw size={16} />
                          새로고침
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="figma-empty-state">
                    <LinkIcon size={22} />
                    <strong>피그마 링크를 입력해 주세요.</strong>
                    <p>링크를 입력하고 권한 확인을 누르면 공유 가능 상태로 바뀝니다.</p>
                  </div>
                )}
              </section>
            )}
          </div>

          <section className="submit-strip">
            <span>
              <ShieldCheck size={22} />
              {canShare ? '교수자에게 공유할 준비가 되었습니다.' : '공유하기 전에 링크 접근 권한을 확인하세요.'}
            </span>
            <div>
              <button className="outline-button" type="button" onClick={saveDraft}>
                <Save size={18} />
                저장
              </button>
              <button className="share-button" type="button" onClick={shareSnapshot} disabled={!canShare}>
                <Send size={18} />
                스냅샷 공유
              </button>
            </div>
          </section>

          <section className="activity-feed-panel" aria-label="공유 진행 상황">
            <div className="feed-panel-head">
              <div>
                <h2>공유 진행 상황</h2>
                <p>학생이 스냅샷을 보낸 뒤 교수자 확인 상태까지 이어지는 흐름입니다.</p>
              </div>
              <button className="outline-button" type="button" onClick={receiveProfessorFeedback} disabled={!snapshotShared}>
                <MessageCircle size={17} />
                피드백 확인
              </button>
            </div>
            <div className="activity-feed">
              {activityFeed.map((item) => (
                <span className={item.done ? 'feed-item done' : 'feed-item'} key={item.label}>
                  {item.done ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              ))}
            </div>
          </section>

          <section className={isFinalized ? 'completion-panel complete' : canFinalize ? 'completion-panel ready' : 'completion-panel'}>
            <div>
              <span className="completion-label">
                <CheckCircle2 size={18} />
                마무리 상태
              </span>
              <h2>{completionCopy.title}</h2>
              <p>{completionCopy.detail}</p>
            </div>
            <button className="share-button" type="button" onClick={finalizePresentation} disabled={!canFinalize || isFinalized}>
              <CheckCircle2 size={18} />
              {isFinalized ? '완료됨' : '발표 준비 완료'}
            </button>
          </section>
        </main>

        <aside className="professor-preview">
          <h2>교수자 화면 미리보기</h2>
          <p>
            <Eye size={17} />
            팀 활동 스냅샷
          </p>
          <div className="snapshot-state-row">
            <span className={`snapshot-state ${saveState}`}>{saveLabels[saveState]}</span>
            <span>{requiresFigma ? linkLabels[linkStatus] : '링크 없음'}</span>
            <span>{lastSharedAt}</span>
            <span>{isFinalized ? '발표 준비 완료' : '마무리 전'}</span>
          </div>
          <article className="preview-card">
            <div className="preview-team">
              <Users size={24} />
              <strong>3팀</strong>
              <span className={`status-pill signal-pill ${selectedSignal.className}`}>
                <span />
                {selectedSignal.previewLabel}
              </span>
            </div>
            <div className="preview-row">
              <span>팀 신호</span>
              <strong>{selectedSignal.label}</strong>
            </div>
            <hr />
            <div className="preview-row">
              <span>산출물</span>
              <strong className={`artifact-badge ${artifactType}`}>{artifactLongLabels[artifactType]}</strong>
            </div>
            <hr />
            <div className="preview-summary">
              <span>요약</span>
              <p>{professorSummary}</p>
            </div>
            <hr />
            <div className="preview-question">
              <span>
                <HelpCircle size={18} />
                교수님께 질문
              </span>
              <p>{fields.question}</p>
            </div>
            <hr />
            <div className="preview-row">
              <span>피그마 링크</span>
              <strong className={`link-badge ${linkStatus}`}>{linkLabels[linkStatus]}</strong>
            </div>
            {hasFigmaUrl ? (
              <a href={figmaUrl} target="_blank" rel="noreferrer">
                {figmaUrl.replace('https://www.', '')}
                <ExternalLink size={16} />
              </a>
            ) : (
              <span className="preview-empty-link">피그마 링크를 입력하면 여기에 표시됩니다.</span>
            )}
          </article>
          <div className="preview-note">
            <LinkIcon size={20} />
            <span>
              <strong>교수자는 요약을 먼저 봅니다.</strong>
              피그마 전체 화면은 필요할 때만 열어봅니다.
            </span>
          </div>
          <div className="snapshot-checklist">
            {checkpointItems.map((item) => (
              <span className={item.done ? 'done' : 'pending'} key={item.label}>
                {item.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                {item.label}
              </span>
            ))}
          </div>
          <div className={`professor-feedback ${feedbackState}`}>
            <span className="feedback-title">
              <MessageCircle size={18} />
              교수자 피드백
            </span>
            <strong>{feedbackCopy[feedbackState].title}</strong>
            <p>{feedbackCopy[feedbackState].detail}</p>
            {feedbackState === 'waiting' && (
              <button className="outline-button" type="button" onClick={receiveProfessorFeedback}>
                <RefreshCw size={17} />
                피드백 확인
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function StudentSidebar() {
  const items = [
    { label: '오늘 수업', icon: CalendarDays },
    { label: '팀 공간', icon: Users, active: true },
    { label: '수업 자료', icon: FileText },
    { label: '질문', icon: HelpCircle, badge: 2 },
    { label: '보고서', icon: BarChart3 },
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
      <div className="sidebar-panel">
        <span className="sidebar-panel-title">
          <CheckCircle2 size={19} />
          팀 체크리스트
        </span>
        <div className="todo-list">
          {studentTodos.map((todo) => (
            <span className={todo.done ? 'todo-item done' : 'todo-item'} key={todo.label}>
              {todo.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
              {todo.label}
            </span>
          ))}
        </div>
      </div>
      <div className="sidebar-panel">
        <span className="sidebar-panel-title">
          <Bell size={19} />
          수업 알림
        </span>
        <div className="notice-list">
          {studentNotices.map((notice) => (
            <span className="notice-item" key={notice.label}>
              <strong>{notice.label}</strong>
              <small>{notice.detail}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="timer-card">
        <span>
          <Clock3 size={21} />
          남은 활동 시간
        </span>
        <strong>34:20</strong>
        <div className="progress-track">
          <span />
        </div>
        <p>체크포인트는 오후 3:00에 닫힙니다.</p>
      </div>
      <Link className="student-back-link" to="/professor">
        교수자 대시보드
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
      <textarea value={value} onChange={onChange} rows={3} />
    </label>
  )
}

export default App
