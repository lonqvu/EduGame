import type { GuideStep } from '@/game-engine/gameGuide'
import type { GameType } from '@/types/game'

/** "Cách chơi" of the tools (they have no rules to project): what they are for, in three steps. */
export interface ToolGuide {
  goal: string
  steps: GuideStep[]
  tip: string
}

const CLASS_LIST = 'Dùng danh sách lớp, hoặc dán tên / dùng số thứ tự nếu chưa có lớp.'

export const TOOL_GUIDES: Partial<Record<GameType, ToolGuide>> = {
  SPIN_WHEEL: {
    goal: 'Quay vòng quay mang tên các bạn để gọi một bạn ngẫu nhiên.',
    steps: [
      { title: 'Mở vòng quay', text: CLASS_LIST },
      { title: 'Quay', text: 'Bấm Quay, cả lớp hồi hộp chờ kim dừng.' },
      { title: 'Gọi tên', text: 'Bạn được chọn trả lời, được thưởng sao nếu có lớp.' },
    ],
    tip: 'Bạn đã được gọi sẽ không bị gọi lại cho tới khi cả lớp đều đã được gọi.',
  },
  NAME_RACE: {
    goal: 'Các bạn đua nhau trên màn chiếu, bạn về nhất được gọi tên.',
    steps: [
      { title: 'Mở trò', text: CLASS_LIST },
      { title: 'Bắt đầu', text: 'Bấm nút bắt đầu, xem cuộc đua (ngựa, bóng bay, tên lửa…).' },
      { title: 'Gọi tên', text: 'Bạn về nhất trả lời câu hỏi của cô.' },
    ],
    tip: 'Mỗi lượt chọn ngẫu nhiên vài bạn chưa được gọi để đua.',
  },
  TEAM_MAKER: {
    goal: 'Chia lớp thành các nhóm ngẫu nhiên, công bằng trong vài giây.',
    steps: [
      { title: 'Chọn số nhóm', text: 'Bấm + / − để chọn số nhóm.' },
      { title: 'Chia nhóm', text: 'Bấm Chia nhóm, tên các bạn bay vào từng nhóm.' },
      { title: 'Chia lại', text: 'Chưa ưng ý thì bấm chia lại.' },
    ],
    tip: CLASS_LIST,
  },
  TIMER: {
    goal: 'Đồng hồ đếm ngược to rõ cho cả lớp cùng thấy.',
    steps: [
      { title: 'Chọn thời gian', text: 'Chọn sẵn 1, 3, 5 phút hoặc tự đặt.' },
      { title: 'Bắt đầu', text: 'Đồng hồ chạy, các giây cuối có tiếng tích tắc.' },
      { title: 'Hết giờ', text: 'Chuông báo hết giờ cho cả lớp.' },
    ],
    tip: 'Hợp cho làm bài nhóm, thảo luận hoặc giữ trật tự.',
  },
  DICE: {
    goal: 'Gieo xúc xắc lớn trên màn chiếu cho các trò chơi trong lớp.',
    steps: [
      { title: 'Chọn số xúc xắc', text: 'Gieo một hay nhiều xúc xắc cùng lúc.' },
      { title: 'Gieo', text: 'Bấm Gieo, xúc xắc lăn rồi dừng.' },
      { title: 'Xem kết quả', text: 'Tổng điểm hiện rõ cho cả lớp.' },
    ],
    tip: 'Dùng để chọn lượt, chọn câu hỏi hoặc cho trò chơi cờ của lớp.',
  },
}
