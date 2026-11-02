import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ArrowRightIcon, PlayIcon } from '@/components/ui/icons'
import { toolPath } from '@/game-engine/registry'
import { gameThumb } from '@/pages/home/homeAssets'
import { Art, Panel, PanelHeader } from '@/pages/home/homeUi'
import type { QuestionSetSummaryResponse } from '@/types/api'
import type { GameType } from '@/types/game'
import { subjectArt, subjectInfo } from '@/utils/questionSets'

/** What a teacher reaches for in the middle of a lesson. */
/** The tools of the home page; name and line in home.tools.* (`TYPE`, `TYPE_text`). */
const CLASS_TOOLS = ['SPIN_WHEEL', 'TIMER', 'TEAM_MAKER', 'NOISE_METER'] as const satisfies readonly GameType[]

/** Four classroom tools, each opened in one tap. */
export function ClassTools() {
  const { t } = useTranslation()
  return (
    <Panel className="flex flex-col gap-3 px-[15px] pt-[16px] pb-[15px]">
      <PanelHeader
        icon={<span aria-hidden="true" className="text-[22px] leading-none">🧰</span>}
        title={t('home.tools.title')}
        action={<MoreLink to="/games/new" label={t('home.tools.all')} />}
      />
      <ul aria-label={t('home.tools.title')} className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
        {CLASS_TOOLS.map((tool) => (
          <li key={tool}>
            <Link
              to={toolPath(tool)}
              className="flex flex-col overflow-hidden rounded-[16px] border-2 border-transparent bg-[#F6F8FC] text-ink transition hover:-translate-y-0.5 hover:border-[#C9D9F5] hover:text-ink"
            >
              <img src={gameThumb(tool)} alt="" className="block aspect-[12/5] w-full object-cover" />
              <span className="px-[11px] pt-[7px] text-[14.5px] font-black">{t(`home.tools.${tool}`)}</span>
              <span className="px-[11px] pb-[9px] text-[12.5px] text-ink-muted">{t(`home.tools.${tool}_text`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** The teacher's last changed question sets: open one, or play it at once ("▶ Chơi" picks the game). */
export function QuestionSets({ sets, onPlay }: { sets: QuestionSetSummaryResponse[]; onPlay: (set: QuestionSetSummaryResponse) => void }) {
  const { t } = useTranslation()
  return (
    <Panel className="flex flex-col gap-[6px] px-[15px] pt-[17px] pb-[11px]">
      <PanelHeader
        icon={<Art name="icon-folder" className="h-[26px] w-[28px]" />}
        title={t('home.sets.title')}
        action={<MoreLink to="/question-sets" label={t('home.sets.showAll')} />}
      />
      {sets.length === 0 && (
        <p className="m-0 px-1 pt-2 pb-1 text-[14px] text-ink-soft">
          <Trans i18nKey="home.sets.empty" components={{ link: <Link to="/question-sets" /> }} />
        </p>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {sets.map((set) => (
          <li key={set.code} className="flex items-center gap-3 border-b border-[#EEF2F8] py-[9px] last:border-b-0">
            <Link
              to={`/question-sets/${encodeURIComponent(set.code)}`}
              className="flex min-w-0 flex-1 items-center gap-3 text-ink hover:text-primary-ink"
            >
              <img src={subjectArt(set.subject)} alt="" className="h-[42px] w-[44px] shrink-0 rounded-[12px] object-cover" />
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="truncate text-[14.5px] font-bold">{set.title}</span>
                <span className="text-[12.5px] text-ink-soft">
                  {t('questionSets.count', { count: set.questionCount })} · {subjectInfo(set.subject).label}
                </span>
              </span>
            </Link>
            {set.questionCount > 0 && (
              <button
                type="button"
                onClick={() => onPlay(set)}
                aria-label={t('home.sets.playWith', { title: set.title })}
                className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border-0 bg-transparent px-1.5 font-[inherit] text-[13.5px] font-black text-primary hover:text-primary-ink"
              >
                <PlayIcon size={13} className="fill-current" />
                {t('home.sets.play')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function MoreLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex shrink-0 items-center gap-1.5 text-[14px] font-bold text-primary hover:text-primary-ink">
      {label}
      <ArrowRightIcon size={16} strokeWidth={2.4} />
    </Link>
  )
}
