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
  COIN_FLIP: {
    goal: 'Tung đồng xu để chọn đội đi trước hay quyết định nhanh mà công bằng.',
    steps: [
      { title: 'Chọn mặt', text: 'Mỗi đội chọn một mặt: sấp hoặc ngửa.' },
      { title: 'Tung', text: 'Bấm nút hoặc nhấn phím cách, đồng xu bay lên rồi rơi xuống.' },
      { title: 'Xem kết quả', text: 'Mặt hiện ra, bảng đếm ghi lại các lần tung.' },
    ],
    tip: 'Dùng thay cho oẳn tù tì khi hai đội tranh lượt.',
  },
  RANDOM_NUMBER: {
    goal: 'Chọn một số ngẫu nhiên, ví dụ để gọi bạn theo số thứ tự.',
    steps: [
      { title: 'Đặt khoảng', text: 'Chọn từ số mấy đến số mấy, ví dụ 1 đến 30.' },
      { title: 'Chọn số', text: 'Bấm Chọn số, các số chạy rồi dừng ở một số.' },
      { title: 'Không lặp lại', text: 'Bật "Không lặp lại" để mỗi số chỉ ra một lần.' },
    ],
    tip: 'Hợp để gọi bạn lên bảng mà không cần danh sách lớp.',
  },
  SCOREBOARD: {
    goal: 'Bảng điểm to rõ cho các đội trong mọi hoạt động của lớp.',
    steps: [
      { title: 'Chọn số đội', text: 'Từ 2 đến 6 đội, bấm vào tên để đổi tên đội.' },
      { title: 'Cộng điểm', text: 'Bấm +1, +5, +10 hoặc −1 cho đội.' },
      { title: 'Xem đội dẫn đầu', text: 'Đội nhiều điểm nhất có vương miện.' },
    ],
    tip: 'Điểm được giữ lại trên máy này, mở lại vẫn còn. Bấm "Về 0 hết" để chơi lượt mới.',
  },
  NOISE_METER: {
    goal: 'Đo độ ồn của lớp bằng micro để cả lớp cùng giữ trật tự.',
    steps: [
      { title: 'Bật micro', text: 'Bấm Bật micro và cho phép trình duyệt dùng micro.' },
      { title: 'Đặt mức', text: 'Kéo thanh "Mức cho phép" cho hợp với hoạt động.' },
      { title: 'Theo dõi', text: 'Ồn quá mức lâu, màn hình đỏ lên và có chuông báo.' },
    ],
    tip: 'Micro chỉ đo độ ồn, không ghi âm và không gửi đi đâu.',
  },
  TRAFFIC_LIGHT: {
    goal: 'Đèn tín hiệu cho biết lúc nào lớp cần im lặng, nói nhỏ hay được thảo luận.',
    steps: [
      { title: 'Đèn đỏ', text: 'Im lặng, lắng nghe cô.' },
      { title: 'Đèn vàng', text: 'Nói nhỏ với bạn bên cạnh.' },
      { title: 'Đèn xanh', text: 'Các nhóm được thảo luận.' },
    ],
    tip: 'Nhấn phím 1, 2, 3 để đổi đèn nhanh khi đang giảng bài.',
  },
  STOPWATCH: {
    goal: 'Bấm giờ thật to trên màn chiếu cho các cuộc thi đua nhanh.',
    steps: [
      { title: 'Bắt đầu', text: 'Bấm Bắt đầu hoặc nhấn phím cách, đồng hồ chạy.' },
      { title: 'Ghi thời gian', text: 'Nhóm nào xong thì bấm "Ghi thời gian".' },
      { title: 'So kết quả', text: 'Danh sách cho biết nhóm nào nhanh nhất.' },
    ],
    tip: 'Hợp cho thi giải toán nhanh, xếp hình, đọc đúng và nhanh.',
  },
  CARD_DRAW: {
    goal: 'Bốc thăm ngẫu nhiên chủ đề, câu hỏi hay nhiệm vụ cho học sinh.',
    steps: [
      { title: 'Viết lá thăm', text: 'Bấm "Sửa lá thăm", mỗi dòng một lá.' },
      { title: 'Bốc thăm', text: 'Học sinh bấm Bốc thăm, một lá lật ra.' },
      { title: 'Không trùng', text: 'Lá đã bốc không ra lại, bấm "Xáo lại" để bốc từ đầu.' },
    ],
    tip: 'Các lá thăm được giữ lại trên máy này cho tiết sau.',
  },
  SEATING: {
    goal: 'Xếp chỗ ngồi ngẫu nhiên cho cả lớp và đổi chỗ dễ dàng.',
    steps: [
      { title: 'Chọn số chỗ', text: 'Chọn số chỗ mỗi hàng: 4, 6 hoặc 8.' },
      { title: 'Xếp ngẫu nhiên', text: 'Bấm "Xếp ngẫu nhiên" để chia chỗ cho cả lớp.' },
      { title: 'Đổi chỗ', text: 'Bấm hai bạn bất kỳ để đổi chỗ hai bạn đó.' },
    ],
    tip: CLASS_LIST,
  },
}
