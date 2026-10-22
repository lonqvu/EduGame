"""Sound effects and music of the projector games, synthesized so Lớp Vui owns them outright (no licence to track).

    python3 scripts/make_sounds.py        # from frontend/; needs numpy and ffmpeg

Writes public/assets/sounds/<name>.webm (Opus) and <name>.mp3 (Safari / older browsers). Each sound is built from
the physics of the real thing (struck bars, bells with inharmonic partials, filtered noise for claps, water and
paper), placed in a small room (convolution reverb), then levelled so they sit together: effects at one loudness,
music quieter under them. A recorded file can replace any of them later under the same name.
"""

import os
import subprocess
import tempfile

import numpy as np

RATE = 48_000
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'sounds')
rng = np.random.default_rng(20261018)


# --- Building blocks ----------------------------------------------------------------------------------------------

def t(seconds):
    return np.arange(int(seconds * RATE)) / RATE


def silence(seconds):
    return np.zeros(int(seconds * RATE))


def env(n, attack=0.005, decay=0.3, curve=1.0):
    """Fast attack, exponential decay over `decay` seconds (time to -60 dB)."""
    x = np.arange(n) / RATE
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    return a * np.exp(-6.9 * x / decay) ** curve


def note(freq):
    """Frequency of a note name like 'C5' or 'F#4'."""
    names = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1,
             'B': 2}
    if isinstance(freq, (int, float)):
        return float(freq)
    name, octave = freq[:-1], int(freq[-1])
    return 440.0 * 2 ** ((names[name] + 12 * (octave - 4)) / 12)


def partials(freq, seconds, ratios, amps, decays, attack=0.002, detune=0.0):
    """Additive tone: partials at freq*ratio, each with its own amplitude and decay."""
    x = t(seconds)
    out = np.zeros_like(x)
    f0 = note(freq)
    for r, a, d in zip(ratios, amps, decays):
        f = f0 * r * (1 + detune * rng.uniform(-1, 1))
        if f >= RATE / 2 - 1000:
            continue
        phase = rng.uniform(0, 2 * np.pi)
        out += a * np.sin(2 * np.pi * f * x + phase) * env(len(x), attack, d)
    return out


def marimba(freq, seconds=0.9, bright=1.0):
    """Struck wooden bar: fundamental, the 4th and 10th partials of a tuned bar, a soft mallet click."""
    tone = partials(freq, seconds, [1, 3.93, 9.2], [1, 0.35 * bright, 0.12 * bright], [seconds, 0.18, 0.06], 0.001)
    click = bandpass(rng.normal(size=int(0.012 * RATE)), 2000, 6000) * env(int(0.012 * RATE), 0.0005, 0.01)
    tone[: len(click)] += 0.15 * click
    return tone


def bell(freq, seconds=2.5, bright=1.0):
    """Church/hand bell: the inharmonic partials of a real bell (hum, prime, tierce, quint, nominal...)."""
    ratios = [0.5, 1.0, 1.183, 1.506, 2.0, 2.514, 2.662, 3.011, 4.166, 5.433]
    amps = [0.35, 1.0, 0.55, 0.3, 0.7, 0.25 * bright, 0.2 * bright, 0.25 * bright, 0.12 * bright, 0.08 * bright]
    decays = [seconds, seconds * 0.9, seconds * 0.7, seconds * 0.5, seconds * 0.6, seconds * 0.35, seconds * 0.3,
              seconds * 0.25, seconds * 0.15, seconds * 0.1]
    tone = partials(freq, seconds, ratios, amps, decays, 0.001, detune=0.0015)
    strike = highpass(rng.normal(size=int(0.02 * RATE)), 3000) * env(int(0.02 * RATE), 0.0002, 0.015)
    tone[: len(strike)] += 0.2 * strike
    return tone


def brass(freq, seconds, vibrato=0.0):
    """Bright brass-like note: many harmonics falling off, a quick swell, optional vibrato."""
    x = t(seconds)
    f0 = note(freq)
    vib = 1 + vibrato * np.sin(2 * np.pi * 5.5 * x) * np.clip((x - 0.15) / 0.2, 0, 1)
    phase = 2 * np.pi * np.cumsum(f0 * vib) / RATE
    out = np.zeros_like(x)
    for h in range(1, 14):
        if f0 * h > 12000:
            break
        out += np.sin(h * phase) / h ** 1.1
    a = np.clip(x / 0.03, 0, 1)
    release = np.clip((seconds - x) / 0.08, 0, 1)
    return out * a * release * (0.9 + 0.1 * np.exp(-x * 4))


def spectrum_filter(signal, gain):
    """Filters by shaping the spectrum: gain(freqs) -> amplitude per frequency."""
    n = len(signal)
    spec = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(n, 1 / RATE)
    return np.fft.irfft(spec * gain(freqs), n)


def bandpass(signal, low, high):
    return spectrum_filter(signal, lambda f: 1 / (1 + (low / np.maximum(f, 1)) ** 4) / (1 + (f / high) ** 4))


def lowpass(signal, cutoff):
    return spectrum_filter(signal, lambda f: 1 / (1 + (f / cutoff) ** 4))


def highpass(signal, cutoff):
    return spectrum_filter(signal, lambda f: 1 / (1 + (cutoff / np.maximum(f, 1)) ** 4))


def sweep_noise(seconds, start, end, width=0.8):
    """Noise through a band that slides from `start` to `end` Hz (whooshes, swishes)."""
    n = int(seconds * RATE)
    chunk = 512
    out = np.zeros(n)
    noise = rng.normal(size=n + chunk)
    for i in range(0, n, chunk // 2):
        frac = i / max(n - 1, 1)
        centre = start * (end / start) ** frac
        seg = noise[i:i + chunk] * np.hanning(chunk)
        seg = bandpass(seg, centre * (1 - width / 2), centre * (1 + width / 2))
        out[i:i + chunk] += seg[: len(out[i:i + chunk])]
    return out


def chirp(f_start, f_end, seconds, shape='sine'):
    x = t(seconds)
    f = f_start * (f_end / f_start) ** (x / seconds)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    if shape == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(phase))
    return np.sin(phase)


def mix(*parts):
    """Adds (gain, sound) pairs of different lengths, from the start."""
    n = max(len(sound) for _, sound in parts)
    out = np.zeros(n)
    for gain, sound in parts:
        out[: len(sound)] += gain * sound
    return out


def place(out, sound, at, gain=1.0):
    """Mixes `sound` into `out` starting at `at` seconds, growing `out` if needed."""
    i = int(at * RATE)
    if i + len(sound) > len(out):
        out = np.concatenate([out, np.zeros(i + len(sound) - len(out))])
    out[i:i + len(sound)] += gain * sound
    return out


_ROOMS = {}


def room(size=0.5, damp=6000):
    """Impulse response of a small bright room: early reflections, then a decaying noise tail."""
    key = (size, damp)
    if key not in _ROOMS:
        n = int(size * RATE)
        tail = rng.normal(size=n) * np.exp(-6.9 * np.arange(n) / n)
        tail = lowpass(tail, damp)
        ir = np.zeros(n)
        for delay, g in [(0.011, 0.5), (0.019, 0.35), (0.027, 0.25), (0.041, 0.18)]:
            ir[int(delay * RATE)] += g
        ir += 0.12 * tail / np.max(np.abs(tail))
        _ROOMS[key] = ir
    return _ROOMS[key]


def reverb(signal, wet=0.18, size=0.5, damp=6000):
    ir = room(size, damp)
    n = len(signal) + len(ir)
    size_fft = 1 << (n - 1).bit_length()
    wet_sig = np.fft.irfft(np.fft.rfft(signal, size_fft) * np.fft.rfft(ir, size_fft), size_fft)[:n]
    dry = np.concatenate([signal, np.zeros(len(ir))])
    return dry + wet * wet_sig


def fade_out(signal, seconds=0.02):
    n = min(len(signal), int(seconds * RATE))
    signal = signal.copy()
    signal[-n:] *= np.linspace(1, 0, n)
    return signal


def trim(signal, floor_db=-60):
    """Cuts the silent tail (below floor_db of the peak), keeping a short fade."""
    peak = np.max(np.abs(signal)) or 1
    above = np.nonzero(np.abs(signal) > peak * 10 ** (floor_db / 20))[0]
    end = (above[-1] + int(0.01 * RATE)) if len(above) else len(signal)
    return fade_out(signal[:end], 0.015)


def level(signal, target_db, window=0.3, ceiling_db=-1.5):
    """Loudness by the loudest `window` of RMS (what the ear judges a short sound by); peaks kept under the ceiling
    so nothing clips once encoded."""
    n = max(1, min(len(signal), int(window * RATE)))
    squares = np.convolve(signal ** 2, np.ones(n) / n, mode='valid')
    rms = np.sqrt(np.max(squares)) or 1e-9
    out = signal * (10 ** (target_db / 20) / rms)
    ceiling = 10 ** (ceiling_db / 20)
    peak = np.max(np.abs(out))
    return out * (ceiling / peak) if peak > ceiling else out


# --- Effects ------------------------------------------------------------------------------------------------------

def correct(variant):
    """Bright rising chime (two or three struck notes) and a sprinkle of sparkles."""
    notes = [('E6', 'B6'), ('C6', 'E6', 'G6')][variant]
    out = silence(0.0)
    for i, n in enumerate(notes):
        out = place(out, mix((0.6, bell(n, 0.9, bright=0.6)), (0.5, marimba(n, 0.6))), i * 0.085)
    for _ in range(7):
        sparkle = partials(rng.uniform(3500, 7000), 0.25, [1], [1], [0.18])
        out = place(out, sparkle, rng.uniform(0.08, 0.35), 0.12)
    return reverb(out, 0.22)


def wrong(variant):
    """A gentle, rounded 'bwomp' (never a harsh buzzer: children hear it often)."""
    if variant == 0:
        out = silence(0.0)
        for i, (f0, f1) in enumerate([(392, 330), (311, 220)]):
            x = t(0.28)
            tone = chirp(f0, f1, 0.28, 'tri') + 0.3 * chirp(f0 * 2, f1 * 2, 0.28)
            out = place(out, lowpass(tone, 1800) * env(len(x), 0.01, 0.35), i * 0.2)
        return reverb(out, 0.12)
    x = t(0.55)
    vib = 1 + 0.05 * np.sin(2 * np.pi * 9 * x)
    f = 330 * (110 / 330) ** (x / 0.55) * vib
    tone = np.sin(2 * np.pi * np.cumsum(f) / RATE)
    return reverb(lowpass(tone + 0.25 * np.sin(2 * 2 * np.pi * np.cumsum(f) / RATE), 1500) * env(len(x), 0.01, 0.7), 0.1)


def tick(high):
    """Wood block for the countdown; the last seconds use a higher, sharper one."""
    f = 2400 if high else 1700
    tone = partials(f, 0.09, [1, 2.7], [1, 0.3], [0.05, 0.02], 0.0005)
    click = highpass(rng.normal(size=int(0.004 * RATE)), 4000) * 0.4
    tone[: len(click)] += click
    return reverb(tone, 0.08, 0.3)


def time_up():
    """Game-show time's-up: two bright notes over a soft buzz, then a gong-like ring."""
    x = t(0.9)
    buzz = (np.sin(2 * np.pi * 220 * x) + np.sin(2 * np.pi * 223 * x) + 0.5 * np.sin(2 * np.pi * 440 * x))
    buzz = lowpass(buzz, 1200) * env(len(x), 0.01, 0.9)
    out = place(silence(0.0), buzz, 0, 0.5)
    out = place(out, bell('A4', 1.6, bright=0.8), 0.0, 0.6)
    out = place(out, bell('E4', 1.8, bright=0.8), 0.22, 0.6)
    return reverb(out, 0.2)


def fanfare():
    """Ta-ta-ta-taaa on bright brass with a cymbal swell, for the winners."""
    out = silence(0.0)
    seq = [('G4', 0.0, 0.14), ('C5', 0.16, 0.14), ('E5', 0.32, 0.14), ('G5', 0.48, 1.2)]
    for name, at, length in seq:
        chord = brass(name, length, vibrato=0.006 if length > 1 else 0)
        if length > 1:
            chord = mix((1, chord), (0.6, brass(note(name) * 2 ** (-5 / 12), length, 0.006)), (0.5, brass(note(name) / 2, length)))
        out = place(out, chord, at, 0.5)
    cymbal = highpass(rng.normal(size=int(1.6 * RATE)), 5000)
    x = t(1.6)
    cymbal *= np.clip(x / 0.05, 0, 1) * np.exp(-x * 2.2)
    out = place(out, cymbal, 0.48, 0.25)
    timpani = partials('C3', 1.2, [1, 1.5, 1.99], [1, 0.4, 0.3], [1.0, 0.5, 0.4], 0.003)
    out = place(out, timpani, 0.48, 0.7)
    return reverb(lowpass(out, 9000), 0.25, 0.8)


def applause(seconds=3.2):
    """A class clapping: hundreds of short claps (bandpassed noise bursts), swelling then fading."""
    out = silence(seconds + 0.3)
    clap_len = int(0.018 * RATE)
    clap_env = env(clap_len, 0.0005, 0.015)
    count = int(seconds * 90)
    for _ in range(count):
        at = rng.uniform(0, seconds)
        shape = np.sin(np.pi * min(at / 0.35, 1) / 2) * min(1, (seconds - at) / 1.2)
        centre = rng.uniform(900, 2600)
        clap = bandpass(rng.normal(size=clap_len), centre * 0.6, centre * 1.6) * clap_env
        out = place(out, clap, at, shape * rng.uniform(0.4, 1.0))
    return reverb(out, 0.3, 0.9)


def star():
    """Magic 'ting': a high bell and a rising glitter."""
    out = bell('C7', 1.2, bright=0.5) * 0.7
    for i in range(9):
        f = 2600 * 1.12 ** i
        out = place(out, partials(f, 0.2, [1], [1], [0.15]), 0.03 + i * 0.035, 0.25)
    return reverb(out, 0.25)


def pop():
    """A team or a student picked: round 'bloop'."""
    x = t(0.12)
    tone = chirp(950, 380, 0.12) * env(len(x), 0.001, 0.12)
    click = highpass(rng.normal(size=int(0.003 * RATE)), 3000) * 0.3
    tone[: len(click)] += click
    return reverb(tone, 0.1, 0.3)


def flip():
    """Card turned over: a quick paper swish and a soft tap."""
    swish = sweep_noise(0.13, 1800, 6500, 0.9) * env(int(0.13 * RATE), 0.02, 0.13)
    tap = lowpass(rng.normal(size=int(0.02 * RATE)), 1500) * env(int(0.02 * RATE), 0.0005, 0.02)
    return reverb(place(swish, tap, 0.11, 0.6), 0.08, 0.3)


def match():
    """Pair found: two quick high struck notes and a sparkle."""
    out = place(silence(0.0), mix((1, marimba('G6', 0.4)), (0.4, bell('G6', 0.5, 0.4))), 0)
    out = place(out, mix((1, marimba('D7', 0.5)), (0.4, bell('D7', 0.6, 0.4))), 0.07)
    return reverb(out, 0.2)


def golden_bell():
    """The golden bell rung three times, the last left ringing."""
    out = silence(0.0)
    for i, gain in enumerate([0.8, 0.85, 1.0]):
        out = place(out, bell('E5', 2.8 if i == 2 else 0.9, 1.0), i * 0.28, gain)
    return reverb(out, 0.3, 1.0)


def out_sound():
    """A student out: soft falling whistle."""
    x = t(0.45)
    tone = chirp(900, 260, 0.45) * env(len(x), 0.01, 0.6)
    return reverb(lowpass(tone, 3000), 0.15)


def splash():
    """A boat moving on: water splash and bubbles."""
    n = int(0.5 * RATE)
    x = t(0.5)
    body = lowpass(rng.normal(size=n), 2500) * np.exp(-x * 9) * np.clip(x / 0.01, 0, 1)
    hiss = highpass(rng.normal(size=n), 3500) * np.exp(-x * 14) * 0.4
    out = mix((1, body), (1, hiss))
    for _ in range(10):
        b = chirp(rng.uniform(300, 600), rng.uniform(900, 1600), 0.05) * env(int(0.05 * RATE), 0.002, 0.05)
        out = place(out, b, rng.uniform(0.05, 0.4), 0.18)
    return reverb(out, 0.15)


def gallop():
    """Hooves at a canter (ta-ta-dum), one bar to loop while the horses race."""
    beat = 60 / 165
    out = silence(beat * 2)
    for at, gain in [(0, 0.7), (0.17, 0.8), (0.34, 1.0), (beat, 0.7), (beat + 0.17, 0.8), (beat + 0.34, 1.0)]:
        thump = partials(rng.uniform(110, 140), 0.12, [1, 2.3], [1, 0.3], [0.08, 0.04], 0.001)
        clack = bandpass(rng.normal(size=int(0.015 * RATE)), 1500, 4500) * env(int(0.015 * RATE), 0.0005, 0.012)
        thump[: len(clack)] += 0.5 * clack
        out = place(out, thump, at, gain)
    return out[: int(beat * 2 * RATE)]


def wheel_tick():
    """The wheel's pointer flicking a peg: tiny plastic click (played many times a second)."""
    n = int(0.03 * RATE)
    click = bandpass(rng.normal(size=n), 2500, 7000) * env(n, 0.0003, 0.012)
    tone = partials(3100, 0.03, [1], [0.5], [0.02], 0.0003)
    return mix((1, click), (1, tone))


def dice():
    """Dice shaken in a cup, then rolling to a stop on the table."""
    out = silence(0.0)
    for i in range(14):
        at = i * 0.035 + rng.uniform(0, 0.012)
        hit = bandpass(rng.normal(size=int(0.012 * RATE)), 2000, 7000) * env(int(0.012 * RATE), 0.0003, 0.01)
        out = place(out, hit, at, rng.uniform(0.3, 0.7))
    for i, gap in enumerate([0.0, 0.09, 0.16, 0.21, 0.25]):
        thud = partials(rng.uniform(300, 500), 0.08, [1, 2.4], [1, 0.4], [0.05, 0.02], 0.0005)
        knock = bandpass(rng.normal(size=int(0.01 * RATE)), 1500, 5000) * env(int(0.01 * RATE), 0.0003, 0.008)
        thud[: len(knock)] += 0.6 * knock
        out = place(out, thud, 0.55 + gap, 1.0 - i * 0.15)
    return reverb(out, 0.1, 0.4)


def shuffle():
    """Cards riffled (making groups)."""
    out = silence(0.0)
    count = 36
    for i in range(count):
        at = 0.7 * (i / count) ** 0.9
        n = int(0.008 * RATE)
        tick_ = bandpass(rng.normal(size=n), 2500, 8000) * env(n, 0.0003, 0.007)
        out = place(out, tick_, at, 0.4 + 0.6 * np.sin(np.pi * i / count))
    return reverb(out, 0.08, 0.3)


def whoosh():
    """Moving on to the next question."""
    n = int(0.38 * RATE)
    x = np.arange(n) / RATE
    shape = np.sin(np.pi * np.clip(x / 0.38, 0, 1)) ** 1.5
    return reverb(sweep_noise(0.38, 500, 4000, 1.0) * shape, 0.12)


def start():
    """The game begins: a rising marimba run and a bright chord."""
    out = silence(0.0)
    for i, n in enumerate(['C5', 'E5', 'G5', 'C6']):
        out = place(out, marimba(n, 0.6), i * 0.075)
    out = place(out, mix((0.4, bell('C6', 1.2, 0.5)), (0.6, marimba('E6', 0.9)), (0.5, marimba('G6', 0.9))), 0.32)
    return reverb(out, 0.22)


def reveal():
    """A letter or an answer appears."""
    return reverb(mix((1, marimba('A5', 0.5)), (0.3, bell('A6', 0.5, 0.4))), 0.15)


def drop():
    """A card put down (ordering, sorting)."""
    n = int(0.07 * RATE)
    thud = partials(220, 0.07, [1, 2.2], [1, 0.4], [0.05, 0.03], 0.0005)
    tap = bandpass(rng.normal(size=n), 800, 3500) * env(n, 0.0003, 0.02)
    return reverb(mix((1, thud), (0.5, tap)), 0.08, 0.3)


# --- Music --------------------------------------------------------------------------------------------------------

CHORDS = {'C': ['C', 'E', 'G'], 'G': ['G', 'B', 'D'], 'Am': ['A', 'C', 'E'], 'F': ['F', 'A', 'C'],
          'Em': ['E', 'G', 'B'], 'Dm': ['D', 'F', 'A']}


def music(bpm, progression, tense):
    """A loop of 8 bars: marimba arpeggios, a round bass, a shaker; the tense one adds a pulse and hi-hats."""
    beat = 60 / bpm
    bars = len(progression)
    length = bars * 4 * beat
    out = silence(length + 2)
    for bar, chord in enumerate(progression):
        root = CHORDS[chord][0]
        names = CHORDS[chord]
        t0 = bar * 4 * beat
        # Arpeggio up and down in eighths.
        pattern = [0, 1, 2, 1, 0, 2, 1, 2] if not tense else [0, 1, 2, 1, 0, 1, 2, 1]
        for i, k in enumerate(pattern):
            octave = 5 if k < 2 or not tense else 6
            out = place(out, marimba(f'{names[k]}{octave}', 0.5, 0.9), t0 + i * beat / 2, 0.32)
        # Bass on 1 and 3 (eighth pulse when tense).
        steps = range(8) if tense else [0, 4]
        for s in steps:
            bass = partials(f'{root}2', beat * (0.45 if tense else 1.6), [1, 2, 3], [1, 0.35, 0.12],
                            [beat * (0.6 if tense else 2.0), 0.4, 0.2], 0.004)
            out = place(out, bass, t0 + s * beat / 2, 0.45 if tense else 0.55)
        # Shaker in sixteenths, accents off the beat.
        for s in range(16):
            n = int(0.05 * RATE)
            shaker = highpass(rng.normal(size=n), 6000) * env(n, 0.004, 0.05)
            out = place(out, shaker, t0 + s * beat / 4, 0.09 if s % 2 else 0.05)
        if tense:
            for s in range(4):
                kick = partials(60, 0.3, [1, 1.5], [1, 0.3], [0.25, 0.1], 0.001)
                out = place(out, kick, t0 + s * beat, 0.5)
    out = reverb(out, 0.2, 0.9)
    # Seamless loop: the tail after the last bar wraps onto the start.
    n = int(length * RATE)
    loop = out[:n].copy()
    tail = out[n:]
    loop[: len(tail)] += tail[: n]
    return loop


# --- Writing ------------------------------------------------------------------------------------------------------

def write(name, signal, target_db=-14.0, keep_tail=False):
    signal = signal if keep_tail else trim(signal)
    signal = level(signal, target_db)
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.f32', delete=False) as raw:
        raw.write(signal.astype(np.float32).tobytes())
    src = ['-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', raw.name]
    base = os.path.join(OUT, name)
    bitrate = '64k' if keep_tail else '48k'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *src, '-c:a', 'libopus', '-b:a', bitrate, f'{base}.webm'],
                   check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *src, '-c:a', 'libmp3lame', '-b:a',
                    '96k' if keep_tail else '80k', f'{base}.mp3'], check=True)
    os.unlink(raw.name)
    print(f'{name:18s} {len(signal) / RATE:5.2f}s')


if __name__ == '__main__':
    write('correct-1', correct(0))
    write('correct-2', correct(1))
    write('wrong-1', wrong(0), -16)
    write('wrong-2', wrong(1), -16)
    write('tick', tick(False), -18)
    write('tick-high', tick(True), -16)
    write('time-up', time_up(), -11)
    write('fanfare', fanfare(), -13)
    write('applause', applause(), -17)
    write('star', star(), -15)
    write('pop', pop(), -16)
    write('flip', flip(), -17)
    write('match', match(), -15)
    write('golden-bell', golden_bell(), -13)
    write('out', out_sound(), -15)
    write('splash', splash(), -16)
    write('gallop', gallop(), -17, keep_tail=True)
    write('wheel-tick', wheel_tick(), -20)
    write('dice', dice(), -15)
    write('shuffle', shuffle(), -17)
    write('whoosh', whoosh(), -16)
    write('start', start(), -14)
    write('reveal', reveal(), -17)
    write('drop', drop(), -17)
    write('music-calm', music(116, ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], tense=False), -19, keep_tail=True)
    write('music-tense', music(144, ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'Em'], tense=True), -22, keep_tail=True)
