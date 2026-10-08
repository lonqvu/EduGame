import { useEffect } from 'react'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useGridBoardStore } from '@/store/gridBoardStore'
import type { Question } from '@/types/game'

const EMPTY: Question[] = []

/** Game + its playable questions (tile N = question N), with a round started for it. */
export function useGridBoardRound(gameId: string) {
  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))
  const allQuestions = useGameLibraryStore((s) => (s.items[gameId] ?? EMPTY) as Question[])
  const ensureRound = useGridBoardStore((s) => s.ensureRound)
  const roundGameId = useGridBoardStore((s) => s.gameId)

  useEffect(() => {
    ensureRound(gameId)
  }, [ensureRound, gameId])

  const questions = allQuestions.filter((q) => q.text.trim())
  return { game, questions, ready: roundGameId === gameId }
}
