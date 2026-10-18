import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { beginPlaySession, finishPlaySession } from '@/store/playSessionStore'
import type { GameResults } from '@/types/api'

/** /play/:gameId opened with the game ready: the class starts playing it. */
export function useBeginPlaySession(ready: boolean) {
  const { gameId } = useParams()
  useEffect(() => {
    if (ready && gameId) void beginPlaySession(gameId)
  }, [ready, gameId])
}

/**
 * Results of /play/:gameId on screen: the class completed the game, with these results (as the screen first showed
 * them). Returns the "play again" handler, which starts the next game of the class.
 */
export function useFinishPlaySession(onPlayAgain: () => void, results?: GameResults): () => void {
  const { gameId } = useParams()
  // The results as first shown: the session ends once, when the results screen opens.
  const [shown] = useState(results)
  useEffect(() => {
    if (gameId) void finishPlaySession(gameId, shown)
  }, [gameId, shown])
  return () => {
    if (gameId) void beginPlaySession(gameId)
    onPlayAgain()
  }
}
