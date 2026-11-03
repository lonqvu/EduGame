import { App } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ArrowRightIcon, StarIcon } from '@/components/ui/icons'
import { gameRegistry } from '@/game-engine/registry'
import { entriesOf, type ChooserEntry } from '@/pages/choose-game/chooserEntries'
import { GameTile } from '@/pages/choose-game/GameTile'
import { usePlayNow } from '@/pages/choose-game/usePlayNow'
import { Panel, PanelHeader } from '@/pages/home/homeUi'
import { useCatalogStore } from '@/store/catalogStore'

/** The games put forward, by their chooser key: the most played question games, and the two with painted art. */
const FEATURED = ['GRID_BOARD', 'QUIZ', 'GOLDEN_BELL', 'BOAT_RACE', 'BEE_FLOWER', 'pick-horse']
/** Marked "Phổ biến" like at the top of their group in "Trò chơi". */
const POPULAR = new Set(['GRID_BOARD', 'QUIZ', 'GOLDEN_BELL'])

/**
 * A few games of "Trò chơi", with the very same cards (hover shows the rules, a click plays it at once); "Xem tất cả"
 * opens the whole list.
 */
export function FeaturedGames() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const templates = useCatalogStore((s) => s.templates)
  const { playNow, busy } = usePlayNow()

  const entries = templates.flatMap(entriesOf)
  const featured = FEATURED.flatMap((key) => entries.find((e) => e.key === key) ?? [])
  if (featured.length === 0) return null

  const play = ({ template, pickMode }: ChooserEntry) => {
    if (!gameRegistry[template.type].playable) {
      message.info(t('chooser.soon', { name: template.name }))
      return
    }
    void playNow(template.type, pickMode ? `/tools/pick/${pickMode}` : undefined)
  }

  return (
    <Panel className="@container flex flex-col gap-3 px-4 pt-[18px] pb-4">
      <PanelHeader
        icon={<StarIcon size={23} className="fill-[#FFC53D] text-[#FFC53D]" />}
        title={t('home.featured.title')}
        action={
          <Link to="/games/new" className="flex shrink-0 items-center gap-2 text-[14px] font-bold text-primary hover:text-primary-ink">
            {t('home.featured.all')}
            <ArrowRightIcon size={17} strokeWidth={2.4} />
          </Link>
        }
      />
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-4 p-0 @min-[480px]:grid-cols-3 @min-[900px]:grid-cols-6">
        {featured.map((entry) => (
          <li key={entry.key} className="min-w-0">
            <GameTile
              entry={entry}
              popular={POPULAR.has(entry.key)}
              opening={busy === entry.template.type && !entry.pickMode}
              onPlay={() => play(entry)}
            />
          </li>
        ))}
      </ul>
    </Panel>
  )
}
