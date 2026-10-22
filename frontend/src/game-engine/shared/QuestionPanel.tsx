import { QuizOption } from '@/game-engine/quiz/QuizParts'
import { questionFontSize, type PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import { assetSrc } from '@/utils/images'

interface QuestionPanelProps {
  question: PlayableQuizQuestion
  /** Options already tried → whether they were right. */
  tried: Record<string, boolean>
  revealed: boolean
  /** A team is answering: the options can be picked. */
  canChoose: boolean
  onChoose: (optionId: string) => void
  /** Options side by side (2 or 3 columns), or one under the other. */
  layout?: 'grid' | 'list'
  /** Font size of the question before long ones are shrunk. */
  fontSize?: number
}

/** A quiz question on the projector: its text (and picture), then its options, answered right, wrong or not yet. */
export function QuestionPanel({ question, tried, revealed, canChoose, onChoose, layout = 'grid', fontSize = 40 }: QuestionPanelProps) {
  return (
    <>
      <div className="flex min-h-[96px] items-center gap-5 rounded-[28px] bg-white px-7 py-3">
        {question.imageUrl && (
          <img src={assetSrc(question.imageUrl)} alt="" className="h-[84px] w-[116px] shrink-0 rounded-2xl object-cover" />
        )}
        <span className="font-display leading-[1.1] font-extrabold" style={{ fontSize: questionFontSize(question.text, fontSize) }}>
          {question.text}
        </span>
      </div>
      <div
        className={`grid gap-2.5 ${layout === 'list' ? 'grid-cols-1' : question.options.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}
      >
        {question.options.map((option, i) => {
          const result = tried[option.id]
          const right = option.id === question.correctId
          return (
            <QuizOption
              key={option.id}
              option={option}
              index={i}
              trueFalse={question.trueFalse}
              compact
              look={revealed && right ? 'right' : result === false ? 'wrong' : revealed ? 'dim' : 'idle'}
              disabled={!canChoose || revealed || result !== undefined}
              onClick={() => onChoose(option.id)}
            />
          )
        })}
      </div>
    </>
  )
}
