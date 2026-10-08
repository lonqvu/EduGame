import { App } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { GameLogo } from '@/components/ui/GameLogo'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { editPath, gameRegistry, toolPath } from '@/game-engine/registry'
import { useCatalogStore } from '@/store/catalogStore'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import type { GameCategory, GameTemplate } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'

const CATEGORY_TITLES: Record<GameCategory, string> = {
  QUESTION: 'Hỏi đáp',
  PUZZLE: 'Giải đố',
  RANDOM_TOOL: 'Công cụ ngẫu nhiên',
}

export function ChooseGamePage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const templates = useCatalogStore((s) => s.templates)
  const status = useCatalogStore((s) => s.status)
  const loadTemplates = useCatalogStore((s) => s.load)
  const grade = useClassStore((s) => s.grade)
  const loadClass = useClassStore((s) => s.load)
  const createGame = useGameLibraryStore((s) => s.createGame)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void loadTemplates()
    void loadClass()
  }, [loadTemplates, loadClass])

  const choose = async (template: GameTemplate) => {
    if (!gameRegistry[template.type].usesQuestions) {
      navigate(toolPath(template.type))
      return
    }
    if (isComingSoon(template)) {
      message.info(`Trò "${template.name}" đang được hoàn thiện, cô dùng "Lật ô thi đua" trước nhé.`)
      return
    }
    if (creating) return
    setCreating(true)
    try {
      // New games are for the teacher's class grade (there is one class for now).
      navigate(editPath(await createGame(template.type, grade)))
    } catch (error) {
      message.error(apiErrorMessage(error))
      setCreating(false)
    }
  }

  if (status === 'error') return <LoadError onRetry={() => void loadTemplates()} />
  if (status !== 'ready') return <PageLoading />

  return (
    <div className="flex flex-col gap-7">
      <BackLink to="/" label="Trang chủ" />

      <section className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[44px] leading-[1.1] font-extrabold">Chọn trò chơi</h1>
        <p className="m-0 text-xl text-ink-soft">Bấm vào một trò để bắt đầu soạn câu hỏi.</p>
      </section>

      {(Object.keys(CATEGORY_TITLES) as GameCategory[]).map((category) => (
        <section key={category} className="flex flex-col gap-4">
          <h2 className="m-0 font-display text-[26px] font-bold">{CATEGORY_TITLES[category]}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
            {templates.filter((t) => t.category === category).map((template) => (
              <TemplateCard
                key={template.type}
                template={template}
                disabled={creating}
                onChoose={() => void choose(template)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** A question game the editor cannot edit yet (its items are not text / answer / points). */
const isComingSoon = (template: GameTemplate) =>
  gameRegistry[template.type].usesQuestions && !gameRegistry[template.type].hasEditor

interface TemplateCardProps {
  template: GameTemplate
  disabled: boolean
  onChoose: () => void
}

function TemplateCard({ template, disabled, onChoose }: TemplateCardProps) {
  const comingSoon = isComingSoon(template)
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      className="flex cursor-pointer flex-col gap-3 rounded-[28px] border-0 bg-white p-[18px] text-left font-[inherit] text-ink transition-transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(31,42,68,0.08)] disabled:cursor-wait disabled:opacity-70"
    >
      <span className="relative block">
        <GameLogo type={template.type} className={`rounded-[20px] ${comingSoon ? 'opacity-50 grayscale' : ''}`} />
        {comingSoon ? (
          <span className="absolute top-3 right-3 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-ink-soft">
            Sắp có
          </span>
        ) : (
          template.isNew && (
            <span className="absolute top-3 right-3 rounded-full bg-sun px-3 py-1 text-sm font-extrabold">Mới</span>
          )
        )}
      </span>
      <span className="font-display text-2xl leading-[1.1] font-extrabold">{template.name}</span>
      <span className="text-[17px] text-ink-soft">{template.description}</span>
      <span className="flex flex-wrap gap-2">
        {template.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-chip px-3 py-1 text-[15px] font-bold">
            {tag}
          </span>
        ))}
      </span>
    </button>
  )
}
