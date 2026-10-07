import { useNavigate } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { GameLogo } from '@/components/ui/GameLogo'
import { editPath, gameRegistry, toolPath } from '@/game-engine/registry'
import { GAME_TEMPLATES } from '@/mocks/demoData'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import type { GameCategory, GameTemplate } from '@/types/game'

const CATEGORY_TITLES: Record<GameCategory, string> = {
  QUESTION: 'Hỏi đáp',
  PUZZLE: 'Giải đố',
  RANDOM_TOOL: 'Công cụ ngẫu nhiên',
}

export function ChooseGamePage() {
  const navigate = useNavigate()
  const createGame = useGameLibraryStore((s) => s.createGame)

  const choose = (template: GameTemplate) => {
    if (!gameRegistry[template.type].usesQuestions) {
      navigate(toolPath(template.type))
      return
    }
    navigate(editPath(createGame(template.type)))
  }

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
            {GAME_TEMPLATES.filter((t) => t.category === category).map((template) => (
              <TemplateCard key={template.type} template={template} onChoose={() => choose(template)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function TemplateCard({ template, onChoose }: { template: GameTemplate; onChoose: () => void }) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="flex cursor-pointer flex-col gap-3 rounded-[28px] border-0 bg-white p-[18px] text-left font-[inherit] text-ink transition-transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(31,42,68,0.08)]"
    >
      <span className="relative block">
        <GameLogo type={template.type} />
        {template.isNew && (
          <span className="absolute top-3 right-3 rounded-full bg-sun px-3 py-1 text-sm font-extrabold">Mới</span>
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
