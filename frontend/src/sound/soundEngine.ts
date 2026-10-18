import { Howl, Howler } from 'howler'

/**
 * Sounds of the projector games (files made by scripts/make_sounds.py; a recorded file can replace any of them under
 * the same name). Nothing here throws: a browser that blocks or lacks audio simply stays silent.
 *
 * Use it through `useSound()`, which is silent outside the projector stage (previews, editors).
 */
export type SoundName =
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'tickHigh'
  | 'timeUp'
  | 'fanfare'
  | 'applause'
  | 'star'
  | 'pop'
  | 'flip'
  | 'match'
  | 'bell'
  | 'out'
  | 'splash'
  | 'gallop'
  | 'wheelTick'
  | 'dice'
  | 'shuffle'
  | 'whoosh'
  | 'start'
  | 'reveal'
  | 'drop'

export type MusicMood = 'calm' | 'tense'

interface SoundSpec {
  /** File names; one is picked at random each time, so a sound heard often never feels mechanical. */
  files: string[]
  /** Loudness against the others. */
  gain?: number
  /** Plays a little higher or lower each time (±4%). */
  vary?: boolean
  /** How many may overlap (wheel ticks come many per second). */
  pool?: number
  /** Music is lowered while it plays, for this many seconds. */
  duck?: number
}

export const SOUNDS: Record<SoundName, SoundSpec> = {
  correct: { files: ['correct-1', 'correct-2'], vary: true },
  wrong: { files: ['wrong-1', 'wrong-2'], gain: 0.85, vary: true },
  tick: { files: ['tick'], gain: 0.7 },
  tickHigh: { files: ['tick-high'], gain: 0.8 },
  timeUp: { files: ['time-up'], duck: 1.5 },
  fanfare: { files: ['fanfare'], duck: 2.5 },
  applause: { files: ['applause'], gain: 0.8 },
  star: { files: ['star'], vary: true },
  pop: { files: ['pop'], gain: 0.8, vary: true, pool: 8 },
  flip: { files: ['flip'], vary: true, pool: 6 },
  match: { files: ['match'], vary: true },
  bell: { files: ['golden-bell'], duck: 3 },
  out: { files: ['out'], gain: 0.8 },
  splash: { files: ['splash'], vary: true },
  gallop: { files: ['gallop'], gain: 0.9 },
  wheelTick: { files: ['wheel-tick'], gain: 0.55, vary: true, pool: 16 },
  dice: { files: ['dice'], vary: true },
  shuffle: { files: ['shuffle'], vary: true },
  whoosh: { files: ['whoosh'], gain: 0.7, vary: true },
  start: { files: ['start'] },
  reveal: { files: ['reveal'], gain: 0.85, vary: true, pool: 12 },
  drop: { files: ['drop'], vary: true, pool: 8 },
}

const BASE = '/assets/sounds'
/** Music sits under the effects. */
const MUSIC_GAIN = 0.55
const DUCKED = 0.25
const FADE_MS = 600

export interface SoundOptions {
  /** 1 = as recorded; 1.2 = higher and faster (e.g. a streak of right answers). */
  rate?: number
  /** 0–1, on top of the sound's own loudness. */
  volume?: number
}

let enabled = true
let musicOn = true
const howls = new Map<string, Howl>()
let music: { mood: MusicMood; howl: Howl; id: number } | null = null
/** The mood the screen asks for; null when no screen wants music. */
let wantedMood: MusicMood | null = null
let duckUntil = 0
let duckTimer: ReturnType<typeof setTimeout> | undefined

function howl(file: string, options: { loop?: boolean; pool?: number } = {}): Howl {
  let h = howls.get(file)
  if (!h) {
    h = new Howl({
      src: [`${BASE}/${file}.webm`, `${BASE}/${file}.mp3`],
      format: ['webm', 'mp3'],
      preload: true,
      loop: options.loop ?? false,
      pool: options.pool ?? 5,
    })
    howls.set(file, h)
  }
  return h
}

function safely(action: () => void) {
  try {
    action()
  } catch {
    // No audio here (blocked, unsupported): the game goes on silently.
  }
}

/** Loads these sounds now, so the first one plays without a gap. */
export function preloadSounds(names: SoundName[]) {
  safely(() => names.forEach((name) => SOUNDS[name].files.forEach((file) => howl(file, { pool: SOUNDS[name].pool }))))
}

export function playSound(name: SoundName, options: SoundOptions = {}) {
  if (!enabled) return
  safely(() => {
    const spec = SOUNDS[name]
    const file = spec.files[Math.floor(Math.random() * spec.files.length)]
    const h = howl(file, { pool: spec.pool })
    const id = h.play()
    const rate = (options.rate ?? 1) * (spec.vary ? 1 + (Math.random() * 2 - 1) * 0.04 : 1)
    h.rate(Math.min(Math.max(rate, 0.5), 2), id)
    h.volume(Math.min(1, (spec.gain ?? 1) * (options.volume ?? 1)), id)
    if (spec.duck) duck(spec.duck)
  })
}

/** Plays a sound over and over (hooves while the horses race) until the returned function is called. */
export function loopSound(name: SoundName): () => void {
  if (!enabled) return () => undefined
  let stop = () => undefined as void
  safely(() => {
    const spec = SOUNDS[name]
    const h = howl(`${spec.files[0]}`, { pool: spec.pool })
    const id = h.play()
    h.loop(true, id)
    h.volume(spec.gain ?? 1, id)
    stop = () => safely(() => h.stop(id))
  })
  return () => stop()
}

/** Lowers the music for a moment, under a sound that matters (fanfare, time up). */
function duck(seconds: number) {
  const playing = music
  if (!playing) return
  duckUntil = Date.now() + seconds * 1000
  safely(() => playing.howl.fade(MUSIC_GAIN, MUSIC_GAIN * DUCKED, 150, playing.id))
  clearTimeout(duckTimer)
  duckTimer = setTimeout(() => {
    if (music === playing && Date.now() >= duckUntil) safely(() => playing.howl.fade(MUSIC_GAIN * DUCKED, MUSIC_GAIN, 800, playing.id))
  }, seconds * 1000)
}

function applyMusic() {
  const mood = enabled && musicOn ? wantedMood : null
  if (music && music.mood === mood) return
  const old = music
  music = null
  if (old) {
    // By id: a quick off-and-on plays the same file again, and only the old playback must stop.
    safely(() => old.howl.fade(MUSIC_GAIN, 0, FADE_MS, old.id))
    setTimeout(() => safely(() => old.howl.stop(old.id)), FADE_MS + 50)
  }
  if (!mood) return
  safely(() => {
    const h = howl(`music-${mood}`, { loop: true, pool: 2 })
    const id = h.play()
    h.volume(0, id)
    h.fade(0, MUSIC_GAIN, FADE_MS, id)
    music = { mood, howl: h, id }
  })
}

let releaseTimer: ReturnType<typeof setTimeout> | undefined

/** A game screen opens: its music starts (calm), if the teacher wants music; music already playing goes on. */
export function startMusic(mood: MusicMood = 'calm') {
  clearTimeout(releaseTimer)
  wantedMood = music && wantedMood ? wantedMood : mood
  applyMusic()
}

/**
 * The screen with music closes. The music stops unless the next screen wants it too within a moment (Lật ô goes
 * board → tile → board on separate pages: the music must not start over each time).
 */
export function releaseMusic() {
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(stopMusic, 300)
}

/** The tension of the moment (the last seconds of a question); ignored when no music is wanted. */
export function setMusicMood(mood: MusicMood) {
  if (wantedMood === null) return
  wantedMood = mood
  applyMusic()
}

export function stopMusic() {
  clearTimeout(releaseTimer)
  wantedMood = null
  applyMusic()
}

/** From the teacher's settings ("Cài đặt" → Âm thanh, and the projector's speaker button). */
export function configureSound(settings: { enabled: boolean; volume: number; music: boolean }) {
  enabled = settings.enabled
  musicOn = settings.music
  safely(() => {
    Howler.volume(Math.min(Math.max(settings.volume, 0), 100) / 100)
    Howler.mute(!settings.enabled)
  })
  applyMusic()
}
