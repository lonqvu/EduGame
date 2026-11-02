import type { Strings } from '@/i18n/locales/types'
import type { settings as vi } from '@/i18n/locales/vi/settings'

export const settings: Strings<typeof vi> = {
  title: 'Settings',
  intro: 'Make Lớp Vui work the way you teach. Every change is saved automatically.',
  introGuest: 'Make Lớp Vui work the way you teach. You’re not signed in, so settings are saved in this browser.',
  saveFailed: 'Couldn’t save your settings. {{reason}}',

  display: {
    title: 'Display & projector',
    reduceMotion: 'Reduce motion',
    reduceMotionHint: 'Turns off animations on every screen. Useful when the computer or projector is slow.',
    fullscreen: 'Full screen when a game starts',
    fullscreenHint: 'Clicking “Start game” opens the projector screen in full screen. Press Esc to exit.',
  },


  games: {
    title: 'New games',
    text: 'Used when you create a new game. Existing games keep their settings, and you can still change them for each game on its start page.',
    reset: 'Reset to each game’s default',
    teams: 'Number of teams',
    teamsHint: 'For games that split the class into random teams.',
    timeLimit: 'Time per question',
    timeLimitHint: 'Quiz, Golden Bell, Boat Race.',
    allowSteal: 'Let other teams steal',
    allowStealHint: 'When a team answers wrong.',
    shuffle: 'Shuffle the questions',
    shuffleHint: 'A different order every time you play.',
    auto: 'Game default',
    noLimit: 'No limit',
    teamCount_one: '{{count}} team',
    teamCount_other: '{{count}} teams',
    seconds_one: '{{count}} second',
    seconds_other: '{{count}} seconds',
  },

  sound: {
    title: 'Sound',
    text: 'Sounds of the games on the projector. On the projector, the speaker button in the corner (or the M key) turns them off and on.',
    effects: 'Game sounds',
    effectsHint: 'Correct and wrong answers, countdown, bell, applause for the winner…',
    volume: 'Volume',
    volumeHint: 'Let go to hear a sample.',
    music: 'Background music',
    musicHint: 'Light, cheerful music while playing, faster in the last seconds.',
  },

  notifications: {
    title: 'Email notifications',
    textGuest: 'Notifications go to your account’s email, so you need to sign in.',
    textNoEmail: 'Your account has no email address, so Lớp Vui can’t send notifications yet.',
    text: 'Sent to {{email}} so you know right away when something changes on your account.',
    accountEmail: 'your account’s email',
    signInTitle: 'Sign in to get notifications',
    signInHint: 'When your account signs in on a new device, or when your password is changed.',
    signIn: 'Sign in',
    newSignIn: 'Sign-in on a new device',
    newSignInHint: 'When your account signs in on a browser or computer it hasn’t used before.',
    passwordChanged: 'Password changed',
    passwordChangedHint: 'When the password is changed in My profile.',
  },
}
