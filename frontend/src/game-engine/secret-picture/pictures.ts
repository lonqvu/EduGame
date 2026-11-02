import i18n from 'i18next'
import type { Translation } from '@/i18n/locales/vi'
/** The pictures hidden behind the doors (public/assets/illustrations), with what the class should guess. */
type Answer = keyof Translation['play']['picture']['answers']

/** A picture; what it shows is read in the current language. */
const picture = (file: string, answer: Answer) => ({
  src: `/assets/illustrations/${file}.png`,
  get answer() {
    return i18n.t(`play.picture.answers.${answer}`)
  },
})

export const SECRET_PICTURES = [
  picture('dua-ngua', 'horse'),
  picture('hen-gio', 'clock'),
  picture('thanh-tich', 'cup'),
  picture('tro-choi-dua-thuyen', 'boats'),
  picture('tro-choi-rung-chuong-vang', 'bell'),
  picture('vong-quay', 'wheel'),
  picture('xuc-xac', 'dice'),
  picture('chia-nhom', 'together'),
]

/** Most doors in front of the picture. */
export const MAX_DOORS = 12

/** Columns of the doors: as square as the picture allows. */
export const doorColumns = (doors: number) => (doors <= 4 ? 2 : doors <= 9 ? 3 : 4)
