/**
 * "Rung chuông vàng": the whole class answers each question on their boards. Once the answer is shown, the teacher
 * taps the students who got it wrong; they are out from the next question on. When every student still in got it
 * wrong, nobody is out (the question was too hard). A rescue ("Cứu trợ") brings every student who is out back in.
 * The game ends after the last question, or as soon as one student is left: who is still in rings the golden bell.
 */
export interface GoldenBellState {
  index: number
  /** The right answer is shown and the teacher marks who was wrong. */
  revealed: boolean
  /** Student id → number of the question (1-based) they were out at. */
  out: Record<string, number>
  /** Marked wrong on the current question (applied when moving on). */
  wrongNow: string[]
  rescuesLeft: number
  /** Last question: every student still in was wrong, so nobody was out. */
  everyoneWrong: boolean
  finished: boolean
}

export type GoldenBellAction =
  | { type: 'reveal' }
  | { type: 'toggleWrong'; studentId: string }
  /** Applies the marks; `studentIds` is the whole class. */
  | { type: 'next'; total: number; studentIds: string[] }
  | { type: 'rescue' }
  | { type: 'finish' }
  | { type: 'restart'; rescues: number }

export const initialGoldenBell = (rescues: number): GoldenBellState => ({
  index: 0,
  revealed: false,
  out: {},
  wrongNow: [],
  rescuesLeft: rescues,
  everyoneWrong: false,
  finished: false,
})

/** Students still in the game, in class order. */
export const stillIn = (state: GoldenBellState, studentIds: string[]) => studentIds.filter((id) => !(id in state.out))

export function goldenBellReducer(state: GoldenBellState, action: GoldenBellAction): GoldenBellState {
  if (state.finished && action.type !== 'restart') return state
  switch (action.type) {
    case 'reveal':
      return { ...state, revealed: true }

    case 'toggleWrong': {
      if (!state.revealed || action.studentId in state.out) return state
      const marked = state.wrongNow.includes(action.studentId)
      return {
        ...state,
        wrongNow: marked ? state.wrongNow.filter((id) => id !== action.studentId) : [...state.wrongNow, action.studentId],
      }
    }

    case 'next': {
      if (!state.revealed) return state
      const remaining = stillIn(state, action.studentIds)
      const wrong = remaining.filter((id) => state.wrongNow.includes(id))
      const everyoneWrong = remaining.length > 0 && wrong.length === remaining.length
      const out = { ...state.out }
      if (!everyoneWrong) for (const id of wrong) out[id] = state.index + 1
      const left = remaining.length - (everyoneWrong ? 0 : wrong.length)
      const done = state.index + 1 >= action.total || left <= 1
      return {
        ...state,
        out,
        everyoneWrong,
        wrongNow: [],
        revealed: done ? state.revealed : false,
        index: done ? state.index : state.index + 1,
        finished: done,
      }
    }

    case 'rescue':
      if (state.rescuesLeft <= 0 || Object.keys(state.out).length === 0) return state
      return { ...state, out: {}, rescuesLeft: state.rescuesLeft - 1, everyoneWrong: false }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialGoldenBell(action.rescues)
  }
}
