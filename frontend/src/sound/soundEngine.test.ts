import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A fake howler: what was loaded, played, faded and stopped. */
const fake = vi.hoisted(() => {
  const created: FakeHowl[] = []
  const global = { volume: 1, muted: false }
  class FakeHowl {
    src: string[]
    looping: boolean
    plays = 0
    stops = 0
    vol = 1
    rates: number[] = []
    volumes: number[] = []
    fades: [number, number][] = []
    constructor(options: { src: string[]; loop?: boolean }) {
      this.src = options.src
      this.looping = options.loop ?? false
      created.push(this)
    }
    play() {
      this.plays++
      return this.plays
    }
    stop() {
      this.stops++
    }
    rate(r: number) {
      this.rates.push(r)
    }
    volume(v?: number) {
      if (v === undefined) return this.vol
      this.vol = v
      this.volumes.push(v)
      return this
    }
    loop() {
      return this
    }
    fade(from: number, to: number) {
      this.fades.push([from, to])
      this.vol = to
    }
  }
  const Howler = {
    volume: (v: number) => void (global.volume = v),
    mute: (m: boolean) => void (global.muted = m),
  }
  return { created, global, FakeHowl, Howler }
})

vi.mock('howler', () => ({ Howl: fake.FakeHowl, Howler: fake.Howler }))

type Engine = typeof import('@/sound/soundEngine')
let engine: Engine

const file = (src: string[]) => src[0].split('/').pop()!.replace('.webm', '')
const loaded = (name: string) => fake.created.filter((h) => file(h.src) === name)

beforeEach(async () => {
  vi.resetModules()
  fake.created.length = 0
  engine = await import('@/sound/soundEngine')
  engine.configureSound({ enabled: true, volume: 80, music: true })
})

describe('effects', () => {
  it('loads a sound once, from Opus with an MP3 for Safari, and plays it at the settings volume', () => {
    engine.playSound('star')
    engine.playSound('star')
    expect(loaded('star')).toHaveLength(1)
    expect(loaded('star')[0].src).toEqual(['/assets/sounds/star.webm', '/assets/sounds/star.mp3'])
    expect(loaded('star')[0].plays).toBe(2)
    expect(fake.global.volume).toBe(0.8)
  })

  it('picks among the variants and varies the pitch a little, never twice the same feel', () => {
    for (let i = 0; i < 40; i++) engine.playSound('correct')
    const files = fake.created.map((h) => file(h.src))
    expect(files).toEqual(expect.arrayContaining(['correct-1', 'correct-2']))
    const rates = fake.created.flatMap((h) => h.rates)
    expect(Math.min(...rates)).toBeGreaterThanOrEqual(0.96)
    expect(Math.max(...rates)).toBeLessThanOrEqual(1.04)
    expect(new Set(rates).size).toBeGreaterThan(1)
  })

  it('a faster rate (a streak) and a softer volume are applied, within bounds', () => {
    engine.playSound('tick', { rate: 3, volume: 0.5 })
    const tick = loaded('tick')[0]
    expect(tick.rates).toEqual([2])
    expect(tick.volumes.at(-1)).toBeCloseTo(0.35)
  })

  it('stays silent when the sounds are turned off', () => {
    engine.configureSound({ enabled: false, volume: 80, music: true })
    engine.playSound('fanfare')
    expect(fake.created).toHaveLength(0)
    expect(fake.global.muted).toBe(true)
  })

  it('preloads without playing', () => {
    engine.preloadSounds(['correct', 'tick'])
    expect(fake.created.map((h) => file(h.src)).sort()).toEqual(['correct-1', 'correct-2', 'tick'])
    expect(fake.created.every((h) => h.plays === 0)).toBe(true)
  })
})

describe('music', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    return () => vi.useRealTimers()
  })

  it('starts calm and looping, fades to tense for the last seconds, and stops', () => {
    engine.startMusic()
    const calm = loaded('music-calm')[0]
    expect(calm.looping).toBe(true)
    expect(calm.plays).toBe(1)
    expect(calm.fades.at(-1)).toEqual([0, 0.55])

    engine.setMusicMood('tense')
    expect(loaded('music-tense')[0].plays).toBe(1)
    expect(calm.fades.at(-1)?.[1]).toBe(0)
    // Stopped once faded out.
    expect(calm.stops).toBe(0)
    vi.advanceTimersByTime(700)
    expect(calm.stops).toBe(1)

    // Same mood again: nothing restarts.
    engine.setMusicMood('tense')
    expect(loaded('music-tense')[0].plays).toBe(1)

    engine.stopMusic()
    vi.advanceTimersByTime(700)
    expect(loaded('music-tense')[0].stops).toBe(1)
  })

  it('a mood asked for once the music stopped (results on screen) does not bring it back', () => {
    engine.startMusic()
    engine.stopMusic()
    engine.setMusicMood('calm')
    expect(loaded('music-calm')[0].plays).toBe(1)
  })

  it('follows the settings: music off stops it, back on resumes the wanted mood', () => {
    engine.startMusic()
    engine.configureSound({ enabled: true, volume: 80, music: false })
    vi.advanceTimersByTime(700)
    expect(loaded('music-calm')[0].stops).toBe(1)
    engine.configureSound({ enabled: true, volume: 80, music: true })
    expect(loaded('music-calm')[0].plays).toBe(2)
    // Sounds off silence the music too.
    engine.configureSound({ enabled: false, volume: 80, music: true })
    vi.advanceTimersByTime(700)
    expect(loaded('music-calm')[0].stops).toBe(2)
  })

  it('is lowered under a fanfare, then comes back', () => {
    engine.startMusic()
    const calm = loaded('music-calm')[0]
    engine.playSound('fanfare')
    expect(calm.fades.at(-1)?.[1]).toBeCloseTo(0.55 * 0.25)
    vi.advanceTimersByTime(2600)
    expect(calm.fades.at(-1)?.[1]).toBe(0.55)
  })
})

describe('music across screens', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    return () => vi.useRealTimers()
  })

  it('goes on when the next screen also wants it (Lật ô: board, tile, board)', () => {
    engine.startMusic()
    engine.releaseMusic()
    vi.advanceTimersByTime(100)
    engine.startMusic()
    vi.advanceTimersByTime(1000)
    const calm = loaded('music-calm')[0]
    expect(calm.plays).toBe(1)
    expect(calm.stops).toBe(0)
  })

  it('stops when no screen wants it any more', () => {
    engine.startMusic()
    engine.releaseMusic()
    vi.advanceTimersByTime(1000)
    expect(loaded('music-calm')[0].stops).toBe(1)
  })
})

describe('loops', () => {
  it('plays until stopped, and not at all when sounds are off', () => {
    const stop = engine.loopSound('gallop')
    const gallop = loaded('gallop')[0]
    expect(gallop.plays).toBe(1)
    stop()
    expect(gallop.stops).toBe(1)

    engine.configureSound({ enabled: false, volume: 80, music: true })
    engine.loopSound('gallop')()
    expect(gallop.plays).toBe(1)
  })
})
