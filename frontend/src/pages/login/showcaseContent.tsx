import i18n from 'i18next'
import { Trans } from 'react-i18next'
import {
  FileTextIcon,
  GamepadFilledIcon,
  HeartFilledIcon,
  SendFilledIcon,
  ShieldCheckFilledIcon,
  UsersFilledIcon,
} from '@/components/ui/icons'
import type { Translation } from '@/i18n/locales/vi'
import type { ShowcaseContent, ShowcaseFeature } from '@/pages/login/AuthShowcase'

/** Left half of each auth page, as in its design. Texts are read in the current language when shown. */

type ShowcaseKey = `auth.showcase.${keyof Translation['auth']['showcase']}`

const feature = (icon: ShowcaseFeature['icon'], badge: string, title: ShowcaseKey, text: ShowcaseKey): ShowcaseFeature => ({
  icon,
  badge,
  get title() {
    return i18n.t(title)
  },
  get text() {
    return i18n.t(text)
  },
})

/** A text of several lines, broken where the design breaks it. */
const lines = (key: ShowcaseKey) => <Trans i18nKey={key} components={{ br: <br /> }} />

const PRODUCT_FEATURES: ShowcaseFeature[] = [
  feature(<GamepadFilledIcon size={30} className="text-primary" />, 'bg-[#E3ECFF]', 'auth.showcase.games', 'auth.showcase.gamesText'),
  feature(
    <span className="flex size-[30px] items-center justify-center rounded-[8px] bg-[#FFB020] text-white">
      <FileTextIcon size={20} strokeWidth={2.2} />
    </span>,
    'bg-sun-soft',
    'auth.showcase.questions',
    'auth.showcase.questionsText',
  ),
  feature(<UsersFilledIcon size={32} className="text-[#2E9E6A]" />, 'bg-[#DDF5E8]', 'auth.showcase.classes', 'auth.showcase.classesText'),
]

export const LOGIN_SHOWCASE: ShowcaseContent = {
  title: lines('auth.showcase.loginTitle'),
  titleClass: 'text-[clamp(44px,3.75vw,66px)]',
  subtitle: lines('auth.showcase.pitch'),
  features: PRODUCT_FEATURES,
  image: {
    src: '/assets/auth/login-hero.jpg',
    get alt() {
      return i18n.t('auth.showcase.loginAlt')
    },
    // Sits on the stats card.
    className: 'bottom-[17%] aspect-[595/782] max-h-[83%] w-[min(60.4%,calc(100%-390px))] object-[38%_100%]',
    fadeTop: false,
    fadeBottom: true,
  },
  stats: true,
  ground: 'foliage',
}

export const REGISTER_SHOWCASE: ShowcaseContent = {
  title: lines('auth.showcase.registerTitle'),
  titleClass: 'text-[clamp(36px,2.9vw,50px)]',
  subtitle: lines('auth.showcase.pitch'),
  features: PRODUCT_FEATURES,
  image: {
    src: '/assets/auth/register-hero.jpg',
    get alt() {
      return i18n.t('auth.showcase.registerAlt')
    },
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
  title: lines('auth.showcase.forgotTitle'),
  titleClass: 'text-[clamp(36px,2.9vw,50px)]',
  subtitle: lines('auth.showcase.forgotSubtitle'),
  features: [
    feature(<SendFilledIcon size={26} className="text-primary" />, 'bg-[#E3ECFF]', 'auth.showcase.fast', 'auth.showcase.fastText'),
    feature(<ShieldCheckFilledIcon size={30} className="text-[#2E9E6A]" />, 'bg-[#DDF5E8]', 'auth.showcase.safe', 'auth.showcase.safeText'),
    feature(<HeartFilledIcon size={28} className="text-[#F0507A]" />, 'bg-[#FFE4EA]', 'auth.showcase.support', 'auth.showcase.supportText'),
  ],
  image: {
    src: '/assets/auth/forgot-hero.jpg',
    get alt() {
      return i18n.t('auth.showcase.forgotAlt')
    },
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
