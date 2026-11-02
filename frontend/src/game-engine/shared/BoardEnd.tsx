import i18n from 'i18next'
import { motion } from 'motion/react'
import { playButtonClass } from '@/game-engine/shared/PlayFrame'

/** The end of a board (a win or a draw): the news, then a new board or the results. */
export function BoardEnd({ title, onNewBoard, onResults }: { title: string; onNewBoard: () => void; onResults: () => void }) {
  return (
    <div className="mt-auto flex flex-col gap-3">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        role="status"
        className="font-display text-[38px] leading-tight font-extrabold text-primary-ink"
      >
        {title}
      </motion.span>
      <div className="flex gap-3">
        <button type="button" onClick={onNewBoard} className={`${playButtonClass} bg-white text-ink`}>
          {i18n.t('play.common.newRound')}
        </button>
        <button type="button" onClick={onResults} className={`${playButtonClass} bg-primary text-white hover:brightness-110`}>
          {i18n.t('play.common.seeResults')}
        </button>
      </div>
    </div>
  )
}
