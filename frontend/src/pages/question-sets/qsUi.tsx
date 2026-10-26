import type { SubjectCode } from '@/types/api'
import { subjectArt } from '@/utils/questionSets'

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
