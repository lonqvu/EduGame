import type { Strings } from '@/i18n/locales/types'
import type { home as vi } from '@/i18n/locales/vi/home'

export const home: Strings<typeof vi> = {
  greeting: 'Hi, {{name}}!',
  greetingGuest: 'Hello!',
  greetingTeacher: 'Hello, teacher!',
  question: 'What will your class play today?',
  manageClasses: 'Manage classes',
  createClass: 'Create class',
  teachingLabel: 'Teaching now: {{name}}. Change class',
  noClassLower: 'no class',
  noClass: 'No class yet',
  play: 'Run a game',
  heroAlt: 'A teacher and children at the board: learn happily with Lớp Vui!',
  deleteConfirm: 'Remove “{{title}}” from your library?',
  deleteText: 'The game is archived; past results are kept.',
  deleted: 'Removed from your library',
  mixed: 'General',

  tiles: {
    createSet: 'Create question set',
    createSetText: 'Write once, use in every game',
    classes: 'Manage classes',
    classesText: 'Students, groups and stars',
  },

  recent: {
    title: 'Recently played',
    collapse: 'Show less',
    showAll: 'Show all',
    loading: 'Loading games…',
    error: 'Couldn’t load your games.',
    empty: 'You don’t have any games yet.',
    createFirst: 'Create your first game',
    resume: 'Continue',
    replay: 'Play again',
    replayLabel: 'Play {{title}} again',
    editQuestions: 'Edit questions',
    rulesSettings: 'Rules & settings',
    remove: 'Remove from library',
    optionsFor: 'Options for {{title}}',
  },

  featured: {
    title: 'Featured games',
    all: 'See all',
  },

  tools: {
    title: 'Classroom tools',
    all: 'All',
    SPIN_WHEEL: 'Pick a name',
    SPIN_WHEEL_text: 'Wheel',
    TIMER: 'Timer',
    TIMER_text: 'Countdown',
    TEAM_MAKER: 'Groups',
    TEAM_MAKER_text: 'Random',
    NOISE_METER: 'Noise',
    NOISE_METER_text: 'Keep it quiet',
  },

  sets: {
    title: 'Question sets',
    showAll: 'Show all',
    empty: 'No question sets yet. <link>Create a question set</link>',
    playWith: 'Play with {{title}}',
    play: 'Play',
  },

  praise: {
    title: 'Praise corner',
    week: 'This week',
    all: 'All time',
    noStudents: 'The class has no students yet.',
    noneThisWeek: 'No one has been praised this week yet',
    noneYet: 'No one in the class has been praised yet',
    hint: 'Give stars when the class plays, or praise students on the class page.',
    praise: 'Praise students',
    fullRanking: 'See the full ranking',
    rankingWeek: 'Ranking this week',
    rankingAll: 'All-time ranking',
  },
}
