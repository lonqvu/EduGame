import { motion } from 'motion/react'
import { useReducer, useState } from 'react'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { baseLetter, hangmanReducer, hangmanTurn, initialHangman, KEYBOARD, wordQuestions } from '@/game-engine/words/words'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, Question } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'

interface HangmanScreenProps {
  game: GameSummary
  questions: Question[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Đoán chữ": a clue and its answer as empty boxes. The teams take turns guessing a letter (the teacher
 * taps it): a letter in the word opens all its boxes and the team guesses again; else the turn passes. On its turn,
 * a team may solve the whole word for a bonus.
 */
export function HangmanScreen({ game, questions, settings }: HangmanScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.HANGMAN)
  const deal = () => wordQuestions(questions, { shuffleItems: rules.shuffleItems })
  const [words, setWords] = useState(deal)
  const [state, dispatch] = useReducer(hangmanReducer, rules.teams, initialHangman)
  /** A team said the whole word: the teacher judges it. */
  const [solving, setSolving] = useState(false)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (words.length === 0) {
    return <NothingToPlay message="Chưa có câu nào có đáp án là chữ (tối đa 16 chữ cái) để chơi." backTo={backTo} />
  }
  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setWords(deal())
    setSolving(false)
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Đoán trúng nhiều nhất" streakUnit="lần" />

  const question = words[state.index]
  const team = hangmanTurn(state)
  const isLast = state.index === words.length - 1
  const inWord = new Set(question.words.flat().map(baseLetter))
  const solver = state.teams.find((t) => t.id === state.solvedBy)
  let k = 0

  const judge = (right: boolean) => {
    sound.play(right ? 'fanfare' : 'wrong')
    dispatch({ type: 'solve', right, question, points: rules.points, bonus: rules.keywordPoints })
    setSolving(false)
  }

  return (
    <PlayFrame title={game.title} progress={`Từ ${state.index + 1} / ${words.length}`} backTo={backTo}>
      <div className="flex min-h-[80px] items-center gap-5 rounded-[28px] bg-white px-7 py-3">
        {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[70px] w-[96px] shrink-0 rounded-2xl object-cover" />}
        <span className="text-lg font-extrabold text-primary-ink">Gợi ý</span>
        <span className="font-display text-[32px] leading-tight font-extrabold">{question.clue}</span>
      </div>

      <div
        className="flex min-h-[120px] flex-wrap content-center items-center justify-center gap-x-8 gap-y-3 rounded-[28px] bg-[linear-gradient(160deg,#2B3A86,#1A2360)] px-6 py-4"
        role="group"
        aria-label="Ô chữ"
      >
        {question.words.map((word, w) => (
          <div key={w} className="flex gap-2">
            {word.map((letter) => {
              const at = k++
              const open = state.revealed || state.guessed.includes(baseLetter(letter))
              return (
                <motion.span
                  key={`${state.index}-${at}`}
                  animate={open ? { rotateY: [90, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  aria-label={open ? `Ô ${at + 1}: ${letter}` : `Ô ${at + 1}, chưa mở`}
                  className={`flex h-[74px] w-[60px] items-center justify-center rounded-2xl font-display text-[42px] font-extrabold ${
                    open ? (state.revealed && !state.solvedBy ? 'bg-[#FFD15C] text-ink' : 'bg-white text-ink') : 'bg-[#3E51B5]'
                  }`}
                >
                  {open && letter}
                </motion.span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(17,minmax(0,1fr))] gap-1.5" role="group" aria-label="Bảng chữ cái">
        {KEYBOARD.map((letter) => {
          const guessed = state.guessed.includes(letter)
          const hit = guessed && inWord.has(letter)
          return (
            <button
              key={letter}
              type="button"
              disabled={guessed || state.revealed || solving}
              onClick={() => {
                const count = question.words.flat().filter((ch) => baseLetter(ch) === letter).length
                sound.play(count ? 'correct' : 'wrong')
                dispatch({ type: 'guess', letter, question, points: rules.points, bonus: rules.keywordPoints })
              }}
              aria-label={`Chữ ${letter}`}
              className={`flex h-[50px] cursor-pointer items-center justify-center rounded-xl border-0 font-display text-[24px] font-extrabold disabled:cursor-default ${
                hit ? 'bg-success text-white' : guessed ? 'bg-danger/80 text-white opacity-60' : 'bg-white text-ink shadow-[inset_0_-4px_0_#D5DEEE] disabled:opacity-40'
              }`}
            >
              {letter}
            </button>
          )
        })}
      </div>

      <TeamBar teams={state.teams} activeId={state.revealed ? state.solvedBy : team.id} activeLabel={state.revealed ? 'Giải được ô chữ' : 'Đến lượt'} />

      {solving ? (
        <div className="mt-auto flex items-center justify-between gap-4">
          <span className="pl-[76px] text-xl font-extrabold">{team.name} giải ô chữ. Cô chấm nhé!</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => setSolving(false)} className={`${playButtonClass} bg-white text-ink`}>
              Hủy
            </button>
            <button type="button" onClick={() => judge(false)} className={`${playButtonClass} bg-danger text-white`}>
              Sai
            </button>
            <button type="button" onClick={() => judge(true)} className={`${playButtonClass} bg-success text-white`}>
              Đúng
            </button>
          </div>
        </div>
      ) : (
        <PlayFooter
          message={
            state.revealed
              ? solver
                ? `${solver.name} giải được ô chữ: ${question.answer}!`
                : `Đáp án: ${question.answer}`
              : state.last
                ? state.last.count
                  ? `Có ${state.last.count} chữ ${state.last.letter}! ${team.name} đoán tiếp.`
                  : `Không có chữ ${state.last.letter}. Đến lượt ${team.name}.`
                : `${team.name} đoán một chữ cái.`
          }
          revealed={state.revealed}
          onReveal={() => dispatch({ type: 'reveal' })}
          onFinish={() => dispatch({ type: 'finish' })}
          onNext={() => dispatch({ type: 'next', total: words.length })}
          nextLabel={isLast ? 'Xem kết quả' : 'Từ tiếp theo'}
          extra={
            !state.revealed && (
              <button type="button" onClick={() => setSolving(true)} className={`${playButtonClass} bg-sun text-ink`}>
                Giải ô chữ
              </button>
            )
          }
        />
      )}
    </PlayFrame>
  )
}
