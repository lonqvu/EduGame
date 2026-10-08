import { Dropdown } from 'antd'
import { Link } from 'react-router'
import { ClockIcon, MoreVerticalIcon } from '@/components/ui/icons'
import { editPath, gameRegistry, playPath } from '@/game-engine/registry'
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
  return (
    <Panel className="@container flex flex-col gap-3 px-4 pt-[18px] pb-4">
      <PanelHeader
        icon={<ClockIcon size={23} className="text-primary" />}
        title="Hoạt động gần đây"
        action={
          games.length > 0 && <TextAction label={expanded ? 'Thu gọn' : 'Xem tất cả'} onClick={onToggleExpanded} />
        }
      />

      {status === 'loading' && games.length === 0 && <p className="m-0 px-2 text-ink-soft">Đang tải trò chơi…</p>}
      {status === 'error' && (
        <p className="m-0 px-2 text-ink-soft">
          Chưa tải được danh sách trò chơi.{' '}
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-extrabold text-primary-ink underline"
          >
            Thử lại
          </button>
        </p>
      )}
      {status === 'ready' && games.length === 0 && (
        <p className="m-0 px-2 text-ink-soft">
          Cô chưa có trò chơi nào.{' '}
          <Link to="/games/new" className="font-extrabold text-primary-ink underline">
            Tạo trò chơi đầu tiên
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
                className="hidden h-[74px] w-[119px] shrink-0 rounded-[10px] object-cover @min-[480px]:block"
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
                  className="flex h-[38px] w-[85px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary bg-white text-[15px] font-extrabold text-primary-ink hover:text-primary-ink"
                >
                  Tiếp tục
                </Link>
              ) : (
                <Link
                  to={playPath(game)}
                  className="flex h-[38px] w-[85px] shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-white hover:text-white hover:brightness-110"
                >
                  Chơi lại
                </Link>
              )}
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  items: [
                    ...(usesQuestions ? [{ key: 'edit', label: <Link to={editPath(game.id)}>Soạn câu hỏi</Link> }] : []),
                    { key: 'play', label: <Link to={playPath(game)}>Trình chiếu</Link> },
                    { type: 'divider' as const },
                    { key: 'archive', danger: true, label: 'Xóa khỏi thư viện', onClick: () => onArchive(game) },
                  ],
                }}
              >
                <button
                  type="button"
                  aria-label={`Tùy chọn cho ${game.title}`}
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
