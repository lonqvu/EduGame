import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, FilledStarIcon } from '@/components/ui/icons'
import type { GameGuide, GuideGameType } from '@/game-engine/gameGuide'
import { gameThumb } from '@/pages/home/homeAssets'

interface RulesShowProps {
  mode: GuideGameType
  title: string
  guide: GameGuide
  onClose: () => void
  /**
   * Goes full screen while open (from the start page). Off on the projector, which may already be full screen and
   * must stay so when the rules close.
   */
  fullscreen?: boolean
}

const STEP_COLORS = ['#3563E9', '#F28C28', '#2E9E6A', '#8B5CF6']

/** A page of the show: a big heading and its content, on the white board of the projector. */
function Slide({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-6 rounded-[40px] bg-white px-16 py-10">
      <h2 className="m-0 font-display text-[50px] leading-tight font-extrabold text-primary-ink">{heading}</h2>
      <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
    </div>
  )
}

/**
 * The rules for the class on the projector: full screen, big type, one topic per page (goal, rules, how to play, who
 * wins). Only what the class needs: no settings, no teacher notes, no answers. ←/→ change page, Esc closes.
 */
export function RulesShow({ mode, title, guide, onClose, fullscreen = true }: RulesShowProps) {
  const [page, setPage] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  // Up to six rules must fit the board: longer lists get smaller type and tighter rows.
  const dense = guide.rules.length > 4
  const ruleSize = dense ? 'gap-4 text-[29px]' : 'gap-5 text-[36px]'

  const pages: ReactNode[] = [
    <div key="cover" className="flex h-full flex-col items-center justify-center gap-8 rounded-[40px] bg-white px-16 text-center">
      <img src={gameThumb(mode)} alt="" className="aspect-[2/1] w-[460px] rounded-[28px]" />
      <h2 className="m-0 font-display text-[64px] leading-tight font-extrabold">{title}</h2>
      <p className="m-0 max-w-[960px] text-[36px] leading-snug text-ink-soft">{guide.goal}</p>
    </div>,
    <Slide key="rules" heading="Luật chơi">
      <ol className={`m-0 flex list-none flex-col p-0 ${ruleSize}`}>
        {guide.rules.map((rule, i) => (
          <li key={rule} className="flex items-center gap-5 leading-snug">
            <span
              className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-black text-white ${dense ? 'size-[44px] text-[24px]' : 'size-[52px] text-[28px]'}`}
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{rule}</span>
          </li>
        ))}
      </ol>
    </Slide>,
    <Slide key="steps" heading="Cách chơi">
      <ol className="m-0 grid list-none grid-cols-4 gap-6 p-0">
        {guide.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col items-center gap-4 rounded-[28px] bg-projector px-5 py-8 text-center">
            <span
              className="flex size-[76px] items-center justify-center rounded-full text-[40px] font-black text-white"
              style={{ background: STEP_COLORS[i % STEP_COLORS.length] }}
            >
              {i + 1}
            </span>
            <span className="font-display text-[32px] leading-tight font-extrabold">{step.title}</span>
            <span className="text-[24px] leading-snug text-ink-soft">{step.text}</span>
          </li>
        ))}
      </ol>
    </Slide>,
    <div key="winner" className="flex h-full flex-col items-center justify-center gap-8 rounded-[40px] bg-white px-16 text-center">
      <FilledStarIcon size={120} stroke="#F5B400" fill="#FFC928" />
      <h2 className="m-0 font-display text-[54px] font-extrabold text-primary-ink">Ai chiến thắng?</h2>
      <p className="m-0 max-w-[1000px] text-[40px] leading-snug">{guide.winner}</p>
      <p className="m-0 text-[30px] font-bold text-success">Chúc cả lớp chơi thật vui!</p>
    </div>,
  ]
  const last = pages.length - 1

  // Full screen while it is open; leaving full screen (Esc in the browser) closes the show too.
  useEffect(() => {
    if (!fullscreen) return
    let entered = false
    const el = root.current
    el?.requestFullscreen?.().then(
      () => (entered = true),
      () => undefined,
    )
    const onChange = () => {
      if (entered && !document.fullscreenElement) onClose()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    }
  }, [onClose, fullscreen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') setPage((p) => Math.min(p + 1, last))
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage((p) => Math.max(p - 1, 0))
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

  const navButton = 'flex h-14 cursor-pointer items-center gap-2 rounded-full border-0 px-6 font-[inherit] text-[20px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label={`Luật chơi: ${title}`} className="fixed inset-0 z-[1100]">
      <ProjectorStage background={PROJECTOR_BOARD_BG}>
        <div className="flex h-full flex-col gap-5 px-10 py-7">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white px-5 py-2 text-[20px] font-extrabold">{title}</span>
            <button type="button" onClick={onClose} className={`${navButton} bg-white text-ink hover:text-primary-ink`}>
              <CloseIcon size={22} />
              Thoát
            </button>
          </div>
          <div className="min-h-0 flex-1">{pages[page]}</div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} className={`${navButton} bg-white text-ink`}>
              <ChevronLeftIcon size={24} />
              Trước
            </button>
            <div className="flex items-center gap-3" aria-label={`Trang ${page + 1} / ${pages.length}`}>
              {pages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`Trang ${i + 1}`}
                  aria-current={i === page}
                  className={`h-4 cursor-pointer rounded-full border-0 p-0 transition-all ${i === page ? 'w-10 bg-primary' : 'w-4 bg-white'}`}
                />
              ))}
            </div>
            {page < last ? (
              <button type="button" onClick={() => setPage(page + 1)} className={`${navButton} bg-primary text-white`}>
                Tiếp
                <ChevronRightIcon size={24} />
              </button>
            ) : (
              <button type="button" onClick={onClose} className={`${navButton} bg-primary text-white`}>
                Xong
                <ChevronRightIcon size={24} />
              </button>
            )}
          </div>
        </div>
      </ProjectorStage>
    </div>
  )
}
