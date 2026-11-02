import { Collapse, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useFeedbackStore } from '@/store/feedbackStore'

/** The questions (profile.help.*: the question, its answer `…Text` and link `…Link`), with the page each one is about. */
const QUESTIONS = [
  { key: 'games', to: '/games/new' },
  { key: 'sets', to: '/question-sets' },
  { key: 'students', to: '/classes' },
  { key: 'projector' },
  { key: 'password' },
] as const

/** "Trợ giúp": answers to what teachers ask most, with a link to the page each one is about. */
export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const openFeedback = useFeedbackStore((s) => s.openFeedback)
  return (
    <Modal open={open} title={t('profile.help.title')} footer={null} onCancel={onClose} width={620}>
      <p className="mt-1 mb-3 text-[14px] text-ink-soft">{t('profile.help.intro')}</p>
      <Collapse
        accordion
        defaultActiveKey={['games']}
        items={QUESTIONS.map((q) => ({
          key: q.key,
          label: <span className="font-bold">{t(`profile.help.${q.key}`)}</span>,
          children: (
            <div className="flex flex-col gap-2 text-[14px] leading-[1.55] text-ink-soft">
              <p className="m-0">{t(`profile.help.${q.key}Text`)}</p>
              {'to' in q && (
                <Link to={q.to} onClick={onClose} className="font-bold">
                  {t(`profile.help.${q.key}Link`)} →
                </Link>
              )}
            </div>
          ),
        }))}
      />
      <p className="m-0 mt-4 text-[14px] text-ink-soft">
        {t('profile.help.notFound')}{' '}
        <button
          type="button"
          onClick={() => {
            onClose()
            openFeedback('OTHER')
          }}
          className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-primary hover:underline"
        >
          {t('profile.help.feedback')}
        </button>
      </p>
    </Modal>
  )
}
