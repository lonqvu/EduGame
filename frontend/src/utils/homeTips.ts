/** "Gợi ý hôm nay" at the bottom of the home page: one tip, with where it leads. */
export interface HomeTip {
  text: string
  link: string
  to: string
}

/** What the teacher has, which decides the tip: the missing step first, else a tip of the day. */
export interface TipContext {
  hasClass: boolean
  hasStudents: boolean
  hasGames: boolean
  hasQuestionSets: boolean
}

export const DAILY_TIPS: HomeTip[] = [
  { text: 'Nhấn Enter trên màn chiếu để bắt đầu, phím M để tắt hoặc bật âm thanh.', link: 'Xem cài đặt', to: '/settings' },
  { text: 'Một bộ câu hỏi chơi được với nhiều trò: Trắc nghiệm, Rung chuông vàng, Đua thuyền…', link: 'Bộ câu hỏi', to: '/question-sets' },
  { text: 'Dán câu hỏi từ Word hoặc Excel, không cần gõ lại từng câu.', link: 'Soạn câu hỏi', to: '/question-sets' },
  { text: 'Dùng Vòng quay may mắn để gọi tên phát biểu, cả lớp sẽ hào hứng hơn.', link: 'Mở vòng quay', to: '/tools/wheel' },
  { text: 'Xem báo cáo để biết trò nào lớp chơi tốt và bạn nào cần thêm giúp đỡ.', link: 'Xem báo cáo', to: '/reports' },
  { text: 'Chia nhóm ngẫu nhiên chỉ với một lần bấm, không lo bạn nào bị bỏ sót.', link: 'Chia nhóm', to: '/tools/groups' },
  { text: 'Bật "Toàn màn hình khi bắt đầu trò chơi" để màn chiếu gọn gàng hơn.', link: 'Xem cài đặt', to: '/settings' },
]

/** The tip for today: what is missing to get the most out of the site, else one of the daily tips. */
export function homeTip(context: TipContext, today: Date = new Date()): HomeTip {
  if (!context.hasGames) return { text: 'Chọn một trò chơi và chiếu lên màn hình, có sẵn câu hỏi mẫu để thử ngay.', link: 'Chọn trò chơi', to: '/games/new' }
  if (!context.hasClass) return { text: 'Tạo lớp để cộng sao cho từng bạn và xem báo cáo sau mỗi trò chơi.', link: 'Tạo lớp', to: '/classes' }
  if (!context.hasStudents) return { text: 'Lớp chưa có học sinh: dán danh sách hoặc nhập từ file Excel.', link: 'Thêm học sinh', to: '/classes' }
  if (!context.hasQuestionSets) return { text: 'Soạn một bộ câu hỏi để dùng lại cho nhiều trò chơi khác nhau.', link: 'Tạo bộ câu hỏi', to: '/question-sets' }
  const day = Math.floor((today.getTime() - today.getTimezoneOffset() * 60_000) / 86_400_000)
  return DAILY_TIPS[day % DAILY_TIPS.length]
}
