import { Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ClockIcon, MoreVerticalIcon, PlayIcon } from '@/components/ui/icons'
import { editPath, gameRegistry, playPath, startPath } from '@/game-engine/registry'
import { gameThumb } from '@/pages/home/homeAssets'
import { Panel, PanelHeader, SubjectTag, TextAction } from '@/pages/home/homeUi'
import type { GameSummary } from '@/types/game'

interface RecentActivityProps {
  games: GameSummary[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  expanded: boolean
  onToggleExpanded: () => void
  templateName: (game: GameSummary) => string
  /** "Lớp 3A · 10 câu hỏi · Hôm qua 14:30" */
  meta: (game: GameSummary) => string
  onRetry: () => void
  onArchive: (game: GameSummary) => void
}

/** Latest games, newest first, with a button to play them again. */
export function RecentActivity({
  games,
  status,
  expanded,
  onToggleExpanded,
  templateName,
  meta,
  onRetry,
  onArchive,
}: RecentActivityProps) {
  const { t } = useTranslation()
  return (
    <Panel className="@container flex flex-col gap-3 px-4 pt-[18px] pb-4">
      <PanelHeader
        icon={<ClockIcon size={23} className="text-primary" />}
        title={t('home.recent.title')}
        action={
          games.length > 0 && <TextAction label={expanded ? t('home.recent.collapse') : t('home.recent.showAll')} onClick={onToggleExpanded} />
        }
      />

      {status === 'loading' && games.length === 0 && <p className="m-0 px-2 text-ink-soft">{t('home.recent.loading')}</p>}
      {status === 'error' && (
        <p className="m-0 px-2 text-ink-soft">
          {t('home.recent.error')}{' '}
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-extrabold text-primary-ink underline"
          >
            {t('common.retry')}
          </button>
        </p>
      )}
      {status === 'ready' && games.length === 0 && (
        <p className="m-0 px-2 text-ink-soft">
          {t('home.recent.empty')}{' '}
          <Link to="/games/new" className="font-extrabold text-primary-ink underline">
            {t('home.recent.createFirst')}
          </Link>
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
        {games.map((game) => {
          const usesQuestions = gameRegistry[game.type].usesQuestions
          // A question game with nothing in it yet is still being written: continue editing it.
          const unfinished = usesQuestions && game.itemCount === 0
          return (
            <li
              key={game.id}
              className="flex items-center gap-3 rounded-[14px] border border-[#EDF1F7] bg-white p-[7px] pr-2 pl-3 @min-[480px]:gap-[18px] @min-[480px]:pl-[7px] shadow-[0_1px_3px_rgba(31,42,68,0.04)]"
            >
              <img
                src={gameThumb(game.type)}
                alt=""
                className="hidden aspect-[2/1] w-[132px] shrink-0 rounded-[10px] @min-[480px]:block"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <div className="flex min-w-0 flex-wrap items-center gap-x-[11px] gap-y-1">
                  <span className="truncate text-[16px] font-extrabold">{templateName(game)}</span>
                  <SubjectTag subject={game.subject} />
                </div>
                <span className="truncate text-[14px] text-[#3F4B68]">{game.title}</span>
                <span className="truncate text-[13.5px] text-ink-muted">{meta(game)}</span>
              </div>
              {unfinished ? (
                <Link
                  to={editPath(game.id)}
                  className="flex h-[38px] shrink-0 items-center justify-center rounded-full border-2 border-[#DCE5F5] bg-white px-3.5 text-[14.5px] font-extrabold text-primary-ink hover:border-primary hover:text-primary-ink"
                >
                  {t('home.recent.resume')}
                </Link>
              ) : (
                <Link
                  to={playPath(game)}
                  aria-label={t('home.recent.replayLabel', { title: game.title })}
                  className="flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-[#DCE5F5] bg-white px-3.5 text-[14.5px] font-extrabold text-primary-ink hover:border-primary hover:text-primary-ink"
                >
                  <PlayIcon size={14} className="fill-current" />
                  <span className="hidden @min-[380px]:inline">{t('home.recent.replay')}</span>
                </Link>
              )}
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  items: [
                    ...(usesQuestions ? [{ key: 'edit', label: <Link to={editPath(game.id)}>{t('home.recent.editQuestions')}</Link> }] : []),
                    { key: 'play', label: <Link to={startPath(game)}>{t('home.recent.rulesSettings')}</Link> },
                    { type: 'divider' as const },
                    { key: 'archive', danger: true, label: t('home.recent.remove'), onClick: () => onArchive(game) },
                  ],
                }}
              >
                <button
                  type="button"
                  aria-label={t('home.recent.optionsFor', { title: game.title })}
                  className="flex h-10 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#3F4B68] hover:bg-surface-soft"
                >
                  <MoreVerticalIcon size={20} />
                </button>
              </Dropdown>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
