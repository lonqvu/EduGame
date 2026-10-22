/** The pictures hidden behind the doors (public/assets/illustrations), with what the class should guess. */
export const SECRET_PICTURES = [
  { src: '/assets/illustrations/dua-ngua.png', answer: 'Bạn nhỏ cưỡi ngựa' },
  { src: '/assets/illustrations/hen-gio.png', answer: 'Chiếc đồng hồ' },
  { src: '/assets/illustrations/thanh-tich.png', answer: 'Chiếc cúp vàng' },
  { src: '/assets/illustrations/tro-choi-dua-thuyen.png', answer: 'Các bạn đua thuyền' },
  { src: '/assets/illustrations/tro-choi-rung-chuong-vang.png', answer: 'Chiếc chuông vàng' },
  { src: '/assets/illustrations/vong-quay.png', answer: 'Vòng quay may mắn' },
  { src: '/assets/illustrations/xuc-xac.png', answer: 'Con xúc xắc' },
  { src: '/assets/illustrations/chia-nhom.png', answer: 'Các bạn đoàn kết' },
]

/** Most doors in front of the picture. */
export const MAX_DOORS = 12

/** Columns of the doors: as square as the picture allows. */
export const doorColumns = (doors: number) => (doors <= 4 ? 2 : doors <= 9 ? 3 : 4)
