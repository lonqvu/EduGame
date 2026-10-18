import { Collapse, Modal } from 'antd'
import { Link } from 'react-router'

const QUESTIONS = [
  {
    key: 'game',
    label: 'Làm sao để tổ chức một trò chơi?',
    text: 'Vào “Trò chơi”, bấm “Chọn trò chơi” ở trò cô muốn, đặt tên rồi chọn dùng bộ câu hỏi có sẵn hoặc soạn nội dung mới. Ở trang chuẩn bị, cô xem luật chơi, trình chiếu luật cho cả lớp rồi bấm “Bắt đầu trò chơi”.',
    to: '/games/new',
    link: 'Đi tới Chọn trò chơi',
  },
  {
    key: 'sets',
    label: 'Bộ câu hỏi dùng để làm gì?',
    text: 'Bộ câu hỏi là nơi cô soạn câu hỏi một lần rồi dùng cho nhiều trò chơi: Trắc nghiệm, Rung chuông vàng, Đua thuyền và Lật ô. Câu tự luận chỉ dùng được cho Lật ô.',
    to: '/question-sets',
    link: 'Đi tới Bộ câu hỏi',
  },
  {
    key: 'class',
    label: 'Làm sao để thêm học sinh vào lớp?',
    text: 'Vào “Lớp học”, mở lớp rồi thêm học sinh từng bạn, dán cả danh sách, hoặc nhập từ file Excel / CSV theo file mẫu.',
    to: '/classes',
    link: 'Đi tới Lớp học',
  },
  {
    key: 'projector',
    label: 'Trình chiếu lên máy chiếu thế nào?',
    text: 'Nối máy tính với máy chiếu, mở trò chơi rồi bấm “Bắt đầu trò chơi”. Màn chơi tự co giãn vừa mọi màn hình; bấm F11 để toàn màn hình.',
  },
  {
    key: 'password',
    label: 'Quên mật khẩu thì làm sao?',
    text: 'Ở màn đăng nhập, bấm “Quên mật khẩu?” và nhập email: EduGame gửi mã để cô đặt mật khẩu mới. Khi đang đăng nhập, cô đổi mật khẩu trong “Bảo mật tài khoản”.',
  },
]

/** "Trợ giúp": answers to what teachers ask most, with a link to the page each one is about. */
export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Trợ giúp" footer={null} onCancel={onClose} width={620}>
      <p className="mt-1 mb-3 text-[14px] text-ink-soft">Những câu hỏi thường gặp khi dùng EduGame.</p>
      <Collapse
        accordion
        defaultActiveKey={['game']}
        items={QUESTIONS.map((q) => ({
          key: q.key,
          label: <span className="font-bold">{q.label}</span>,
          children: (
            <div className="flex flex-col gap-2 text-[14px] leading-[1.55] text-ink-soft">
              <p className="m-0">{q.text}</p>
              {q.to && (
                <Link to={q.to} onClick={onClose} className="font-bold">
                  {q.link} →
                </Link>
              )}
            </div>
          ),
        }))}
      />
    </Modal>
  )
}
