// Slice + bomb + miss SFX + breathing ambient.

let ctx: AudioContext | null = null;
function ac(): AudioContext {
  if (!ctx) {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx!;
}

export function unlockAudio() {
  try {
    const c = ac();
    if (c.state === 'suspended') c.resume().catch(() => {});
  } catch { /* ignore */ }
}

function tone(freq: number, dur: number, gainPeak: number, type: OscillatorType = 'sine', detune = 0) {
  try {
    const c = ac();
    const now = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainPeak, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(c.destination);
    o.start(now);
    o.stop(now + dur + 0.04);
  } catch { /* ignore */ }
}

function noiseBurst(dur: number, gainPeak: number, hpHz: number) {
  try {
    const c = ac();
    const now = c.currentTime;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hpHz;
    const g = c.createGain();
    g.gain.value = gainPeak;
    src.connect(hp).connect(g).connect(c.destination);
    src.start(now);
  } catch { /* ignore */ }
}

function pitchSweep(fStart: number, fEnd: number, dur: number, gainPeak: number, type: OscillatorType = 'sine') {
  try {
    const c = ac();
    const now = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(fStart, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, fEnd), now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainPeak, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(c.destination);
    o.start(now);
    o.stop(now + dur + 0.04);
  } catch { /* ignore */ }
}

/** Slice tone: clean high "shing", pitch rising with combo. */
export function sfxSlice(combo: number) {
  const c = Math.max(1, Math.min(15, combo));
  // High bright thwack
  pitchSweep(900 + c * 60, 220, 0.18, 0.12, 'triangle');
  // Whoosh burst
  noiseBurst(0.10, 0.08, 1800 + c * 80);
}

/** Bomb explosion — deep boom + noise tail. */
export function sfxBomb() {
  pitchSweep(220, 50, 0.45, 0.32, 'sawtooth');
  pitchSweep(110, 30, 0.55, 0.20, 'square');
  noiseBurst(0.45, 0.20, 200);
}

/** Missed food (fell off bottom). Soft thud. */
export function sfxMiss() {
  tone(180, 0.12, 0.10, 'sine');
  tone(120, 0.16, 0.06, 'sine', -8);
}

/** Run-end fanfare. */
export function sfxRunEnd() {
  tone(660, 0.18, 0.10, 'triangle');
  setTimeout(() => tone(880, 0.22, 0.09, 'triangle'), 130);
  setTimeout(() => tone(1320, 0.30, 0.07, 'triangle'), 280);
}

/** Brief swoosh on swipe start (subtle). */
export function sfxSwipeStart() {
  noiseBurst(0.06, 0.05, 1200);
}

// ─── Circus BGM ──────────────────────────────────────────────────────────
//
// Cheerful oompa march in F major. Plays a 16-beat phrase (~7s) then takes
// a 3.5s breath (so the bg respects the "no continuous drone" rule and gives
// the cleavers' meaty thwacks room to breathe). The cheerful tune over a
// pig-slicing game IS the joke.

// MIDI note → Hz (A4=69 / 440Hz reference)
function nHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
// Note names → MIDI for readability
const N: Record<string, number> = {
  F3: 53, G3: 55, A3: 57, Bb3: 58, C4: 60, D4: 62, Eb4: 63, E4: 64, F4: 65,
  G4: 67, A4: 69, Bb4: 70, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81,
};

interface Note { midi: number; beat: number; dur: number; gain?: number }

// Melody: bouncy F-major motif over 16 beats (8 bars × 2/4).
// Notation: each beat = 0.5 (so 16 beats = 16 × beatSec).
const MELODY: Note[] = [
  // Bar 1: F-A-C-A
  { midi: N.F4,  beat: 0,    dur: 0.5 },
  { midi: N.A4,  beat: 0.5,  dur: 0.5 },
  { midi: N.C5,  beat: 1,    dur: 0.5 },
  { midi: N.A4,  beat: 1.5,  dur: 0.5 },
  // Bar 2: F-A-C-F5
  { midi: N.F4,  beat: 2,    dur: 0.5 },
  { midi: N.A4,  beat: 2.5,  dur: 0.5 },
  { midi: N.C5,  beat: 3,    dur: 0.5 },
  { midi: N.F5,  beat: 3.5,  dur: 0.5 },
  // Bar 3: E-D-C-Bb (descending)
  { midi: N.E5,  beat: 4,    dur: 0.5 },
  { midi: N.D5,  beat: 4.5,  dur: 0.5 },
  { midi: N.C5,  beat: 5,    dur: 0.5 },
  { midi: N.Bb4, beat: 5.5,  dur: 0.5 },
  // Bar 4: A-G-A (resolve up)
  { midi: N.A4,  beat: 6,    dur: 1.0 },
  { midi: N.G4,  beat: 7,    dur: 0.5 },
  { midi: N.A4,  beat: 7.5,  dur: 0.5 },
  // Bar 5-6: turn (G-Bb-D-Bb / G-Bb-D-G5)
  { midi: N.G4,  beat: 8,    dur: 0.5 },
  { midi: N.Bb4, beat: 8.5,  dur: 0.5 },
  { midi: N.D5,  beat: 9,    dur: 0.5 },
  { midi: N.Bb4, beat: 9.5,  dur: 0.5 },
  { midi: N.G4,  beat: 10,   dur: 0.5 },
  { midi: N.Bb4, beat: 10.5, dur: 0.5 },
  { midi: N.D5,  beat: 11,   dur: 0.5 },
  { midi: N.G5,  beat: 11.5, dur: 0.5 },
  // Bar 7: D-C-Bb-A
  { midi: N.D5,  beat: 12,   dur: 0.5 },
  { midi: N.C5,  beat: 12.5, dur: 0.5 },
  { midi: N.Bb4, beat: 13,   dur: 0.5 },
  { midi: N.A4,  beat: 13.5, dur: 0.5 },
  // Bar 8: F-G-F (final cadence)
  { midi: N.F4,  beat: 14,   dur: 0.5 },
  { midi: N.G4,  beat: 14.5, dur: 0.5 },
  { midi: N.F4,  beat: 15,   dur: 1.0 },
];

// Bass: oompa (low root on beat, fifth on off-beat). Switches root each 2 bars.
const BASS: Note[] = (() => {
  const out: Note[] = [];
  // Bars 1-4: F (F2 low, C3 mid)
  // Bars 5-6: G (G2, D3)
  // Bars 7-8: F → C → F resolve
  const bars = [
    { root: N.F3 - 12, fifth: N.C4 - 12 }, // bar 1
    { root: N.F3 - 12, fifth: N.C4 - 12 }, // bar 2
    { root: N.F3 - 12, fifth: N.C4 - 12 }, // bar 3
    { root: N.F3 - 12, fifth: N.C4 - 12 }, // bar 4
    { root: N.G3 - 12, fifth: N.D4 - 12 }, // bar 5
    { root: N.G3 - 12, fifth: N.D4 - 12 }, // bar 6
    { root: N.C4 - 12, fifth: N.G4 - 12 }, // bar 7 (dominant)
    { root: N.F3 - 12, fifth: N.C4 - 12 }, // bar 8
  ];
  bars.forEach((b, i) => {
    out.push({ midi: b.root,  beat: i * 2,        dur: 0.45, gain: 0.10 });
    out.push({ midi: b.fifth, beat: i * 2 + 1,    dur: 0.45, gain: 0.07 });
  });
  return out;
})();

// Snare-like hi-hat clicks on off-beats for percussion feel.
const SNARE_OFFBEATS: number[] = (() => {
  const arr: number[] = [];
  for (let b = 0; b < 16; b += 0.5) arr.push(b + 0.5);
  return arr;
})();

function scheduleNote(c: AudioContext, freq: number, start: number, duration: number, peak: number, type: OscillatorType, filterHz?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.012);
  g.gain.setValueAtTime(peak, start + duration * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let last: AudioNode = o;
  if (filterHz) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filterHz;
    o.connect(lp);
    last = lp;
  }
  last.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + duration + 0.05);
}

function scheduleSnareTick(c: AudioContext, start: number, peak = 0.025) {
  const dur = 0.07;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2200;
  const g = c.createGain();
  g.gain.value = peak;
  src.connect(hp).connect(g).connect(c.destination);
  src.start(start);
}

let ambientStop: (() => void) | null = null;
export function startAmbient() {
  stopAmbient();
  let alive = true;
  const c = ac();
  let nextTimer: number | null = null;

  const playPhrase = () => {
    if (!alive) return;
    // 132 BPM → quarter beat = 0.4545s; one "beat" in our notation = 1 quarter.
    const beatSec = 0.4545;
    const phraseBeats = 16;
    const phraseSec = phraseBeats * beatSec;
    const t0 = c.currentTime + 0.05;

    // Melody — bright triangle wave through a gentle low-pass for a band-organ feel.
    MELODY.forEach(n => {
      scheduleNote(c, nHz(n.midi), t0 + n.beat * beatSec, n.dur * beatSec * 0.95,
        (n.gain ?? 0.060), 'triangle', 2200);
      // Subtle 5th overtone for richness
      scheduleNote(c, nHz(n.midi) * 1.5, t0 + n.beat * beatSec, n.dur * beatSec * 0.95,
        (n.gain ?? 0.060) * 0.30, 'sine');
    });
    // Bass tuba — sawtooth filtered low.
    BASS.forEach(n => {
      scheduleNote(c, nHz(n.midi), t0 + n.beat * beatSec, n.dur * beatSec,
        n.gain ?? 0.08, 'sawtooth', 400);
    });
    // Snare on off-beats
    SNARE_OFFBEATS.forEach(b => scheduleSnareTick(c, t0 + b * beatSec, 0.022));

    // Loop after phrase + 3.5s breath
    const cycleMs = (phraseSec + 3.5) * 1000;
    nextTimer = window.setTimeout(playPhrase, cycleMs);
  };
  playPhrase();
  ambientStop = () => { alive = false; if (nextTimer !== null) clearTimeout(nextTimer); };
}

export function stopAmbient() {
  if (ambientStop) ambientStop();
  ambientStop = null;
}
