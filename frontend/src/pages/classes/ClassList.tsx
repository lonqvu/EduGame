import { Button, Dropdown, Input } from 'antd'
import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { CheckIcon, MoreVerticalIcon, PlayIcon, PlusIcon, SearchIcon } from '@/components/ui/icons'
import { AnimalAvatar, CLASS_ASSETS } from '@/pages/classes/classUi'
import type { ClassroomResponse, LoadStatus } from '@/types/api'
import { classAvatar, classTitle, type ClassTab } from '@/utils/classrooms'
import { relativeTimeLabel } from '@/utils/dateLabels'

const TABS: ClassTab[] = ['ALL', 'ACTIVE', 'PAUSED']

interface ClassListProps {
  status: LoadStatus
  /** Classes of the tab matching the search */
  classrooms: ClassroomResponse[]
  counts: Record<ClassTab, number>
  tab: ClassTab
  onTabChange: (tab: ClassTab) => void
  search: string
  onSearchChange: (search: string) => void
  /** The class the games are played with (marked "Đang dạy") */
  currentCode: string | null
  onCreate: () => void
  onRetry: () => void
  actions: ClassActions
}

/** What a class card can do without opening the class. */
export interface ClassActions {
  teach: (classroom: ClassroomResponse) => void
  play: (classroom: ClassroomResponse) => void
  setStatus: (classroom: ClassroomResponse, status: ClassroomResponse['status']) => void
  archive: (classroom: ClassroomResponse) => void
}

/** The classes: search, tabs by status, one card per class with its main actions. */
export function ClassList(props: ClassListProps) {
  const { t } = useTranslation()
  const { counts, tab, onTabChange, search, onSearchChange } = props
  return (
    <section aria-label={t('classes.list.label')} className="@container flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <Input
          allowClear
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          prefix={<SearchIcon size={18} className="text-ink-muted" />}
          placeholder={t('classes.list.search')}
          aria-label={t('classes.list.searchLabel')}
          className="h-10 w-full rounded-full border-0 shadow-[0_1px_3px_rgba(31,42,68,0.06)] sm:w-[300px]"
        />
        {/* Narrow screens: the tabs scroll sideways rather than wrapping. */}
        <div
          role="tablist"
          aria-label={t('classes.list.filter')}
          className="-mx-1 flex max-w-[calc(100%+8px)] gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]"
        >
          {TABS.map((key) => {
            const selected = key === tab
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(key)}
                className={`h-[36px] shrink-0 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[14px] font-extrabold transition ${
                  selected ? 'bg-primary text-white' : 'bg-white text-ink-soft hover:text-primary-ink'
                }`}
              >
                {t(`classes.list.tabs.${key}`)} ({counts[key]})
              </button>
            )
          })}
        </div>
      </header>

      <ListBody {...props} />
    </section>
  )
}

function ListBody({ status, classrooms, counts, tab, search, onSearchChange, onTabChange, currentCode, onCreate, onRetry, actions }: ClassListProps) {
  const { t } = useTranslation()
  if (status === 'idle' || status === 'loading') {
    return (
      <ul aria-busy="true" aria-label={t('classes.list.loading')} className="m-0 flex list-none flex-col gap-3 p-0">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex h-[96px] animate-pulse items-center gap-4 rounded-[20px] bg-white px-4">
            <span className="size-14 rounded-[16px] bg-chip" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-4 w-24 rounded bg-chip" />
              <span className="h-3 w-48 rounded bg-chip" />
            </span>
          </li>
        ))}
      </ul>
    )
  }
  if (status === 'error') {
    return (
      <Empty title={t('classes.list.errorTitle')} text={t('classes.list.errorText')}>
        <Button shape="round" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </Empty>
    )
  }
  if (counts.ALL === 0) {
    return (
      <Empty title={t('classes.list.emptyTitle')} text={t('classes.list.emptyText')} art>
        <Button type="primary" shape="round" icon={<PlusIcon size={16} />} onClick={onCreate}>
          {t('classes.page.create')}
        </Button>
      </Empty>
    )
  }
  if (classrooms.length === 0) {
    return search.trim() ? (
      <Empty title={t('classes.list.noMatch', { search: search.trim() })} text={t('classes.list.noMatchText')}>
        <Button shape="round" onClick={() => onSearchChange('')}>
          {t('classes.list.clearSearch')}
        </Button>
      </Empty>
    ) : (
      <Empty title={tab === 'PAUSED' ? t('classes.list.noPaused') : t('classes.list.noActive')} text={t('classes.list.othersInAll')}>
        <Button shape="round" onClick={() => onTabChange('ALL')}>
          {t('classes.list.showAll')}
        </Button>
      </Empty>
    )
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {classrooms.map((c) => (
        <ClassRow key={c.code} classroom={c} current={c.code === currentCode} actions={actions} />
      ))}
    </ul>
  )
}

/**
 * One class: animal, name (to its page), size and school, when it last played and its stars of the week, and what
 * the teacher does with it most: teach it ("Đang dạy" when it is), play with it, the rest in the menu.
 */
function ClassRow({ classroom: c, current, actions }: { classroom: ClassroomResponse; current: boolean; actions: ClassActions }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const page = `/classes/${encodeURIComponent(c.code)}`
  const paused = c.status === 'PAUSED'
  // The class size first: the school name may be long and is cut on narrow screens.
  const details = [t('classes.studentCount', { count: c.studentCount }), c.schoolName].filter(Boolean).join(' · ')
  return (
    // The whole card opens the class: the name's link covers it (after:inset-0); the buttons sit above that cover.
    <li
      className={`group relative flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-3 rounded-[20px] border-2 border-transparent bg-white px-4 py-3.5 transition hover:border-[#C9D9F5] hover:shadow-[0_4px_14px_rgba(31,42,68,0.07)] has-[a:focus-visible]:border-primary ${
        paused ? 'bg-white/70' : ''
      }`}
    >
      <span className={paused ? 'opacity-70' : ''}>
        <AnimalAvatar avatar={classAvatar(c)} size={60} className="size-[52px] rounded-[18px] sm:size-[60px]" />
      </span>
      <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <Link
            to={page}
            aria-label={`${classTitle(c.name)}, ${details}`}
            className="truncate text-[19px] font-black text-ink outline-none group-hover:text-primary-ink after:absolute after:inset-0 after:rounded-[18px] after:content-['']"
          >
            {classTitle(c.name)}
          </Link>
          {paused && <span className="shrink-0 rounded-full bg-chip px-2.5 py-0.5 text-[12px] font-extrabold text-ink-muted">{t('classes.status.PAUSED')}</span>}
        </span>
        <span className="truncate text-[13.5px] text-ink-muted">{details}</span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          <Fact>
            <Trans
              i18nKey="classes.list.lastPlayed"
              values={{ when: relativeTimeLabel(c.lastPlayedAt) || t('classes.list.neverPlayed') }}
              components={{ b: <b className="font-extrabold" /> }}
            />
          </Fact>
          <Fact>
            <Trans i18nKey="classes.list.weeklyStars" values={{ count: c.weeklyStars }} components={{ b: <b className="font-extrabold" /> }} />
          </Fact>
        </span>
      </div>
      <div className="relative z-10 flex w-full cursor-default items-center gap-2 sm:w-auto">
        {paused ? (
          <Button shape="round" onClick={() => actions.setStatus(c, 'ACTIVE')} className="h-10 flex-1 font-extrabold sm:flex-none">
            {t('classes.resume')}
          </Button>
        ) : (
          <>
            {current ? (
              <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#E2F6E8] px-4 text-[14px] font-extrabold whitespace-nowrap text-success sm:flex-none">
                <CheckIcon size={15} /> {t('classes.teaching')}
              </span>
            ) : (
              <Button shape="round" onClick={() => actions.teach(c)} className="h-10 flex-1 border-2 font-extrabold text-primary-ink sm:flex-none">
                {t('classes.teach')}
              </Button>
            )}
            <Button
              type="primary"
              shape="round"
              icon={<PlayIcon size={15} className="fill-current" />}
              onClick={() => actions.play(c)}
              className="h-10 flex-1 font-extrabold sm:flex-none"
            >
              {t('classes.play')}
            </Button>
          </>
        )}
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'open', label: t('classes.open'), onClick: () => navigate(page) },
              paused
                ? { key: 'resume', label: t('classes.resumeClass'), onClick: () => actions.setStatus(c, 'ACTIVE') }
                : { key: 'pause', label: t('classes.pause'), onClick: () => actions.setStatus(c, 'PAUSED') },
              { type: 'divider' },
              { key: 'archive', label: t('classes.delete'), danger: true, onClick: () => actions.archive(c) },
            ],
          }}
        >
          <button
            type="button"
            aria-label={t('classes.actionsFor', { name: classTitle(c.name) })}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-surface-soft"
          >
            <MoreVerticalIcon size={19} />
          </button>
        </Dropdown>
      </div>
    </li>
  )
}

function Fact({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#F6F8FC] px-2.5 py-1 text-[12.5px] whitespace-nowrap text-[#5B6580]">{children}</span>
}

function Empty({ title, text, art, children }: { title: string; text: string; art?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white px-6 py-9 text-center">
      {art && <img src={`${CLASS_ASSETS}/teacher.svg`} alt="" className="mb-1 size-[120px]" />}
      <p className="m-0 text-[17px] font-black">{title}</p>
      <p className="m-0 max-w-[380px] text-[14.5px] text-ink-muted">{text}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
