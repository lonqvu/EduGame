import { Button } from 'antd'
import { useState } from 'react'
import { BulbIcon, ChevronRightIcon, PlusIcon } from '@/components/ui/icons'
import { CLASS_ASSETS } from '@/pages/classes/classUi'
import { MAX_CLASSROOMS } from '@/utils/classrooms'

/** "Chưa có lớp học?" for a new teacher, "Thêm lớp học mới" afterwards; full at 30 classes. */
export function CreateClassCard({ classCount, onCreate }: { classCount: number | null; onCreate: () => void }) {
  // null while the classes load: no "Chưa có lớp học?" flash for teachers who have some.
  const full = classCount !== null && classCount >= MAX_CLASSROOMS
  const title = classCount === 0 ? 'Chưa có lớp học?' : 'Thêm lớp học mới'
  const text = full
    ? `Cô đã có ${MAX_CLASSROOMS} lớp, là số lớp tối đa. Xóa lớp không dạy nữa để tạo lớp mới.`
    : classCount === 0
      ? 'Tạo lớp học đầu tiên để quản lý học sinh, theo dõi tiến độ và tổ chức các hoạt động học tập thú vị.'
      : 'Mỗi lớp có danh sách học sinh, sao thưởng và tiến độ riêng. Tạo thêm lớp cho các khối khác nhé.'
  return (
    <section className="relative flex min-h-[210px] flex-col overflow-hidden rounded-[20px] bg-[linear-gradient(150deg,#EEF5FF_0%,#E1ECFD_100%)] p-5">
      <img
        src={`${CLASS_ASSETS}/teacher.svg`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[-4px] bottom-[-10px] w-[140px] select-none"
      />
      <div className="relative flex max-w-[62%] flex-1 flex-col gap-2">
        <h2 className="m-0 text-[18px] font-black">{title}</h2>
        <p className="m-0 text-[14px] leading-relaxed text-ink-soft">{text}</p>
        <Button
          type="primary"
          icon={<PlusIcon size={16} />}
          onClick={onCreate}
          disabled={full}
          className="mt-auto h-11 w-fit rounded-[12px] px-5 font-extrabold"
        >
          Tạo lớp học
        </Button>
      </div>
    </section>
  )
}

const TIPS = [
  'Cô có thể tạo nhiều lớp học cho các khối lớp khác nhau. Sau khi tạo lớp, hãy thêm học sinh để bắt đầu nhé!',
  'Dán cả danh sách lớp từ Excel hay Word vào ô “Thêm học sinh”: mỗi dòng là một em, số thứ tự được bỏ đi.',
  'Lớp đã dạy xong hay nghỉ hè? Chuyển sang “Tạm ngưng”: sao thưởng và kết quả của các em vẫn được giữ lại.',
  'Chọn “Lớp đang dạy” ở trang chủ: trò chơi, gọi tên và sao thưởng sẽ dùng danh sách của lớp đó.',
]

/** "Mẹo nhỏ": one tip at a time; the arrow shows the next. */
export function TipCard() {
  const [index, setIndex] = useState(0)
  return (
    <section aria-label="Mẹo nhỏ" className="flex flex-col gap-2 rounded-[20px] bg-[#F4EFFE] p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#E6DBFC] text-[#7B4FE0]">
          <BulbIcon size={20} />
        </span>
        <h2 className="m-0 flex-1 text-[16px] font-black text-[#5B33B8]">Mẹo nhỏ</h2>
        <button
          type="button"
          aria-label="Mẹo tiếp theo"
          onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#7B4FE0] hover:bg-[#E6DBFC]"
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>
      <p aria-live="polite" className="m-0 min-h-[66px] flex-1 text-[14px] leading-relaxed text-ink-soft">
        {TIPS[index]}
      </p>
      <div aria-hidden="true" className="flex gap-1.5">
        {TIPS.map((tip, i) => (
          <span key={tip} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-[#7B4FE0]' : 'w-1.5 bg-[#D9CCF7]'}`} />
        ))}
      </div>
    </section>
  )
}
