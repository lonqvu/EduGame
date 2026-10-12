import { useEffect } from 'react'
import { useParams } from 'react-router'
import { beginPlaySession, finishPlaySession } from '@/store/playSessionStore'

/** /play/:gameId opened with the game ready: the class starts playing it. */
export function useBeginPlaySession(ready: boolean) {
  const { gameId } = useParams()
  useEffect(() => {
    if (ready && gameId) void beginPlaySession(gameId)
  }, [ready, gameId])
}

/**
 * Results of /play/:gameId on screen: the class completed the game. Returns the "play again" handler, which starts the
 * next game of the class.
 */
export function useFinishPlaySession(onPlayAgain: () => void): () => void {
  const { gameId } = useParams()
  useEffect(() => {
    if (gameId) void finishPlaySession(gameId)
  }, [gameId])
  return () => {
    if (gameId) void beginPlaySession(gameId)
    onPlayAgain()
  }
}
