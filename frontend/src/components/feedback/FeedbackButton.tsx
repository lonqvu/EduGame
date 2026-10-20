import { useLocation } from 'react-router'
import { MessageIcon } from '@/components/ui/icons'
import { useFeedbackStore } from '@/store/feedbackStore'
import { liftsFeedbackButton, SKIP_IN_SCREENSHOT } from '@/utils/feedback'

/**
 * "Góp ý", always at hand in the bottom right corner of the teacher screens. Under every dialog (z-index 900, antd
 * dialogs are 1000), above the "Bắt đầu trò chơi" bar, and left out of the screenshot it can attach.
 */
export function FeedbackButton() {
  const openFeedback = useFeedbackStore((s) => s.openFeedback)
  const { pathname } = useLocation()

  return (
    <button
      type="button"
      {...{ [SKIP_IN_SCREENSHOT]: '' }}
      onClick={() => openFeedback()}
      aria-label="Góp ý cho Lớp vui"
      title="Góp ý cho Lớp vui"
      className={`fixed right-4 z-[900] flex h-12 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-[13px] font-[inherit] text-[15px] font-bold text-ink shadow-[0_6px_20px_rgba(31,42,68,0.16)] transition outline-none hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:right-6 sm:pr-[18px] sm:pl-4 ${
        liftsFeedbackButton(pathname) ? 'bottom-[150px] sm:bottom-24' : 'bottom-4 sm:bottom-6'
      }`}
    >
      <MessageIcon size={22} className="text-primary" />
      <span className="hidden sm:inline">Góp ý</span>
    </button>
  )
}
