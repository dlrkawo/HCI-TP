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
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { ChangeEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { alerts, classNotices, feedbackSummary, presentationQueue, teams, timeline } from './data/mockClass'
import type {
  Alert,
  ArtifactType,
  ClassFormat,
  ClassNotice,
  ClassWeek,
  FormatPhase,
  LinkStatus,
  SubmissionType,
  TableRowRole,
  TableTemplate,
  Team,
  TeamReadiness,
  TeamStatus,
} from './types'

type TeamFilter = 'all' | TeamStatus
type SortMode = 'team' | 'status' | 'activity'
type WorkspaceMode = 'table' | 'figma' | 'both'
type SaveState = 'idle' | 'saved' | 'shared'
type FeedbackState = 'none' | 'waiting' | 'received'
type TeamSignal = 'normal' | 'question' | 'blocked' | 'ready'
type ProfessorView = 'dashboard' | 'classCreation' | 'reports'
type StudentView = 'workspace' | 'report'
type DemoFlowStep = {
  label: string
  detail: string
  done: boolean
  active?: boolean
}
type ReportStatus = 'draft' | 'submitted'
type ReportFieldKey =
  | 'week'
  | 'course'
  | 'department'
  | 'professor'
  | 'teamName'
  | 'members'
  | 'beforeSummary'
  | 'beforeCheck'
  | 'inClassDate'
  | 'attendees'
  | 'topic'
  | 'activityContent'
  | 'discussion'
  | 'nextPlan'
  | 'roleDivision'
  | 'schedule'
  | 'professorFeedback'
  | 'presentation'
  | 'artifactShare'
  | 'learned'
  | 'felt'
  | 'suggestion'
type ReportFields = Record<ReportFieldKey, string>
type SubmittedReport = {
  id: string
  week: string
  title: string
  submittedAt: string
  fields: ReportFields
}
type ReportListItem = {
  id: string
  week: string
  title: string
  submittedAt: string
  status: ReportStatus
  readOnly: boolean
}

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

const reportRequiredFields: ReportFieldKey[] = [
  'week',
  'course',
  'department',
  'professor',
  'teamName',
  'members',
  'beforeSummary',
  'beforeCheck',
  'inClassDate',
  'attendees',
  'topic',
  'activityContent',
  'discussion',
  'nextPlan',
  'roleDivision',
  'schedule',
  'presentation',
  'artifactShare',
  'learned',
  'felt',
]

const reportSections: Array<{
  eyebrow: string
  title: string
  description: string
  fields: Array<{
    key: ReportFieldKey
    label: string
    multiline?: boolean
    note?: string
  }>
}> = [
  {
    eyebrow: '1. Before Class',
    title: '사전학습',
    description: '수업 전에 확인한 학습 내용과 점검 활동을 정리합니다.',
    fields: [
      { key: 'beforeSummary', label: '사전학습내용 요약', multiline: true },
      { key: 'beforeCheck', label: '사전학습점검 활동', multiline: true },
    ],
  },
  {
    eyebrow: '2. In Class',
    title: '수업 중 활동',
    description: '팀 활동 개요, 진행사항, 추후 계획을 작성합니다.',
    fields: [
      { key: 'inClassDate', label: '일시' },
      { key: 'attendees', label: '참석자' },
      { key: 'topic', label: '활동 주제' },
      { key: 'activityContent', label: '활동 내용', multiline: true },
      { key: 'discussion', label: '논의 사항', multiline: true },
      { key: 'nextPlan', label: '활동 계획', multiline: true },
      { key: 'roleDivision', label: '역할분담', multiline: true },
      { key: 'schedule', label: '추진 일정', multiline: true },
      { key: 'professorFeedback', label: '교수자 피드백', multiline: true },
    ],
  },
  {
    eyebrow: '3. After Class',
    title: '발표 및 성찰',
    description: '발표 결과와 팀 성찰 내용을 수업 후 보고서로 남깁니다.',
    fields: [
      { key: 'presentation', label: '발표 내용', multiline: true },
      { key: 'artifactShare', label: '결과물 공유', multiline: true, note: '사진 첨부 가능 항목은 링크 또는 설명으로 남깁니다.' },
      { key: 'learned', label: '배운 점', multiline: true },
      { key: 'felt', label: '느낀 점', multiline: true },
      { key: 'suggestion', label: '건의 사항', multiline: true },
    ],
  },
]

const reportFieldLabels: Record<ReportFieldKey, string> = {
  week: '주차(차시)',
  course: '교과목명',
  department: '학과',
  professor: '담당교수',
  teamName: '팀명',
  members: '팀원',
  beforeSummary: '사전학습내용 요약',
  beforeCheck: '사전학습점검 활동',
  inClassDate: '일시',
  attendees: '참석자',
  topic: '활동 주제',
  activityContent: '활동 내용',
  discussion: '논의 사항',
  nextPlan: '활동 계획',
  roleDivision: '역할분담',
  schedule: '추진 일정',
  professorFeedback: '교수자 피드백',
  presentation: '발표 내용',
  artifactShare: '결과물 공유',
  learned: '배운 점',
  felt: '느낀 점',
  suggestion: '건의 사항',
}

const createReportFields = (fields: Partial<ReportFields>): ReportFields => ({
  week: '',
  course: '',
  department: '',
  professor: '',
  teamName: '',
  members: '',
  beforeSummary: '',
  beforeCheck: '',
  inClassDate: '',
  attendees: '',
  topic: '',
  activityContent: '',
  discussion: '',
  nextPlan: '',
  roleDivision: '',
  schedule: '',
  professorFeedback: '',
  presentation: '',
  artifactShare: '',
  learned: '',
  felt: '',
  suggestion: '',
  ...fields,
})

const submittedReportSamples: SubmittedReport[] = [
  {
    id: 'report-week-6',
    week: '6주차',
    title: '6주차 팀 보고서',
    submittedAt: '2026.06.07 제출',
    fields: createReportFields({
      week: '6주차',
      course: 'HCI',
      department: 'IT융합전공',
      professor: '고동현',
      teamName: '3조',
      members: '김철수, 고길동, 고영희',
      inClassDate: '2026.06.07',
      attendees: '김철수, 고길동, 고영희',
      topic: '사용자 인터뷰 결과 정리',
      beforeSummary: '플립러닝 수업에서 팀 활동 기록과 교수자 확인 흐름을 사전 자료로 확인했습니다.',
      beforeCheck: '각자 인터뷰 질문을 준비하고 핵심 불편함 후보를 정리했습니다.',
      activityContent: '인터뷰 응답을 공통 주제로 묶고 교수자 대시보드에서 먼저 보여야 할 상태를 논의했습니다.',
      discussion: '활동 없음, 질문 있음, 링크 문제 중 어떤 상태가 수업 중 개입 우선순위가 높은지 비교했습니다.',
      nextPlan: '학생 화면에서 팀 상태를 짧게 공유하는 입력 흐름을 프로토타입으로 만들기로 했습니다.',
      roleDivision: '김철수: 인터뷰 요약, 고길동: 플로우 정리, 고영희: 화면 구성',
      schedule: '다음 주까지 학생용 활동 공간 초안을 완성합니다.',
      presentation: '인터뷰 기반 문제 정의와 우선순위 기준을 발표했습니다.',
      artifactShare: '피그마 보드에 인터뷰 affinity map과 초기 화면 흐름을 공유했습니다.',
      learned: '팀 활동 상태를 빠르게 파악하려면 입력 항목이 짧고 구조화되어야 한다는 점을 배웠습니다.',
      felt: '교수자와 학생이 보는 정보가 다르기 때문에 화면 목적을 분리하는 것이 중요하다고 느꼈습니다.',
    }),
  },
  {
    id: 'report-week-5',
    week: '5주차',
    title: '5주차 팀 보고서',
    submittedAt: '2026.05.31 제출',
    fields: createReportFields({
      week: '5주차',
      course: 'HCI',
      department: 'IT융합전공',
      professor: '고동현',
      teamName: '3조',
      members: '김철수, 고길동, 고영희',
      inClassDate: '2026.05.31',
      attendees: '김철수, 고길동, 고영희',
      topic: '문제 상황과 이해관계자 정리',
      beforeSummary: '기존 LMS에서 팀 활동 확인이 어려운 상황을 정리했습니다.',
      beforeCheck: '학생 관점과 교수자 관점의 불편함을 구분했습니다.',
      activityContent: '사용자 역할을 학생, 교수자, 조교로 나누고 각자의 핵심 니즈를 작성했습니다.',
      discussion: '학생은 작성 부담을 줄이고 싶어하고 교수자는 즉시 개입할 근거를 필요로 한다는 점을 확인했습니다.',
      nextPlan: '수업 중 짧게 제출하는 체크포인트 UI를 설계합니다.',
      roleDivision: '김철수: 문제 정의, 고길동: 사용자 흐름, 고영희: 화면 초안',
      schedule: '다음 수업 전까지 학생용 UI 구조를 정리합니다.',
      presentation: '문제 상황과 사용자별 요구를 공유했습니다.',
      artifactShare: '팀 노션에 문제 정의와 초기 화면 스케치를 정리했습니다.',
      learned: '같은 기능도 사용자 역할에 따라 전혀 다른 화면으로 설계해야 한다는 점을 배웠습니다.',
      felt: '수업 중 교수자가 바로 확인할 수 있는 정보의 우선순위가 중요하다고 느꼈습니다.',
    }),
  },
]

const teamReportFeedbackSamples = [
  {
    team: '1조',
    feedback: '사전학습 요약은 명확했지만 수업 중 논의 근거가 조금 더 구체적이면 좋겠습니다.',
  },
  {
    team: '2조',
    feedback: '역할 분담과 추진 일정이 잘 정리되었습니다. 다음 보고서에는 결과물 링크를 함께 남겨주세요.',
  },
  {
    team: '3조',
    feedback: '문제 정의와 발표 흐름이 자연스럽습니다. 링크 권한 확인처럼 수업 중 발생한 이슈를 잘 반영했습니다.',
  },
  {
    team: '4조',
    feedback: '활동 내용은 충분하지만 배운 점과 느낀 점이 비슷하게 작성되어 구분이 필요합니다.',
  },
  {
    team: '5조',
    feedback: '논의 사항이 짧아 교수자가 진행 맥락을 파악하기 어렵습니다. 결정 이유를 1~2문장 더 추가하세요.',
  },
  {
    team: '6조',
    feedback: '피그마 결과물 공유와 발표 내용 연결이 좋습니다. 다음에는 팀원별 기여도도 함께 남기면 좋겠습니다.',
  },
]

const readinessMeta: Record<TeamReadiness, { label: string; className: string }> = {
  ready: { label: '발표 가능', className: 'ready' },
  blocked: { label: '확인 필요', className: 'blocked' },
  inProgress: { label: '진행 중', className: 'in-progress' },
  waiting: { label: '피드백 대기', className: 'waiting' },
}

const formatPhaseLabels: Record<FormatPhase, string> = {
  preClass: 'Pre-class',
  inClass: 'In-class',
}

const submissionLabels: Record<SubmissionType, string> = {
  figmaLink: '피그마 링크 제출',
  table: '표 형식 제출',
  both: '둘 다 제출',
}

const rowRoleLabels: Record<TableRowRole, string> = {
  prompt: '요구사항',
  response: '학생 입력',
}

function createDefaultTableTemplate(): TableTemplate {
  return {
    columns: [
      { id: 'feature', label: '핵심 기능', width: 190 },
      { id: 'evidence', label: '근거', width: 220 },
      { id: 'blocker', label: '막힌 점', width: 210 },
    ],
    rows: [
      {
        id: 'prompt-1',
        label: '요구사항',
        role: 'prompt',
        cells: {
          feature: '교수자 관제에 꼭 필요한 기능을 적으세요.',
          evidence: '인터뷰 또는 수업 관찰 근거를 연결하세요.',
          blocker: '결정이 어려운 지점을 남기세요.',
        },
      },
      {
        id: 'response-1',
        label: '학생 입력',
        role: 'response',
        cells: {
          feature: '',
          evidence: '',
          blocker: '',
        },
      },
    ],
  }
}

function createDemoPainPointTableTemplate(): TableTemplate {
  const questions = [
    ['Efficiency (Speed & Steps)', 'Is it slow? (Responsiveness)'],
    ['Efficiency (Speed & Steps)', 'Are there too many steps? (Minimal Action)'],
    ['Accuracy (Safety & Errors)', 'Did it fail to stop a mistake? (Prevention)'],
    ['Accuracy (Safety & Errors)', 'Was it hard to fix? (Recovery)'],
    ['Accuracy (Safety & Errors)', 'Did it fail to alert you? (Detection)'],
    ['Meaningfulness (Clarity)', 'Was the status hidden? (Honesty)'],
    ['Meaningfulness (Clarity)', 'Was it confusing? (Understandability)'],
    ['Meaningfulness (Clarity)', 'Is it too hard for a beginner? (Learnability)'],
    ['Flexibility (User Control)', 'Did it force a specific way? (Substitutivity)'],
    ['Flexibility (User Control)', 'Could you do two things at once? (Multi-threading)'],
    ['Flexibility (User Control)', 'Could you customize it? (Personalization)'],
    ['Consistency (Expectation)', 'Was the result unexpected? (Predictability)'],
    ['Consistency (Expectation)', 'Were the terms strange? (Familiarity)'],
    ['Consistency (Expectation)', 'Did it work differently from other apps? (Generalizability)'],
  ]

  return {
    columns: [
      { id: 'category', label: 'Category', width: 210 },
      { id: 'question', label: 'Question', width: 360 },
      { id: 'answer', label: 'Answer', width: 640 },
    ],
    rows: [
      {
        id: 'demo-title',
        label: 'Title',
        role: 'prompt',
        cells: {
          category: '',
          question: 'Fill the Following Table',
          answer: '',
        },
      },
      {
        id: 'demo-step-1-2',
        label: 'Step 1 & 2',
        role: 'prompt',
        cells: {
          category: 'Step 1 & 2',
          question: 'Describe the Pain Point form Worst Experience',
          answer: 'Answer',
        },
      },
      {
        id: 'demo-step-3',
        label: 'Step 3',
        role: 'prompt',
        cells: {
          category: 'Step 3',
          question: 'Simply, answer the followings (Yes or No)',
          answer: 'Answer',
        },
      },
      ...questions.map(([category, question], index) => ({
        id: `demo-answer-${index + 1}`,
        label: category,
        role: 'response' as TableRowRole,
        cells: {
          category,
          question,
          answer: '',
        },
      })),
    ],
  }
}

function createDefaultClassFormat(phase: FormatPhase = 'inClass'): ClassFormat {
  return {
    phase,
    submissionType: 'figmaLink',
    title: '핵심 기능 우선순위 정하기',
    description: '팀별 논의 결과를 교수자가 빠르게 확인할 수 있도록 활동 산출물을 공유합니다.',
    instructions: '수업 중 결정한 내용, 근거, 막힌 지점을 먼저 정리한 뒤 팀 산출물을 제출하세요.',
    figmaPrompt: '팀이 만든 Figma 화면 흐름 링크를 붙여넣고, 공유 권한을 확인한 뒤 스냅샷을 공유하세요.',
    tableTemplate: createDefaultTableTemplate(),
  }
}

function createDefaultClassFormats(): Record<FormatPhase, ClassFormat> {
  return {
    preClass: createDefaultClassFormat('preClass'),
    inClass: createDefaultClassFormat('inClass'),
  }
}

function cloneClassFormat(format: ClassFormat): ClassFormat {
  return {
    ...format,
    tableTemplate: {
      columns: format.tableTemplate.columns.map((column) => ({ ...column })),
      rows: format.tableTemplate.rows.map((row) => ({ ...row, cells: { ...row.cells } })),
    },
  }
}

function createClassWeek(weekNumber: number, formats = createDefaultClassFormats()): ClassWeek {
  return {
    id: `week-${weekNumber}`,
    weekNumber,
    title: `${weekNumber}주차`,
    format: cloneClassFormat(formats.inClass),
    formats: {
      preClass: cloneClassFormat(formats.preClass),
      inClass: cloneClassFormat(formats.inClass),
    },
  }
}

function formatResponseKey(phase: FormatPhase, rowId: string, columnId: string) {
  return `${phase}:${rowId}:${columnId}`
}

function formatUsesFigma(submissionType: SubmissionType) {
  return submissionType === 'figmaLink' || submissionType === 'both'
}

function formatUsesTable(submissionType: SubmissionType) {
  return submissionType === 'table' || submissionType === 'both'
}

function formatUsesAnswerOnlyTable(format: ClassFormat) {
  return format.tableTemplate.columns.some((column) => column.id === 'answer')
}

function isValidFigmaFileUrl(url: string) {
  const normalizedUrl = url.trim().toLowerCase()
  return normalizedUrl.includes('figma.com/design') || normalizedUrl.includes('figma.com/file')
}

function App() {
  const [classWeeks, setClassWeeks] = useState<ClassWeek[]>(() => [createClassWeek(7)])
  const [selectedWeekId, setSelectedWeekId] = useState('week-7')
  const [studentTableResponses, setStudentTableResponses] = useState<Record<string, string>>({})
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>(submittedReportSamples)

  const selectedWeek = classWeeks.find((week) => week.id === selectedWeekId) ?? classWeeks[0] ?? createClassWeek(7)

  const selectWeek = (weekId: string) => {
    setSelectedWeekId(weekId)
    setStudentTableResponses({})
  }

  const addClassWeek = (weekNumber: number) => {
    const existingWeek = classWeeks.find((week) => week.weekNumber === weekNumber)
    if (existingWeek) {
      setSelectedWeekId(existingWeek.id)
      setStudentTableResponses({})
      return
    }
    const nextWeek = createClassWeek(weekNumber)
    setClassWeeks((currentWeeks) => [...currentWeeks, nextWeek])
    setSelectedWeekId(nextWeek.id)
    setStudentTableResponses({})
  }

  const deleteClassWeek = (weekId: string) => {
    if (classWeeks.length <= 1) return

    const weekToDelete = classWeeks.find((week) => week.id === weekId)
    const remainingWeeks = classWeeks.filter((week) => week.id !== weekId)
    const nextSelectedWeek =
      selectedWeekId === weekId
        ? [...remainingWeeks]
            .sort((a, b) => {
              if (weekToDelete) {
                const aDistance = a.weekNumber <= weekToDelete.weekNumber ? weekToDelete.weekNumber - a.weekNumber : 1000 + a.weekNumber
                const bDistance = b.weekNumber <= weekToDelete.weekNumber ? weekToDelete.weekNumber - b.weekNumber : 1000 + b.weekNumber
                return aDistance - bDistance
              }
              return a.weekNumber - b.weekNumber
            })[0]
        : selectedWeek

    setClassWeeks(remainingWeeks)
    setSelectedWeekId(nextSelectedWeek?.id ?? remainingWeeks[0].id)
    setStudentTableResponses({})
  }

  const saveClassFormatForWeek = (weekId: string, nextFormat: ClassFormat) => {
    setClassWeeks((currentWeeks) =>
      currentWeeks.map((week) =>
        week.id === weekId
          ? {
              ...week,
              title: `${week.weekNumber}주차`,
              format: nextFormat,
              formats: {
                ...week.formats,
                [nextFormat.phase]: nextFormat,
              },
            }
          : week,
      ),
    )
    setSelectedWeekId(weekId)
    setStudentTableResponses((currentResponses) =>
      Object.fromEntries(Object.entries(currentResponses).filter(([key]) => !key.startsWith(`${nextFormat.phase}:`))),
    )
  }

  const submitStudentReport = (report: SubmittedReport) => {
    setSubmittedReports((current) => [report, ...current])
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/professor" replace />} />
      <Route
        path="/professor"
        element={
          <ProfessorDashboard
            classWeeks={classWeeks}
            selectedWeek={selectedWeek}
            selectedWeekId={selectedWeekId}
            onSelectWeek={selectWeek}
            onAddWeek={addClassWeek}
            onDeleteWeek={deleteClassWeek}
            onSaveClassFormat={saveClassFormatForWeek}
            submittedReports={submittedReports}
          />
        }
      />
      <Route
        path="/student"
        element={
          <StudentWorkspace
            key={selectedWeek.id}
            selectedWeek={selectedWeek}
            studentTableResponses={studentTableResponses}
            onStudentTableResponsesChange={setStudentTableResponses}
            submittedReports={submittedReports}
            onReportSubmit={submitStudentReport}
          />
        }
      />
      <Route path="*" element={<Navigate to="/professor" replace />} />
    </Routes>
  )
}

function ProfessorDashboard({
  classWeeks,
  selectedWeek,
  selectedWeekId,
  onSelectWeek,
  onAddWeek,
  onDeleteWeek,
  onSaveClassFormat,
  submittedReports,
}: {
  classWeeks: ClassWeek[]
  selectedWeek: ClassWeek
  selectedWeekId: string
  onSelectWeek: (weekId: string) => void
  onAddWeek: (weekNumber: number) => void
  onDeleteWeek: (weekId: string) => void
  onSaveClassFormat: (weekId: string, format: ClassFormat) => void
  submittedReports: SubmittedReport[]
}) {
  const [activeProfessorView, setActiveProfessorView] = useState<ProfessorView>('dashboard')
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
  const isClassCreation = activeProfessorView === 'classCreation'
  const isReports = activeProfessorView === 'reports'

  return (
    <div className="professor-app">
      <ProfessorSidebar activeView={activeProfessorView} onViewChange={setActiveProfessorView} />

      <main className="professor-main">
        <header className="topbar">
          <div>
            <h1>{isClassCreation ? '수업 생성' : isReports ? '보고서 확인' : '수업 중 컨트롤 타워'}</h1>
            <p>
              HCI {selectedWeek.weekNumber}주차 · {isClassCreation ? '주차별 활동 포맷' : isReports ? '팀 보고서' : '팀 활동'}
            </p>
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

        {isClassCreation ? (
          <ClassCreationView
            weeks={classWeeks}
            selectedWeek={selectedWeek}
            selectedWeekId={selectedWeekId}
            onSelectWeek={onSelectWeek}
            onAddWeek={onAddWeek}
            onDeleteWeek={onDeleteWeek}
            onSaveClassFormat={onSaveClassFormat}
          />
        ) : isReports ? (
          <ProfessorReportView reports={submittedReports} />
        ) : (
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
        )}
      </main>
    </div>
  )
}

function ProfessorSidebar({
  activeView,
  onViewChange,
}: {
  activeView: ProfessorView
  onViewChange: (view: ProfessorView) => void
}) {
  const items = [
    { label: '실시간 상태', icon: LayoutDashboard, view: 'dashboard' as ProfessorView },
    { label: '수업 생성', icon: ClipboardList, view: 'classCreation' as ProfessorView },
    { label: '발표 관리', icon: Monitor },
    { label: '활동 요약', icon: BarChart3 },
    { label: '피드백', icon: MessageCircle },
    { label: '보고서', icon: FileText, view: 'reports' as ProfessorView },
  ]

  return (
    <aside className="professor-sidebar">
      <Link to="/professor" className="tower-logo" aria-label="교수자 대시보드" onClick={() => onViewChange('dashboard')}>
        <Monitor size={30} />
      </Link>
      <nav className="side-nav">
        {items.map((item) => {
          const Icon = item.icon
          const itemView = item.view ?? 'dashboard'
          return (
            <button
              className={item.view && activeView === itemView ? 'side-nav-item active' : 'side-nav-item'}
              type="button"
              key={item.label}
              onClick={() => item.view && onViewChange(item.view)}
            >
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

function ClassCreationView({
  weeks,
  selectedWeek,
  selectedWeekId,
  onSelectWeek,
  onAddWeek,
  onDeleteWeek,
  onSaveClassFormat,
}: {
  weeks: ClassWeek[]
  selectedWeek: ClassWeek
  selectedWeekId: string
  onSelectWeek: (weekId: string) => void
  onAddWeek: (weekNumber: number) => void
  onDeleteWeek: (weekId: string) => void
  onSaveClassFormat: (weekId: string, format: ClassFormat) => void
}) {
  const [draftFormat, setDraftFormat] = useState<ClassFormat>(() => cloneClassFormat(selectedWeek.formats.inClass))
  const [isBuilderOpen, setIsBuilderOpen] = useState(true)
  const [isCreatingWeek, setIsCreatingWeek] = useState(false)
  const [newWeekNumber, setNewWeekNumber] = useState('')
  const [weekInputError, setWeekInputError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const selectedSummaryFormat = isCreatingWeek ? draftFormat : selectedWeek.format

  useEffect(() => {
    if (!isCreatingWeek) {
      setDraftFormat(cloneClassFormat(selectedWeek.format))
    }
  }, [selectedWeek.id])

  const saveFormat = (format: ClassFormat) => {
    const publishedFormat = {
      ...cloneClassFormat(format),
      publishedAt: '방금 저장되어 학생 화면에 반영됨',
    }
    let targetWeekId = selectedWeek.id

    if (isCreatingWeek) {
      const parsedWeekNumber = Number.parseInt(newWeekNumber, 10)
      if (!Number.isInteger(parsedWeekNumber) || parsedWeekNumber < 1) {
        setWeekInputError('1 이상의 주차 번호를 입력해 주세요.')
        return
      }
      if (weeks.some((week) => week.weekNumber === parsedWeekNumber)) {
        setWeekInputError('이미 있는 주차입니다. 왼쪽 메뉴에서 선택해 수정해 주세요.')
        return
      }
      targetWeekId = `week-${parsedWeekNumber}`
      onAddWeek(parsedWeekNumber)
    }

    onSaveClassFormat(targetWeekId, publishedFormat)
    setDraftFormat(cloneClassFormat(publishedFormat))
    setNewWeekNumber('')
    setWeekInputError('')
    setIsBuilderOpen(true)
    setIsCreatingWeek(false)
    setSaveNotice('수업 포맷이 저장되었습니다.')
    window.setTimeout(() => setSaveNotice(''), 2200)
  }

  const openNewWeekBuilder = () => {
    setDraftFormat(cloneClassFormat(createDefaultClassFormat('inClass')))
    setNewWeekNumber('')
    setWeekInputError('')
    setIsCreatingWeek(true)
    setIsBuilderOpen(true)
  }

  const selectSavedWeek = (weekId: string) => {
    const nextWeek = weeks.find((week) => week.id === weekId)
    onSelectWeek(weekId)
    if (nextWeek) {
      setDraftFormat(cloneClassFormat(nextWeek.format))
    }
    setIsCreatingWeek(false)
    setIsBuilderOpen(true)
    setNewWeekNumber('')
    setWeekInputError('')
  }

  return (
    <section className="class-creation-view" aria-label="주차별 수업 생성">
      <div className="section-head class-creation-head">
        <div>
          <h2>주차별 수업 생성</h2>
          <p>수업 단계와 제출 방식을 주차별로 저장하면 학생 화면도 같은 주차 내용으로 바뀝니다.</p>
        </div>
        <button className="share-button" type="button" onClick={openNewWeekBuilder}>
          <Plus size={18} />
          주차 생성
        </button>
      </div>

      <div className="week-workspace">
        <aside className="panel week-list-panel" aria-label="주차 메뉴">
          <div className="week-list-head">
            <span className="panel-kicker">Week Menu</span>
            <h3>주차 메뉴</h3>
            <p>교수자가 선택한 주차가 학생 화면에도 동일하게 표시됩니다.</p>
          </div>
          <div className="week-list">
            {weeks.map((week) => (
              <div className={!isCreatingWeek && week.id === selectedWeekId ? 'week-list-item active' : 'week-list-item'} key={week.id}>
                <button
                  className="week-button"
                  type="button"
                  onClick={() => selectSavedWeek(week.id)}
                >
                  <span>{week.weekNumber}주차</span>
                  <strong>{week.format.title}</strong>
                  <small>{week.format.publishedAt ?? '저장 전'}</small>
                </button>
                <button
                  className="week-delete-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteWeek(week.id)
                  }}
                  disabled={weeks.length <= 1}
                  aria-label={`${week.weekNumber}주차 삭제`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="week-editor-area">
          <div className="panel selected-week-summary">
            <div>
              <span className="panel-kicker">{isCreatingWeek ? 'New Week' : 'Selected Week'}</span>
              <h3>
                {isCreatingWeek
                  ? `${newWeekNumber || '새'}주차 · ${selectedSummaryFormat.title || '제목 입력 전'}`
                  : `${selectedWeek.weekNumber}주차 · ${selectedSummaryFormat.title}`}
              </h3>
              <p>{selectedSummaryFormat.description || (isCreatingWeek ? '아래 Class Builder에서 주차와 수업 내용을 입력해 저장하세요.' : '')}</p>
            </div>
            <div className="week-summary-badges">
              {isCreatingWeek && <span>작성 중</span>}
              <span>{formatPhaseLabels[selectedSummaryFormat.phase]}</span>
              <span>{submissionLabels[selectedSummaryFormat.submissionType]}</span>
              <span className={selectedSummaryFormat.publishedAt ? 'saved' : ''}>{selectedSummaryFormat.publishedAt ? '학생 화면 반영' : '저장 전'}</span>
            </div>
          </div>

          {isBuilderOpen && (
            <FormatBuilderPanel
              draftFormat={draftFormat}
              classFormats={selectedWeek.formats}
              selectedWeekNumber={selectedWeek.weekNumber}
              isCreatingWeek={isCreatingWeek}
              newWeekNumber={newWeekNumber}
              weekInputError={weekInputError}
              onNewWeekNumberChange={(value) => {
                setNewWeekNumber(value.replace(/[^0-9]/g, ''))
                setWeekInputError('')
              }}
              onDraftFormatChange={setDraftFormat}
              onPublish={saveFormat}
            />
          )}
          {saveNotice && (
            <div className="format-save-toast" role="status" aria-live="polite">
              <CheckCircle2 size={18} />
              <span>{saveNotice}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function FormatBuilderPanel({
  draftFormat,
  classFormats,
  selectedWeekNumber,
  isCreatingWeek,
  newWeekNumber,
  weekInputError,
  onNewWeekNumberChange,
  onDraftFormatChange,
  onPublish,
}: {
  draftFormat: ClassFormat
  classFormats: Record<FormatPhase, ClassFormat>
  selectedWeekNumber: number
  isCreatingWeek: boolean
  newWeekNumber: string
  weekInputError: string
  onNewWeekNumberChange: (value: string) => void
  onDraftFormatChange: (format: ClassFormat) => void
  onPublish: (format: ClassFormat) => void
}) {
  const tableWidth = draftFormat.tableTemplate.columns.reduce((sum, column) => sum + column.width, 160)

  const updateFormat = (updates: Partial<ClassFormat>) => {
    onDraftFormatChange({ ...draftFormat, ...updates })
  }

  const selectPhase = (phase: FormatPhase) => {
    onDraftFormatChange(cloneClassFormat(isCreatingWeek ? createDefaultClassFormat(phase) : classFormats[phase]))
  }

  const selectSubmissionType = (submissionType: SubmissionType) => {
    if (submissionType === 'figmaLink') {
      updateFormat({ submissionType })
      return
    }

    updateFormat({
      submissionType,
      tableTemplate: createDemoPainPointTableTemplate(),
    })
  }

  const updateTableTemplate = (tableTemplate: TableTemplate) => {
    onDraftFormatChange({ ...draftFormat, tableTemplate })
  }

  const updateColumn = (columnId: string, updates: Partial<TableTemplate['columns'][number]>) => {
    updateTableTemplate({
      ...draftFormat.tableTemplate,
      columns: draftFormat.tableTemplate.columns.map((column) => (column.id === columnId ? { ...column, ...updates } : column)),
    })
  }

  const updateRow = (rowId: string, updates: Partial<TableTemplate['rows'][number]>) => {
    updateTableTemplate({
      ...draftFormat.tableTemplate,
      rows: draftFormat.tableTemplate.rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)),
    })
  }

  const updateTemplateCell = (rowId: string, columnId: string, value: string) => {
    updateTableTemplate({
      ...draftFormat.tableTemplate,
      rows: draftFormat.tableTemplate.rows.map((row) =>
        row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row,
      ),
    })
  }

  const addColumn = () => {
    const id = `col-${Date.now()}`
    updateTableTemplate({
      columns: [...draftFormat.tableTemplate.columns, { id, label: '새 항목', width: 180 }],
      rows: draftFormat.tableTemplate.rows.map((row) => ({ ...row, cells: { ...row.cells, [id]: '' } })),
    })
  }

  const deleteColumn = (columnId: string) => {
    if (draftFormat.tableTemplate.columns.length <= 1) return
    updateTableTemplate({
      columns: draftFormat.tableTemplate.columns.filter((column) => column.id !== columnId),
      rows: draftFormat.tableTemplate.rows.map((row) => {
        const { [columnId]: _removed, ...nextCells } = row.cells
        return { ...row, cells: nextCells }
      }),
    })
  }

  const addRow = (role: TableRowRole) => {
    const id = `${role}-${Date.now()}`
    const cells = draftFormat.tableTemplate.columns.reduce<Record<string, string>>((nextCells, column) => {
      nextCells[column.id] = role === 'prompt' ? '요구사항을 입력하세요.' : ''
      return nextCells
    }, {})
    updateTableTemplate({
      ...draftFormat.tableTemplate,
      rows: [
        ...draftFormat.tableTemplate.rows,
        {
          id,
          label: role === 'prompt' ? '요구사항' : '학생 입력',
          role,
          cells,
        },
      ],
    })
  }

  const deleteRow = (rowId: string) => {
    if (draftFormat.tableTemplate.rows.length <= 1) return
    updateTableTemplate({
      ...draftFormat.tableTemplate,
      rows: draftFormat.tableTemplate.rows.filter((row) => row.id !== rowId),
    })
  }

  const startColumnResize = (columnId: string, event: ReactMouseEvent<HTMLSpanElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = draftFormat.tableTemplate.columns.find((column) => column.id === columnId)?.width ?? 180

    const handleMove = (moveEvent: MouseEvent) => {
      updateColumn(columnId, { width: Math.max(130, startWidth + moveEvent.clientX - startX) })
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <section className="panel format-builder-panel" aria-label="수업 생성">
      <div className="format-builder-head">
        <div>
          <span className="panel-kicker">Class Builder</span>
          <h3>학생 활동 수업 생성</h3>
          <p>수업 단계와 제출 방식을 정하고 저장하면 학생 화면에 바로 반영됩니다.</p>
        </div>
        <span className={draftFormat.publishedAt ? 'published-badge active' : 'published-badge'}>
          {draftFormat.publishedAt ?? '저장 전'}
        </span>
      </div>

      <div className="builder-week-control">
        <div>
          <span className="builder-step">1. 주차 선정</span>
          <p>
            {isCreatingWeek
              ? '새로 구성할 수업 주차를 입력한 뒤 저장하면 해당 주차가 추가됩니다.'
              : '왼쪽 메뉴에서 선택한 주차의 저장된 수업 포맷을 확인하고 수정합니다.'}
          </p>
        </div>
        <div className="week-add-control">
          <label className="week-add-field">
            <span>{isCreatingWeek ? '저장할 주차' : '선택된 주차'}</span>
            <input
              value={isCreatingWeek ? newWeekNumber : `${selectedWeekNumber}`}
              inputMode="numeric"
              placeholder="예: 9"
              readOnly={!isCreatingWeek}
              onChange={(event) => {
                if (isCreatingWeek) {
                  onNewWeekNumberChange(event.target.value)
                }
              }}
            />
            {weekInputError && <small>{weekInputError}</small>}
          </label>
        </div>
      </div>

      <div className="builder-form-grid">
        <label>
          <span>포맷 제목</span>
          <input value={draftFormat.title} onChange={(event) => updateFormat({ title: event.target.value })} />
        </label>
        <label>
          <span>활동 설명</span>
          <input value={draftFormat.description} onChange={(event) => updateFormat({ description: event.target.value })} />
        </label>
      </div>

      <div className="format-builder-section">
        <span className="builder-step">2. 수업 단계</span>
        <div className="segmented-control">
          {(['preClass', 'inClass'] as FormatPhase[]).map((phase) => (
            <button
              className={draftFormat.phase === phase ? 'active' : ''}
              type="button"
              key={phase}
              onClick={() => selectPhase(phase)}
            >
              {formatPhaseLabels[phase]}
            </button>
          ))}
        </div>
      </div>

      <div className="format-builder-section">
        <span className="builder-step">3. 제출 방식</span>
        <div className="format-choice-grid">
          {(['figmaLink', 'table', 'both'] as SubmissionType[]).map((submissionType) => (
            <button
              className={draftFormat.submissionType === submissionType ? 'format-choice-card active' : 'format-choice-card'}
              type="button"
              key={submissionType}
              onClick={() => selectSubmissionType(submissionType)}
            >
              {submissionType === 'figmaLink' ? <LinkIcon size={25} /> : submissionType === 'table' ? <ClipboardList size={25} /> : <CheckCircle2 size={25} />}
              <strong>{submissionLabels[submissionType]}</strong>
              <span>
                {submissionType === 'figmaLink'
                  ? '학생은 자신이 만든 Figma 링크만 제출합니다.'
                  : submissionType === 'table'
                    ? '교수가 만든 표 안에 학생이 직접 응답합니다.'
                    : '피그마 링크 박스와 교수 제공 표를 함께 보여줍니다.'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="builder-wide-field">
        <span>학생 안내 문구</span>
        <textarea value={draftFormat.instructions} onChange={(event) => updateFormat({ instructions: event.target.value })} rows={3} />
      </label>

      {formatUsesFigma(draftFormat.submissionType) && (
        <label className="builder-wide-field">
          <span>피그마 제출 안내</span>
          <textarea value={draftFormat.figmaPrompt} onChange={(event) => updateFormat({ figmaPrompt: event.target.value })} rows={3} />
        </label>
      )}

      {formatUsesTable(draftFormat.submissionType) && (
        <div className="format-table-editor">
          <div className="format-table-toolbar">
            <span>표 편집</span>
            <div>
              <button className="outline-button" type="button" onClick={addColumn}>
                <Plus size={16} />
                열 추가
              </button>
              <button className="outline-button" type="button" onClick={() => addRow('prompt')}>
                <Plus size={16} />
                요구 행 추가
              </button>
              <button className="outline-button" type="button" onClick={() => addRow('response')}>
                <Plus size={16} />
                입력 행 추가
              </button>
            </div>
          </div>
          <div className="format-table-scroll">
            <table className="editable-format-table" style={{ minWidth: tableWidth }}>
              <colgroup>
                <col style={{ width: 156 }} />
                {draftFormat.tableTemplate.columns.map((column) => (
                  <col style={{ width: column.width }} key={column.id} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>행 구분</th>
                  {draftFormat.tableTemplate.columns.map((column) => (
                    <th key={column.id}>
                      <div className="column-head-cell">
                        <input value={column.label} onChange={(event) => updateColumn(column.id, { label: event.target.value })} />
                        <button type="button" onClick={() => deleteColumn(column.id)} disabled={draftFormat.tableTemplate.columns.length <= 1}>
                          <Trash2 size={15} />
                        </button>
                        <span className="resize-handle" onMouseDown={(event) => startColumnResize(column.id, event)} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draftFormat.tableTemplate.rows.map((row) => (
                  <tr className={row.role} key={row.id}>
                    <th>
                      <div className="row-head-cell">
                        <span className={`row-role ${row.role}`}>{rowRoleLabels[row.role]}</span>
                        <input value={row.label} onChange={(event) => updateRow(row.id, { label: event.target.value })} />
                        <button type="button" onClick={() => deleteRow(row.id)} disabled={draftFormat.tableTemplate.rows.length <= 1}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </th>
                    {draftFormat.tableTemplate.columns.map((column) => (
                      <td key={column.id}>
                        <textarea
                          value={row.cells[column.id] ?? ''}
                          onChange={(event) => updateTemplateCell(row.id, column.id, event.target.value)}
                          rows={3}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="format-builder-footer">
        <div className="format-preview-note">
          <strong>미리보기</strong>
          <span>
            {formatPhaseLabels[draftFormat.phase]} · {submissionLabels[draftFormat.submissionType]} · 학생 화면에
            {draftFormat.submissionType === 'figmaLink'
              ? ' 링크 제출 카드가 표시됩니다.'
              : draftFormat.submissionType === 'table'
                ? ' 교수 제공 표가 표시됩니다.'
                : ' 링크 제출 카드와 교수 제공 표가 함께 표시됩니다.'}
          </span>
        </div>
        <button className="share-button" type="button" onClick={() => onPublish(draftFormat)}>
          <Save size={18} />
          저장
        </button>
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

function ProfessorReportView({ reports }: { reports: SubmittedReport[] }) {
  const [selectedReportId, setSelectedReportId] = useState(reports[0]?.id ?? '')
  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0]
  const basicFields: ReportFieldKey[] = ['week', 'course', 'department', 'professor', 'teamName', 'members']
  const noopReportChange = () => undefined

  return (
    <section className="professor-report-view" aria-label="제출 보고서 확인">
      <div className="section-head professor-report-head">
        <div>
          <h2>제출 보고서 확인</h2>
          <p>학생이 제출한 주차별 팀 보고서를 같은 양식과 입력 내용으로 확인합니다.</p>
        </div>
        <span className="published-badge active">{reports.length}개 제출본</span>
      </div>

      <div className="report-board">
        <aside className="report-history-panel" aria-label="교수자 보고서 목록">
          <div>
            <span>Report Inbox</span>
            <h2>제출 목록</h2>
            <p>새로 제출된 보고서가 목록 상단에 표시됩니다.</p>
          </div>
          <div className="report-history-list">
            {reports.map((report) => (
              <button
                className={selectedReport.id === report.id ? 'report-history-item active' : 'report-history-item'}
                type="button"
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
              >
                <strong>{report.week}</strong>
                <span>{report.title}</span>
                <small>{report.submittedAt}</small>
                <em>제출 완료</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="report-form-panel">
          <div className="report-hero professor-report-hero">
            <span className="report-status submitted">제출 완료</span>
            <h1>{selectedReport.title}</h1>
            <p>{selectedReport.submittedAt} · 학생이 작성한 보고서 양식과 내용을 교수자 화면에서 그대로 확인합니다.</p>
          </div>

          <section className="report-card">
            <div className="report-section-head">
              <div>
                <span>기본 정보</span>
                <h2>보고서 정보</h2>
              </div>
              <small>{selectedReport.submittedAt}</small>
            </div>
            <div className="report-basic-grid">
              {basicFields.map((key) => (
                <ReportInput
                  label={reportFieldLabels[key]}
                  value={selectedReport.fields[key]}
                  readOnly
                  onChange={noopReportChange}
                  key={key}
                />
              ))}
            </div>
          </section>

          {reportSections.map((section) => (
            <section className="report-card" key={section.eyebrow}>
              <div className="report-section-head">
                <div>
                  <span>{section.eyebrow}</span>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
              </div>
              <div className="report-field-grid">
                {section.fields.map((field) =>
                  field.multiline ? (
                    <ReportTextarea
                      label={field.label}
                      value={selectedReport.fields[field.key]}
                      note={field.note}
                      readOnly
                      onChange={noopReportChange}
                      key={field.key}
                    />
                  ) : (
                    <ReportInput
                      label={field.label}
                      value={selectedReport.fields[field.key]}
                      readOnly
                      onChange={noopReportChange}
                      key={field.key}
                    />
                  ),
                )}
              </div>
            </section>
          ))}

          <section className="report-card team-feedback-panel">
            <div className="report-section-head">
              <div>
                <span>Class Feedback</span>
                <h2>팀별 수업 피드백</h2>
                <p>데모용으로 정리한 1조부터 6조까지의 수업 피드백입니다.</p>
              </div>
            </div>
            <div className="team-feedback-grid">
              {teamReportFeedbackSamples.map((item) => (
                <article className="team-feedback-card" key={item.team}>
                  <strong>{item.team}</strong>
                  <p>{item.feedback}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

function StudentWorkspace({
  selectedWeek,
  studentTableResponses,
  onStudentTableResponsesChange,
  submittedReports,
  onReportSubmit,
}: {
  selectedWeek: ClassWeek
  studentTableResponses: Record<string, string>
  onStudentTableResponsesChange: (responses: Record<string, string>) => void
  submittedReports: SubmittedReport[]
  onReportSubmit: (report: SubmittedReport) => void
}) {
  const [mode, setMode] = useState<WorkspaceMode>('both')
  const [activityPhase, setActivityPhase] = useState<FormatPhase>('inClass')
  const [fields, setFields] = useState({
    did: '인터뷰 내용을 세 가지 핵심 불편함으로 묶었습니다.',
    decision: '새로운 학습관리시스템 기능보다 수업 중 팀 상태 가시성을 우선하기로 했습니다.',
    evidence: '피그마 보드에 사용자 흐름, 링크 확인 흐름, 스냅샷 화면을 정리했습니다.',
    blocked: '링크 문제와 활동 없음 중 어떤 알림을 먼저 보여줄지 확인이 필요합니다.',
    question: '링크 문제와 활동 없음 중 어떤 상황을 더 높은 우선순위로 봐야 할까요?',
  })
  const [figmaUrls, setFigmaUrls] = useState<Record<FormatPhase, string>>({
    preClass: '',
    inClass: '',
  })
  const [linkStatuses, setLinkStatuses] = useState<Record<FormatPhase, LinkStatus>>({
    preClass: 'unchecked',
    inClass: 'unchecked',
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSharedAt, setLastSharedAt] = useState('아직 공유 전')
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('none')
  const [teamSignal, setTeamSignal] = useState<TeamSignal>('normal')
  const [lastSignalAt, setLastSignalAt] = useState('방금 전송됨')
  const [signalNotice, setSignalNotice] = useState('')
  const [isFinalized, setIsFinalized] = useState(false)
  const [studentView, setStudentView] = useState<StudentView>('workspace')
  const [reportFields, setReportFields] = useState<ReportFields>(
    createReportFields({
      week: `${selectedWeek.weekNumber}주차`,
      course: 'HCI',
      department: 'IT융합전공',
      professor: '고동현',
      teamName: '3조',
      members: '김철수, 고길동, 고영희',
      beforeSummary: '이번 주 사전 자료를 확인하며 팀 활동 기록 방식과 교수자 확인 흐름을 정리했습니다.',
      beforeCheck: '각자 핵심 질문을 준비하고 수업 중 확인할 근거 자료를 미리 분담했습니다.',
      inClassDate: '2026.06.15',
      attendees: '김철수, 고길동, 고영희',
      topic: '팀 활동 공간 프로토타입 개선',
      activityContent: '교수 제공 표와 피그마 링크 제출 흐름을 확인하고 학생 화면에서 작성 부담이 적은 구조를 논의했습니다.',
      discussion: 'Pre-class와 In-class 입력 항목을 분리하고, 제출 상태가 교수 화면에 어떻게 보일지 정리했습니다.',
      nextPlan: '보고서 제출 흐름과 교수자 저장 알림을 시연 가능한 수준으로 다듬습니다.',
      roleDivision: '김철수: 학생 보고서 화면, 고길동: 교수 수업 생성 흐름, 고영희: 발표 시나리오 정리',
      schedule: '수업 전까지 화면 점검을 완료하고 발표 전 최종 링크를 확인합니다.',
      professorFeedback: '교수자 피드백을 받은 뒤 우선순위와 제출 흐름을 보완할 예정입니다.',
      presentation: '학생이 활동표, 피그마 링크, 보고서를 제출하는 전체 흐름을 발표합니다.',
      artifactShare: '피그마 링크와 팀 보고서 화면을 함께 공유합니다.',
      learned: '같은 수업 안에서도 사전 활동과 수업 중 활동은 입력 목적이 다르므로 탭으로 분리하는 것이 명확했습니다.',
      felt: '학생 입장에서는 바로 제출 가능한 기본값과 명확한 제출 상태가 중요하다고 느꼈습니다.',
      suggestion: '실제 구현 시에는 제출 후 수정 가능 시간과 교수자 확인 상태를 더 세분화하면 좋겠습니다.',
    }),
  )
  const [reportStatus, setReportStatus] = useState<ReportStatus>('draft')
  const [lastReportSubmittedAt, setLastReportSubmittedAt] = useState('미제출')
  const [selectedReportId, setSelectedReportId] = useState('current')
  const [lastFinalizedAt, setLastFinalizedAt] = useState('마무리 전')

  const classFormat = selectedWeek.formats[activityPhase]
  const figmaUrl = figmaUrls[activityPhase]
  const linkStatus = linkStatuses[activityPhase]
  const activeFormat = classFormat.publishedAt ? classFormat : undefined
  const activeFormatUsesFigma = activeFormat ? formatUsesFigma(activeFormat.submissionType) : false
  const activeFormatUsesTable = activeFormat ? formatUsesTable(activeFormat.submissionType) : false
  const activeFormatAnswerOnlyTable = activeFormat ? formatUsesAnswerOnlyTable(activeFormat) : false
  const artifactType: ArtifactType = activeFormat ? (activeFormat.submissionType === 'both' ? 'mixed' : activeFormat.submissionType === 'figmaLink' ? 'figma' : 'table') : mode === 'both' ? 'mixed' : mode
  const workspaceGridClass = activeFormat
    ? activeFormat.submissionType === 'both'
      ? 'workspace-grid single-column stacked-submission'
      : 'workspace-grid single-column'
    : mode === 'both'
      ? 'workspace-grid two-column'
      : 'workspace-grid single-column'
  const requiresFigma = activeFormat ? activeFormatUsesFigma : mode !== 'table'
  const activeTableColumns = activeFormat && activeFormatUsesTable ? activeFormat.tableTemplate.columns : []
  const responseColumns = activeFormatAnswerOnlyTable ? activeTableColumns.filter((column) => column.id === 'answer') : activeTableColumns
  const responseRows = activeFormat && activeFormatUsesTable ? activeFormat.tableTemplate.rows.filter((row) => row.role === 'response') : []
  const hasAssignedTableResponses =
    activeFormatUsesTable
      ? responseRows.some((row) =>
          responseColumns.some((column) => (studentTableResponses[formatResponseKey(activityPhase, row.id, column.id)] ?? '').trim().length > 0),
        )
      : false
  const hasFigmaUrl = figmaUrl.trim().length > 0
  const canRenderFigmaEmbed = hasFigmaUrl && isValidFigmaFileUrl(figmaUrl)
  const figmaEmbedUrl = canRenderFigmaEmbed
    ? `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(figmaUrl.trim())}`
    : ''
  const canShare = activeFormat
    ? (!activeFormatUsesFigma || (hasFigmaUrl && linkStatus === 'ok')) && (!activeFormatUsesTable || hasAssignedTableResponses)
    : !requiresFigma || (hasFigmaUrl && linkStatus === 'ok')
  const snapshotShared = saveState === 'shared'
  const canFinalize = snapshotShared && feedbackState === 'received'
  const selectedSignal = signalOptions.find((option) => option.value === teamSignal) ?? signalOptions[0]
  const professorSummary = useMemo(
    () => {
      const tableSummary = activeFormatUsesTable
        ? responseRows
          .map((row) => {
            if (activeFormatAnswerOnlyTable) {
              const answer = studentTableResponses[formatResponseKey(activityPhase, row.id, 'answer')]?.trim()
              return answer ? `${row.cells.question}: ${answer}` : ''
            }
            const values = activeTableColumns
              .map((column) => studentTableResponses[formatResponseKey(activityPhase, row.id, column.id)]?.trim())
              .filter(Boolean)
            return values.length > 0 ? `${row.label}: ${values.join(' / ')}` : ''
          })
          .filter(Boolean)
          .join(' ')
        : ''
      if (activeFormat?.submissionType === 'table') {
        return tableSummary
      }
      if (activeFormat?.submissionType === 'both') {
        return [tableSummary, fields.question].filter(Boolean).join(' ')
      }
      return [fields.did, fields.decision, fields.blocked].filter(Boolean).join(' ')
    },
    [activeFormat, activeFormatAnswerOnlyTable, activeFormatUsesTable, activeTableColumns, activityPhase, fields.blocked, fields.decision, fields.did, fields.question, responseRows, studentTableResponses],
  )
  const currentClassBrief = {
    title: classFormat.title,
    description: classFormat.description || studentClassBrief.description,
    prompt: classFormat.instructions || studentClassBrief.prompt,
    meta: [
      { label: '현재 주차', value: `${selectedWeek.weekNumber}주차` },
      { label: '현재 단계', value: formatPhaseLabels[classFormat.phase] },
      { label: '제출 방식', value: submissionLabels[classFormat.submissionType] },
      { label: '저장 상태', value: classFormat.publishedAt ? '학생 화면 반영됨' : '교수 저장 전' },
    ],
  }
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
      label: activeFormatUsesTable ? '교수 제공 표 입력됨' : mode === 'figma' ? '피그마 링크 입력됨' : '활동 표 작성됨',
      done:
        activeFormatUsesTable
          ? hasAssignedTableResponses
          : mode === 'figma'
            ? figmaUrl.trim().length > 0
            : fields.did.trim().length > 0,
    },
    {
      label: activeFormatUsesTable ? '학생 입력 셀 작성됨' : '피그마 접근 권한 확인됨',
      done: activeFormatUsesTable ? hasAssignedTableResponses : !requiresFigma || linkStatus === 'ok',
    },
    {
      label: requiresFigma ? '피그마 접근 권한 확인됨' : '피그마 없이 제출',
      done: !requiresFigma || linkStatus === 'ok',
    },
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
      label: activeFormatUsesTable ? '표 입력 확인' : '링크 권한 확인',
      detail: activeFormatUsesTable ? (hasAssignedTableResponses ? '학생 입력 완료' : '입력 전') : requiresFigma ? linkLabels[linkStatus] : '활동 표만 공유합니다.',
      done: !activeFormatUsesTable || hasAssignedTableResponses,
    },
    {
      label: requiresFigma ? '링크 권한 확인' : '링크 없음',
      detail: requiresFigma ? linkLabels[linkStatus] : '표만 공유합니다.',
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
  const demoFlowSteps = [
    {
      label: '상태 신호 선택',
      detail: '질문 있음 또는 도움 필요',
      done: teamSignal === 'question' || teamSignal === 'blocked' || teamSignal === 'ready',
      active: teamSignal === 'normal',
    },
    {
      label: activeFormat ? '포맷 확인' : '함께 제출',
      detail: activeFormat ? submissionLabels[activeFormat.submissionType] : '활동 표와 피그마 링크',
      done: activeFormat ? true : mode === 'both',
      active: !activeFormat && mode !== 'both',
    },
    {
      label: activeFormatUsesTable ? '표 입력' : '권한 확인',
      detail: activeFormatUsesTable ? (hasAssignedTableResponses ? '입력 완료' : '학생 입력 필요') : linkLabels[linkStatus],
      done: activeFormatUsesTable ? hasAssignedTableResponses : !requiresFigma || linkStatus === 'ok',
      active: activeFormatUsesTable ? !hasAssignedTableResponses : requiresFigma && linkStatus === 'unchecked',
    },
    {
      label: requiresFigma ? '권한 확인' : '링크 없음',
      detail: requiresFigma ? linkLabels[linkStatus] : '표만 제출',
      done: !requiresFigma || linkStatus === 'ok',
      active: requiresFigma && linkStatus === 'unchecked',
    },
    {
      label: '저장',
      detail: saveState === 'idle' ? saveLabels[saveState] : '저장됨',
      done: saveState === 'saved' || saveState === 'shared',
      active: saveState === 'idle',
    },
    {
      label: '스냅샷 공유',
      detail: snapshotShared ? '공유됨' : '공유 전',
      done: snapshotShared,
      active: canShare && !snapshotShared,
    },
    {
      label: '피드백 확인',
      detail: feedbackState === 'received' ? '도착' : feedbackState === 'waiting' ? '확인 대기' : '공유 후 가능',
      done: feedbackState === 'received',
      active: feedbackState === 'waiting',
    },
    {
      label: '발표 준비 완료',
      detail: isFinalized ? '완료' : canFinalize ? '마무리 가능' : '피드백 필요',
      done: isFinalized,
      active: canFinalize && !isFinalized,
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

  const selectedSubmittedReport = submittedReports.find((report) => report.id === selectedReportId)
  const isReportReadOnly = selectedReportId !== 'current'
  const activeReportFields = selectedSubmittedReport?.fields ?? reportFields
  const activeReportStatus: ReportStatus = isReportReadOnly ? 'submitted' : reportStatus
  const activeReportSubmittedAt = selectedSubmittedReport?.submittedAt ?? lastReportSubmittedAt
  const missingReportFields = reportRequiredFields.filter((key) => activeReportFields[key].trim().length === 0)
  const reportProgress = Math.round(((reportRequiredFields.length - missingReportFields.length) / reportRequiredFields.length) * 100)
  const canSubmitReport = !isReportReadOnly && missingReportFields.length === 0
  const currentReportList: ReportListItem[] = reportStatus === 'submitted' ? [] : [
    {
      id: 'current',
      week: reportFields.week || `${selectedWeek.weekNumber}주차`,
      title: `${reportFields.week || `${selectedWeek.weekNumber}주차`} 팀 보고서`,
      submittedAt: lastReportSubmittedAt,
      status: reportStatus,
      readOnly: false,
    },
  ]
  const reportList: ReportListItem[] = [
    ...currentReportList,
    ...submittedReports.map((report) => ({
      id: report.id,
      week: report.week,
      title: report.title,
      submittedAt: report.submittedAt,
      status: 'submitted' as ReportStatus,
      readOnly: true,
    })),
  ]

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

  const handleStudentTableCellChange = (rowId: string, columnId: string, value: string) => {
    onStudentTableResponsesChange({
      ...studentTableResponses,
      [formatResponseKey(activityPhase, rowId, columnId)]: value,
    })
    if (snapshotShared) {
      setLastSharedAt('표 수정 후 다시 공유 필요')
    }
    setSaveState('idle')
    setFeedbackState('none')
    setIsFinalized(false)
    setLastFinalizedAt('표 수정 후 다시 완료 필요')
  }

  const handleReportFieldChange = (key: ReportFieldKey) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setReportFields((current) => ({ ...current, [key]: event.target.value }))
    setReportStatus('draft')
    setLastReportSubmittedAt('미제출')
    setSelectedReportId('current')
  }

  const submitReport = () => {
    if (!canSubmitReport) return
    const submittedAt = '방금 제출됨'
    const submittedReport: SubmittedReport = {
      id: `report-${Date.now()}`,
      week: reportFields.week || `${selectedWeek.weekNumber}주차`,
      title: `${reportFields.week || `${selectedWeek.weekNumber}주차`} 팀 보고서`,
      submittedAt,
      fields: createReportFields(reportFields),
    }
    onReportSubmit(submittedReport)
    setReportStatus('submitted')
    setLastReportSubmittedAt(submittedAt)
    setSelectedReportId(submittedReport.id)
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
      setLinkStatuses((current) => ({ ...current, [activityPhase]: 'denied' }))
      setSaveState('idle')
      setIsFinalized(false)
      setLastFinalizedAt('링크 입력 후 다시 확인 필요')
      return
    }
    setLinkStatuses((current) => ({ ...current, [activityPhase]: isValidFigmaFileUrl(normalizedUrl) ? 'ok' : 'denied' }))
    setSaveState('idle')
    setIsFinalized(false)
    setLastFinalizedAt('권한 확인 후 다시 공유 필요')
  }

  const saveDraft = () => {
    setSaveState('saved')
  }

  const sendTeamSignal = (nextSignal: TeamSignal) => {
    const nextSignalLabel = signalOptions.find((option) => option.value === nextSignal)?.label ?? '팀 신호'
    setTeamSignal(nextSignal)
    setLastSignalAt('방금 전송됨')
    setSignalNotice(`${nextSignalLabel} 알림을 교수자에게 보냈습니다.`)
    window.setTimeout(() => setSignalNotice(''), 2200)
    if (isFinalized && nextSignal !== 'ready') {
      setIsFinalized(false)
      setLastFinalizedAt('팀 신호 변경 후 다시 완료 필요')
    }
  }

  const shareSnapshot = () => {
    if (!canShare) {
      setLinkStatuses((current) => ({ ...current, [activityPhase]: 'denied' }))
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
          <strong>HCI {selectedWeek.weekNumber}주차 · 3팀 활동 공간</strong>
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
        <StudentSidebar
          activeView={studentView}
          onViewChange={setStudentView}
          reportSubmitted={reportStatus === 'submitted' || submittedReports.length > submittedReportSamples.length}
        />

        <main className="workspace-main">
          {studentView === 'report' ? (
            <StudentReportForm
              fields={activeReportFields}
              status={activeReportStatus}
              progress={reportProgress}
              canSubmit={canSubmitReport}
              lastSubmittedAt={activeReportSubmittedAt}
              readOnly={isReportReadOnly}
              reports={reportList}
              selectedReportId={selectedReportId}
              onSelectReport={setSelectedReportId}
              onFieldChange={handleReportFieldChange}
              onSubmit={submitReport}
            />
          ) : (
            <>
          <section className="workspace-head">
            <h1>팀 활동 공간</h1>
            <p>교수자가 팀 상태를 먼저 파악할 수 있도록 10-20초 안에 읽히는 체크포인트를 공유합니다.</p>
            <div className="student-week-strip" aria-label="현재 주차">
              <span>{selectedWeek.weekNumber}주차</span>
              <strong>{classFormat.title}</strong>
              <small>{classFormat.publishedAt ?? '교수자가 수업 생성 화면에서 저장하면 제출 포맷이 반영됩니다.'}</small>
            </div>
            <div className="activity-phase-tabs" role="tablist" aria-label="활동 단계">
              {(['preClass', 'inClass'] as FormatPhase[]).map((phase) => (
                <button
                  className={activityPhase === phase ? 'active' : ''}
                  type="button"
                  key={phase}
                  onClick={() => {
                    setActivityPhase(phase)
                    setSaveState('idle')
                    setFeedbackState('none')
                  }}
                >
                  {formatPhaseLabels[phase]}
                </button>
              ))}
            </div>
            {activeFormat ? (
              <div className="assigned-format-banner">
                <span>
                  <ClipboardList size={18} />
                  교수 제공 포맷
                </span>
                <strong>
                  {formatPhaseLabels[activeFormat.phase]} · {submissionLabels[activeFormat.submissionType]}
                </strong>
              </div>
            ) : (
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
            )}
          </section>

          <section className="class-brief" aria-label="오늘 수업 안내">
            <div>
              <span className="brief-kicker">오늘 수업</span>
              <h2>{currentClassBrief.title}</h2>
              <p>{currentClassBrief.description}</p>
            </div>
            <div className="teacher-prompt">
              <span>교수자 요청</span>
              <p>{currentClassBrief.prompt}</p>
            </div>
            <div className="brief-meta">
              {currentClassBrief.meta.map((item) => (
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
            {signalNotice && (
              <div className="signal-toast" role="status" aria-live="polite">
                <CheckCircle2 size={18} />
                <span>{signalNotice}</span>
              </div>
            )}
          </section>

          <div className={workspaceGridClass}>
            {!activeFormat && (mode === 'table' || mode === 'both') && (
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

            {activeFormat && activeFormatUsesTable && (
              <AssignedFormatTable
                format={activeFormat}
                responses={studentTableResponses}
                onResponseChange={handleStudentTableCellChange}
              />
            )}

            {((activeFormat && activeFormatUsesFigma) || (!activeFormat && (mode === 'figma' || mode === 'both'))) && (
              <section className="workspace-card figma-card">
                <div className="card-title">
                  <span>2</span>
                  <div>
                    <h2>{activeFormat ? '피그마 링크 제출' : '피그마 작업 링크'}</h2>
                    <p>{activeFormat ? activeFormat.figmaPrompt : '공유 전에 교수자가 열 수 있는 링크인지 확인합니다.'}</p>
                  </div>
                </div>
                <label className="url-field">
                  <span>피그마 URL</span>
                  <input
                    value={figmaUrl}
                    placeholder="https://www.figma.com/design/..."
                    onChange={(event) => {
                      setFigmaUrls((current) => ({ ...current, [activityPhase]: event.target.value }))
                      setLinkStatuses((current) => ({ ...current, [activityPhase]: 'unchecked' }))
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
              {canShare
                ? '교수자에게 공유할 준비가 되었습니다.'
                : activeFormat?.submissionType === 'both'
                  ? '피그마 권한 확인과 표 입력을 모두 완료하세요.'
                  : activeFormatUsesTable
                    ? '교수 제공 표의 학생 입력 셀을 작성하세요.'
                    : '공유하기 전에 링크 접근 권한을 확인하세요.'}
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
              <button
                className={feedbackState === 'waiting' ? 'outline-button feedback-ready-button' : 'outline-button'}
                type="button"
                onClick={receiveProfessorFeedback}
                disabled={!snapshotShared}
              >
                <MessageCircle size={17} />
                피드백 확인
              </button>
            </div>
            <div className="activity-feed">
              {activityFeed.map((item, index) => (
                <span className={item.done ? 'feed-item done' : 'feed-item'} key={`${item.label}-${index}`}>
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
              {!canFinalize && !isFinalized && <small className="completion-hint">스냅샷 공유 후 교수자 피드백을 확인해야 완료할 수 있습니다.</small>}
            </div>
            <button
              className={canFinalize && !isFinalized ? 'share-button finalize-ready-button' : 'share-button'}
              type="button"
              onClick={finalizePresentation}
              disabled={!canFinalize || isFinalized}
            >
              <CheckCircle2 size={18} />
              {isFinalized ? '완료됨' : '발표 준비 완료'}
            </button>
          </section>
            </>
          )}
        </main>

        <aside className="professor-preview">
          {studentView === 'report' ? (
            <ReportSubmitPreview
              fields={activeReportFields}
              status={activeReportStatus}
              progress={reportProgress}
              missingFields={missingReportFields}
              lastSubmittedAt={activeReportSubmittedAt}
              readOnly={isReportReadOnly}
              canSubmit={canSubmitReport}
              onSubmit={submitReport}
            />
          ) : (
            <>
          <h2>교수자 화면 미리보기</h2>
          <p>
            <Eye size={17} />
            팀 활동 스냅샷
          </p>
          <div className="snapshot-state-row">
            <span className={`snapshot-state ${saveState}`}>{saveLabels[saveState]}</span>
            <span>{requiresFigma ? linkLabels[linkStatus] : activeFormatUsesTable ? '표 제출' : '링크 없음'}</span>
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
            <p className={`signal-preview-detail ${selectedSignal.className}`}>{selectedSignal.detail}</p>
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
              <span>{activeFormat?.submissionType === 'both' ? '피그마 + 표 제출' : requiresFigma ? '피그마 링크' : '표 제출'}</span>
              <strong className={requiresFigma ? `link-badge ${linkStatus}` : 'link-badge ok'}>
                {activeFormat?.submissionType === 'both'
                  ? `${linkLabels[linkStatus]} · ${hasAssignedTableResponses ? '표 입력됨' : '표 입력 전'}`
                  : requiresFigma
                    ? linkLabels[linkStatus]
                    : hasAssignedTableResponses
                      ? '입력됨'
                      : '입력 전'}
              </strong>
            </div>
            {requiresFigma && hasFigmaUrl ? (
              <a href={figmaUrl} target="_blank" rel="noreferrer">
                {figmaUrl.replace('https://www.', '')}
                <ExternalLink size={16} />
              </a>
            ) : requiresFigma ? (
              <span className="preview-empty-link">피그마 링크를 입력하면 여기에 표시됩니다.</span>
            ) : (
              <span className="preview-empty-link">교수 제공 표의 학생 입력 내용이 요약에 반영됩니다.</span>
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
            {checkpointItems.map((item, index) => (
              <span className={item.done ? 'done' : 'pending'} key={`${item.label}-${index}`}>
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
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function StudentReportForm({
  fields,
  status,
  progress,
  canSubmit,
  lastSubmittedAt,
  readOnly,
  reports,
  selectedReportId,
  onSelectReport,
  onFieldChange,
  onSubmit,
}: {
  fields: ReportFields
  status: ReportStatus
  progress: number
  canSubmit: boolean
  lastSubmittedAt: string
  readOnly: boolean
  reports: ReportListItem[]
  selectedReportId: string
  onSelectReport: (reportId: string) => void
  onFieldChange: (key: ReportFieldKey) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: () => void
}) {
  const basicFields: ReportFieldKey[] = ['week', 'course', 'department', 'professor', 'teamName', 'members']

  return (
    <section className="report-workspace">
      <div className="report-board">
        <aside className="report-history-panel" aria-label="주차별 보고서 목록">
          <div>
            <span>보고서 목록</span>
            <h2>주차별 제출본</h2>
            <p>제출된 보고서는 읽기 전용으로 보관됩니다.</p>
          </div>
          <div className="report-history-list">
            {reports.map((report) => (
              <button
                className={selectedReportId === report.id ? 'report-history-item active' : 'report-history-item'}
                type="button"
                key={report.id}
                onClick={() => onSelectReport(report.id)}
              >
                <strong>{report.week}</strong>
                <span>{report.title}</span>
                <small>{report.status === 'submitted' ? report.submittedAt : '작성 중'}</small>
                {report.readOnly && <em>읽기 전용</em>}
              </button>
            ))}
          </div>
        </aside>

        <div className="report-form-panel">
          <div className="report-hero">
            <span className={`report-status ${status}`}>{status === 'submitted' ? '제출 완료' : '작성 중'}</span>
            <h1>Flipped Learning 주차별 팀 보고서</h1>
            <p>{readOnly ? '제출 완료된 보고서는 내용 확인만 가능하며 수정할 수 없습니다.' : '학생용 보고서 양식을 그대로 옮겨 팀이 직접 작성하고 제출할 수 있습니다.'}</p>
            <div className="report-progress-row">
              <span>필수 항목 {progress}% 작성</span>
              <div className="report-progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <section className="report-card">
            <div className="report-section-head">
              <div>
                <span>기본 정보</span>
                <h2>보고서 정보</h2>
              </div>
              <small>{lastSubmittedAt}</small>
            </div>
            <div className="report-basic-grid">
              {basicFields.map((key) => (
                <ReportInput label={reportFieldLabels[key]} value={fields[key]} readOnly={readOnly} onChange={onFieldChange(key)} key={key} />
              ))}
            </div>
          </section>

          {reportSections.map((section) => (
            <section className="report-card" key={section.eyebrow}>
              <div className="report-section-head">
                <div>
                  <span>{section.eyebrow}</span>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
              </div>
              <div className="report-field-grid">
                {section.fields.map((field) =>
                  field.multiline ? (
                    <ReportTextarea
                      label={field.label}
                      value={fields[field.key]}
                      note={field.note}
                      readOnly={readOnly}
                      onChange={onFieldChange(field.key)}
                      key={field.key}
                    />
                  ) : (
                    <ReportInput
                      label={field.label}
                      value={fields[field.key]}
                      readOnly={readOnly}
                      onChange={onFieldChange(field.key)}
                      key={field.key}
                    />
                  ),
                )}
              </div>
            </section>
          ))}

          <section className="report-submit-strip">
            <span>
              <ShieldCheck size={22} />
              {readOnly
                ? '제출 완료된 보고서는 수정할 수 없습니다.'
                : canSubmit
                  ? '필수 항목이 모두 채워졌습니다.'
                  : '필수 항목을 작성하면 제출할 수 있습니다.'}
            </span>
            {!readOnly && (
              <button className="share-button" type="button" onClick={onSubmit} disabled={!canSubmit || status === 'submitted'}>
                <Send size={18} />
                {status === 'submitted' ? '제출 완료' : '보고서 제출'}
              </button>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}

function ReportInput({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string
  value: string
  readOnly: boolean
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  return (
    <label className="report-field">
      <span>{label}</span>
      <input value={value} onChange={onChange} readOnly={readOnly} />
    </label>
  )
}

function ReportTextarea({
  label,
  value,
  note,
  readOnly,
  onChange,
}: {
  label: string
  value: string
  note?: string
  readOnly: boolean
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  return (
    <label className="report-field full">
      <span>{label}</span>
      <textarea value={value} onChange={onChange} rows={4} readOnly={readOnly} />
      {note && <small>{note}</small>}
    </label>
  )
}

function ReportSubmitPreview({
  fields,
  status,
  progress,
  missingFields,
  lastSubmittedAt,
  canSubmit,
  readOnly,
  onSubmit,
}: {
  fields: ReportFields
  status: ReportStatus
  progress: number
  missingFields: ReportFieldKey[]
  lastSubmittedAt: string
  canSubmit: boolean
  readOnly: boolean
  onSubmit: () => void
}) {
  return (
    <>
      <h2>보고서 제출</h2>
      <p>
        <FileText size={17} />
        주차별 팀 보고서
      </p>
      <div className="snapshot-state-row">
        <span className={`snapshot-state ${status === 'submitted' ? 'shared' : 'idle'}`}>
          {status === 'submitted' ? '제출 완료' : '작성 중'}
        </span>
        <span>{progress}% 작성</span>
        <span>{lastSubmittedAt}</span>
      </div>
      <article className="preview-card report-preview-card">
        <div className="preview-team">
          <BarChart3 size={24} />
          <strong>{fields.teamName || '팀명 미입력'}</strong>
          <span className={`status-pill signal-pill ${status === 'submitted' ? 'ready' : 'normal'}`}>
            <span />
            {status === 'submitted' ? '제출됨' : '작성 중'}
          </span>
        </div>
        <div className="preview-row">
          <span>주차</span>
          <strong>{fields.week || '-'}</strong>
        </div>
        <hr />
        <div className="preview-row">
          <span>교과목</span>
          <strong>{fields.course || '-'}</strong>
        </div>
        <hr />
        <div className="preview-row">
          <span>팀원</span>
          <strong>{fields.members || '미입력'}</strong>
        </div>
        <hr />
        <div className="preview-summary">
          <span>사전학습 요약</span>
          <p>{fields.beforeSummary || '작성된 내용이 없습니다.'}</p>
        </div>
        <hr />
        <div className="preview-summary">
          <span>수업 중 활동</span>
          <p>{fields.activityContent || '작성된 내용이 없습니다.'}</p>
        </div>
      </article>
      <div className="snapshot-checklist">
        {missingFields.length === 0 ? (
          <span className="done">
            <CheckCircle2 size={16} />
            필수 항목 작성 완료
          </span>
        ) : (
          missingFields.slice(0, 6).map((key) => (
            <span className="pending" key={key}>
              <Clock3 size={16} />
              {reportFieldLabels[key]} 필요
            </span>
          ))
        )}
      </div>
      {readOnly ? (
        <div className="report-readonly-note">
          <ShieldCheck size={18} />
          제출된 보고서는 수정할 수 없습니다.
        </div>
      ) : (
        <button className="share-button report-submit-button" type="button" onClick={onSubmit} disabled={!canSubmit || status === 'submitted'}>
          <Send size={18} />
          {status === 'submitted' ? '제출 완료' : '보고서 제출'}
        </button>
      )}
    </>
  )
}

function StudentSidebar({
  activeView,
  onViewChange,
  reportSubmitted,
}: {
  activeView: StudentView
  onViewChange: (view: StudentView) => void
  reportSubmitted: boolean
}) {
  const items = [
    { label: '오늘 수업', icon: CalendarDays, view: 'workspace' as StudentView },
    { label: '팀 공간', icon: Users, view: 'workspace' as StudentView },
    { label: '수업 자료', icon: FileText },
    { label: '질문', icon: HelpCircle, badge: 2 },
    { label: '보고서', icon: BarChart3, view: 'report' as StudentView, badge: reportSubmitted ? '완료' : undefined },
  ]

  return (
    <aside className="student-sidebar">
      <nav>
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            item.view === 'report' ? activeView === 'report' : item.label === '팀 공간' && activeView === 'workspace'
          return (
            <button
              className={isActive ? 'student-nav active' : 'student-nav'}
              type="button"
              key={item.label}
              onClick={() => item.view && onViewChange(item.view)}
              aria-current={isActive ? 'page' : undefined}
            >
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

function DemoFlowPanel({ steps }: { steps: DemoFlowStep[] }) {
  return (
    <section className="demo-flow-panel" aria-label="학생 페이지 시연 순서">
      <div className="demo-flow-head">
        <span>Demo Flow</span>
        <h2>학생 시연 순서</h2>
      </div>
      <div className="demo-flow-list">
        {steps.map((step, index) => (
          <span className={step.done ? 'demo-flow-step done' : step.active ? 'demo-flow-step active' : 'demo-flow-step'} key={`${step.label}-${index}`}>
            <strong>{index + 1}</strong>
            <span>
              <b>{step.label}</b>
              <small>{step.detail}</small>
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}

function AssignedFormatTable({
  format,
  responses,
  onResponseChange,
}: {
  format: ClassFormat
  responses: Record<string, string>
  onResponseChange: (rowId: string, columnId: string, value: string) => void
}) {
  const tableWidth = format.tableTemplate.columns.reduce((sum, column) => sum + column.width, 160)
  const answerOnlyTable = formatUsesAnswerOnlyTable(format)

  return (
    <section className="workspace-card assigned-table-card">
      <div className="card-title">
        <span>1</span>
        <div>
          <h2>교수 제공 표</h2>
          <p>요구사항 행을 읽고 학생 입력 행에 팀의 답변을 작성합니다.</p>
        </div>
        <strong className="assigned-format-chip">{formatPhaseLabels[format.phase]}</strong>
      </div>
      <div className="student-table-scroll">
        <table className="student-format-table" style={{ minWidth: tableWidth }}>
          <colgroup>
            <col style={{ width: 150 }} />
            {format.tableTemplate.columns.map((column) => (
              <col style={{ width: column.width }} key={column.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th>구분</th>
              {format.tableTemplate.columns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {format.tableTemplate.rows.map((row) => (
              <tr className={row.role} key={row.id}>
                <th>
                  <span className={`row-role ${row.role}`}>{rowRoleLabels[row.role]}</span>
                  <strong>{row.label}</strong>
                </th>
                {format.tableTemplate.columns.map((column) => {
                  const responseKey = formatResponseKey(format.phase, row.id, column.id)
                  const canEditCell = row.role === 'response' && (!answerOnlyTable || column.id === 'answer')
                  return (
                    <td key={column.id}>
                      {!canEditCell ? (
                        <p>{row.cells[column.id]}</p>
                      ) : (
                        <textarea
                          value={responses[responseKey] ?? row.cells[column.id] ?? ''}
                          onChange={(event) => onResponseChange(row.id, column.id, event.target.value)}
                          placeholder={`${column.label}에 대한 팀 답변`}
                          rows={4}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
