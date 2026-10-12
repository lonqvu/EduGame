import {
  FileTextIcon,
  GamepadFilledIcon,
  HeartFilledIcon,
  SendFilledIcon,
  ShieldCheckFilledIcon,
  UsersFilledIcon,
} from '@/components/ui/icons'
import type { ShowcaseContent, ShowcaseFeature } from '@/pages/login/AuthShowcase'

/** Left half of each auth page, as in its design. */

const PRODUCT_FEATURES: ShowcaseFeature[] = [
  {
    icon: <GamepadFilledIcon size={30} className="text-primary" />,
    badge: 'bg-[#E3ECFF]',
    title: 'Nhiều trò chơi đa dạng',
    text: 'Hỏi đáp, giải đố, thi đua, ngẫu nhiên...',
  },
  {
    icon: (
      <span className="flex size-[30px] items-center justify-center rounded-[8px] bg-[#FFB020] text-white">
        <FileTextIcon size={20} strokeWidth={2.2} />
      </span>
    ),
    badge: 'bg-sun-soft',
    title: 'Tạo câu hỏi dễ dàng',
    text: 'Soạn câu hỏi nhanh, sử dụng nhiều lần',
  },
  {
    icon: <UsersFilledIcon size={32} className="text-[#2E9E6A]" />,
    badge: 'bg-[#DDF5E8]',
    title: 'Quản lý lớp học hiệu quả',
    text: 'Danh sách học sinh, điểm sao, báo cáo',
  },
]

const PRODUCT_PITCH = (
  <>
    EduGame giúp giáo viên tạo ra những
    <br />
    trò chơi học tập thú vị, dễ dàng và hiệu quả.
  </>
)

export const LOGIN_SHOWCASE: ShowcaseContent = {
  title: (
    <>
      Học vui hơn
      <br />
      Dạy dễ hơn
    </>
  ),
  titleClass: 'text-[clamp(44px,3.75vw,66px)]',
  subtitle: PRODUCT_PITCH,
  features: PRODUCT_FEATURES,
  image: {
    src: '/assets/auth/login-hero.jpg',
    alt: 'Cô giáo cùng các bạn học sinh vui vẻ học trong lớp',
    // Sits on the stats card.
    className: 'bottom-[17%] aspect-[595/782] max-h-[83%] w-[min(60.4%,calc(100%-390px))] object-[38%_100%]',
    fadeTop: false,
    fadeBottom: true,
  },
  stats: true,
  ground: 'foliage',
}

export const REGISTER_SHOWCASE: ShowcaseContent = {
  title: (
    <>
      Cùng nhau tạo
      <br />
      nên những tiết học
      <br />
      thật vui!
    </>
  ),
  titleClass: 'text-[clamp(36px,2.9vw,50px)]',
  subtitle: PRODUCT_PITCH,
  features: PRODUCT_FEATURES,
  image: {
    src: '/assets/auth/register-hero.jpg',
    alt: 'Cô giáo cầm máy tính bảng giữa các bạn học sinh trong lớp',
    // Starts where the title ends (em = the title's size) and ends behind the stats card.
    className:
      'bottom-[calc(clamp(24px,6vh,58px)+34px)] w-[min(calc(92.4%-7.8em),calc(92.4%-330px))] aspect-[495/455] max-h-[78%] text-[clamp(36px,2.9vw,50px)] object-[100%_100%]',
    fadeTop: true,
    fadeBottom: true,
  },
  stats: true,
  ground: 'clouds',
}

export const FORGOT_SHOWCASE: ShowcaseContent = {
  title: (
    <>
      Đừng lo,
      <br />
      chỉ vài bước nữa
      <br />
      là xong!
    </>
  ),
  titleClass: 'text-[clamp(36px,2.9vw,50px)]',
  subtitle: (
    <>
      Nhập email của bạn, chúng tôi sẽ gửi
      <br />
      mã để đặt lại mật khẩu.
    </>
  ),
  features: [
    {
      icon: <SendFilledIcon size={26} className="text-primary" />,
      badge: 'bg-[#E3ECFF]',
      title: 'Nhanh chóng',
      text: 'Nhận mã qua email ngay lập tức',
    },
    {
      icon: <ShieldCheckFilledIcon size={30} className="text-[#2E9E6A]" />,
      badge: 'bg-[#DDF5E8]',
      title: 'An toàn',
      text: 'Bảo mật thông tin tài khoản của bạn',
    },
    {
      icon: <HeartFilledIcon size={28} className="text-[#F0507A]" />,
      badge: 'bg-[#FFE4EA]',
      title: 'Luôn đồng hành',
      text: 'EduGame luôn sẵn sàng hỗ trợ bạn',
    },
  ],
  image: {
    src: '/assets/auth/forgot-hero.jpg',
    alt: 'Cô giáo và hai bạn nhỏ bên máy tính, cạnh biểu tượng thư',
    // Starts where the text ends (em = the title's size); the art ends in clouds, so it reaches the bottom edge.
    // The box is a little narrower than the art: the plants on its left are cut first.
    className:
      'bottom-0 w-[min(calc(92.4%-6.6em),calc(92.4%-320px))] aspect-[500/451] max-h-[86%] text-[clamp(36px,2.9vw,50px)] object-[100%_100%]',
    fadeTop: true,
    fadeBottom: false,
  },
  stats: false,
  ground: 'clouds',
}
