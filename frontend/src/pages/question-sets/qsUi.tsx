import type { ReactNode } from 'react'
import type { QuestionSetSummaryResponse, SubjectCode } from '@/types/api'
import { gradeText, KIND_LABELS, kindOf, subjectArt, subjectInfo } from '@/utils/questionSets'

/** Illustrations of the question set pages (scripts/make_question_art.py). */
export const QS_ASSETS = '/assets/question-sets'

/** The set's picture, by subject. Decorative: the title is always next to it. */
export function SubjectThumb({ subject, className = '' }: { subject: SubjectCode; className?: string }) {
  return (
    <img
      src={subjectArt(subject)}
      alt=""
      draggable={false}
      className={`block aspect-[120/104] shrink-0 rounded-[16px] select-none ${className}`}
    />
  )
}

export function Chip({ children, tint, ink }: { children: ReactNode; tint: string; ink: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full px-2.5 text-[12.5px] font-bold whitespace-nowrap" style={{ background: tint, color: ink }}>
      {children}
    </span>
  )
}

/** Subject, grade and kind of questions. */
export function SetChips({ set }: { set: QuestionSetSummaryResponse }) {
  const subject = subjectInfo(set.subject)
  const kind = kindOf(set)
  return (
    <span className="flex flex-wrap gap-1.5">
      <Chip tint={subject.tint} ink={subject.ink}>
        {subject.label}
      </Chip>
      <Chip tint="#E3ECFF" ink="#2449B8">
        {gradeText(set.grade)}
      </Chip>
      <Chip tint={kind === 'EMPTY' ? '#F1F4FA' : '#F7E8FB'} ink={kind === 'EMPTY' ? '#5A6788' : '#8A2BA8'}>
        {KIND_LABELS[kind]}
      </Chip>
    </span>
  )
}

/** A number over its label, in a soft box ("20 Câu hỏi"). */
export function StatBox({ value, label, title }: { value: string; label: string; title?: string }) {
  return (
    <span title={title} className="flex min-w-[76px] flex-col items-center justify-center rounded-[14px] bg-surface-soft px-3 py-2 leading-tight">
      <span className="text-[17px] font-black tabular-nums">{value}</span>
      <span className="text-[12.5px] text-ink-muted">{label}</span>
    </span>
  )
}
