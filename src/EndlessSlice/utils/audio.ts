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

/** Missed food (fell off bottom). Sad trombone + soft thud — classic
 *  circus failure cue ("wah-wah-waaaah"). */
export function sfxMiss() {
  try {
    const c = ac();
    const now = c.currentTime;
    // Thud (impact on the floor)
    tone(80, 0.10, 0.14, 'sawtooth');
    tone(58, 0.12, 0.08, 'sine');

    // Sad trombone slide: G4 → C4 → A3, exponential glide.
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(392, now + 0.06);
    o.frequency.exponentialRampToValueAtTime(262, now + 0.28);
    o.frequency.exponentialRampToValueAtTime(220, now + 0.46);
    // Subtle vibrato via LFO
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain).connect(o.frequency);
    // Tone shaper
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now + 0.06);
    g.gain.linearRampToValueAtTime(0.15, now + 0.10);
    g.gain.setValueAtTime(0.13, now + 0.38);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    o.connect(lp).connect(g).connect(c.destination);
    o.start(now + 0.06);
    o.stop(now + 0.62);
    lfo.start(now + 0.06);
    lfo.stop(now + 0.62);
  } catch { /* ignore */ }
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
interface Phrase { melody: Note[]; bass: Note[]; beats: number; tempoBpm: number }

function makeBass(bars: Array<{ root: number; fifth: number }>): Note[] {
  const out: Note[] = [];
  bars.forEach((b, i) => {
    out.push({ midi: b.root,  beat: i * 2,     dur: 0.45, gain: 0.10 });
    out.push({ midi: b.fifth, beat: i * 2 + 1, dur: 0.45, gain: 0.07 });
  });
  return out;
}

// ── Phrase A: bouncy F-major march (the original) ──
const PHRASE_A: Phrase = {
  beats: 16,
  tempoBpm: 132,
  melody: [
    { midi: N.F4,  beat: 0,    dur: 0.5 },
    { midi: N.A4,  beat: 0.5,  dur: 0.5 },
    { midi: N.C5,  beat: 1,    dur: 0.5 },
    { midi: N.A4,  beat: 1.5,  dur: 0.5 },
    { midi: N.F4,  beat: 2,    dur: 0.5 },
    { midi: N.A4,  beat: 2.5,  dur: 0.5 },
    { midi: N.C5,  beat: 3,    dur: 0.5 },
    { midi: N.F5,  beat: 3.5,  dur: 0.5 },
    { midi: N.E5,  beat: 4,    dur: 0.5 },
    { midi: N.D5,  beat: 4.5,  dur: 0.5 },
    { midi: N.C5,  beat: 5,    dur: 0.5 },
    { midi: N.Bb4, beat: 5.5,  dur: 0.5 },
    { midi: N.A4,  beat: 6,    dur: 1.0 },
    { midi: N.G4,  beat: 7,    dur: 0.5 },
    { midi: N.A4,  beat: 7.5,  dur: 0.5 },
    { midi: N.G4,  beat: 8,    dur: 0.5 },
    { midi: N.Bb4, beat: 8.5,  dur: 0.5 },
    { midi: N.D5,  beat: 9,    dur: 0.5 },
    { midi: N.Bb4, beat: 9.5,  dur: 0.5 },
    { midi: N.G4,  beat: 10,   dur: 0.5 },
    { midi: N.Bb4, beat: 10.5, dur: 0.5 },
    { midi: N.D5,  beat: 11,   dur: 0.5 },
    { midi: N.G5,  beat: 11.5, dur: 0.5 },
    { midi: N.D5,  beat: 12,   dur: 0.5 },
    { midi: N.C5,  beat: 12.5, dur: 0.5 },
    { midi: N.Bb4, beat: 13,   dur: 0.5 },
    { midi: N.A4,  beat: 13.5, dur: 0.5 },
    { midi: N.F4,  beat: 14,   dur: 0.5 },
    { midi: N.G4,  beat: 14.5, dur: 0.5 },
    { midi: N.F4,  beat: 15,   dur: 1.0 },
  ],
  bass: makeBass([
    { root: N.F3 - 12, fifth: N.C4 - 12 }, { root: N.F3 - 12, fifth: N.C4 - 12 },
    { root: N.F3 - 12, fifth: N.C4 - 12 }, { root: N.F3 - 12, fifth: N.C4 - 12 },
    { root: N.G3 - 12, fifth: N.D4 - 12 }, { root: N.G3 - 12, fifth: N.D4 - 12 },
    { root: N.C4 - 12, fifth: N.G4 - 12 }, { root: N.F3 - 12, fifth: N.C4 - 12 },
  ]),
};

// ── Phrase B: more syncopated F-major variation ──
const PHRASE_B: Phrase = {
  beats: 16,
  tempoBpm: 132,
  melody: [
    // Bar 1-2: skip up the chord then back down
    { midi: N.F4,  beat: 0,    dur: 1.0 },
    { midi: N.C5,  beat: 1,    dur: 0.5 },
    { midi: N.A4,  beat: 1.5,  dur: 0.5 },
    { midi: N.F5,  beat: 2,    dur: 0.5 },
    { midi: N.E5,  beat: 2.5,  dur: 0.5 },
    { midi: N.C5,  beat: 3,    dur: 0.5 },
    { midi: N.A4,  beat: 3.5,  dur: 0.5 },
    // Bar 3-4: galloping descent
    { midi: N.Bb4, beat: 4,    dur: 0.5 },
    { midi: N.A4,  beat: 4.5,  dur: 0.5 },
    { midi: N.G4,  beat: 5,    dur: 0.5 },
    { midi: N.A4,  beat: 5.5,  dur: 0.5 },
    { midi: N.F4,  beat: 6,    dur: 0.5 },
    { midi: N.G4,  beat: 6.5,  dur: 0.5 },
    { midi: N.A4,  beat: 7,    dur: 1.0 },
    // Bar 5-6: turn up to high F
    { midi: N.C5,  beat: 8,    dur: 0.5 },
    { midi: N.E5,  beat: 8.5,  dur: 0.5 },
    { midi: N.D5,  beat: 9,    dur: 0.5 },
    { midi: N.C5,  beat: 9.5,  dur: 0.5 },
    { midi: N.Bb4, beat: 10,   dur: 0.5 },
    { midi: N.D5,  beat: 10.5, dur: 0.5 },
    { midi: N.C5,  beat: 11,   dur: 0.5 },
    { midi: N.A4,  beat: 11.5, dur: 0.5 },
    // Bar 7-8: cadence with a held resolution
    { midi: N.G4,  beat: 12,   dur: 0.5 },
    { midi: N.Bb4, beat: 12.5, dur: 0.5 },
    { midi: N.A4,  beat: 13,   dur: 0.5 },
    { midi: N.G4,  beat: 13.5, dur: 0.5 },
    { midi: N.F4,  beat: 14,   dur: 0.5 },
    { midi: N.A4,  beat: 14.5, dur: 0.5 },
    { midi: N.F4,  beat: 15,   dur: 1.0 },
  ],
  bass: makeBass([
    { root: N.F3 - 12, fifth: N.C4 - 12 }, { root: N.F3 - 12, fifth: N.C4 - 12 },
    { root: N.D4 - 12, fifth: N.A4 - 12 }, { root: N.D4 - 12, fifth: N.A4 - 12 }, // Dm
    { root: N.Bb3 - 12, fifth: N.F4 - 12 }, { root: N.Bb3 - 12, fifth: N.F4 - 12 }, // Bb
    { root: N.C4 - 12, fifth: N.G4 - 12 }, { root: N.F3 - 12, fifth: N.C4 - 12 }, // C → F
  ]),
};

// ── Phrase C: minor-key sinister circus (D minor) ──
const PHRASE_C: Phrase = {
  beats: 16,
  tempoBpm: 124, // slightly slower for ominous weight
  melody: [
    // Bar 1-2: D minor arpeggios
    { midi: N.D4,  beat: 0,    dur: 0.5 },
    { midi: N.F4,  beat: 0.5,  dur: 0.5 },
    { midi: N.A4,  beat: 1,    dur: 0.5 },
    { midi: N.D5,  beat: 1.5,  dur: 0.5 },
    { midi: N.D4,  beat: 2,    dur: 0.5 },
    { midi: N.F4,  beat: 2.5,  dur: 0.5 },
    { midi: N.A4,  beat: 3,    dur: 0.5 },
    { midi: N.D5,  beat: 3.5,  dur: 0.5 },
    // Bar 3-4: descending sinister line
    { midi: N.C5,  beat: 4,    dur: 0.5 },
    { midi: N.Bb4, beat: 4.5,  dur: 0.5 },
    { midi: N.A4,  beat: 5,    dur: 0.5 },
    { midi: N.G4,  beat: 5.5,  dur: 0.5 },
    { midi: N.F4,  beat: 6,    dur: 0.5 },
    { midi: N.E4,  beat: 6.5,  dur: 0.5 },
    { midi: N.D4,  beat: 7,    dur: 1.0 },
    // Bar 5-6: rise toward dominant (A7)
    { midi: N.E4,  beat: 8,    dur: 0.5 },
    { midi: N.G4,  beat: 8.5,  dur: 0.5 },
    { midi: N.Bb4, beat: 9,    dur: 0.5 },
    { midi: N.E5,  beat: 9.5,  dur: 0.5 },
    { midi: N.D5,  beat: 10,   dur: 0.5 },
    { midi: N.Bb4, beat: 10.5, dur: 0.5 },
    { midi: N.A4,  beat: 11,   dur: 1.0 },
    // Bar 7-8: cadence on D minor
    { midi: N.A4,  beat: 12,   dur: 0.5 },
    { midi: N.D5,  beat: 12.5, dur: 0.5 },
    { midi: N.C5,  beat: 13,   dur: 0.5 },
    { midi: N.Bb4, beat: 13.5, dur: 0.5 },
    { midi: N.A4,  beat: 14,   dur: 0.5 },
    { midi: N.F4,  beat: 14.5, dur: 0.5 },
    { midi: N.D4,  beat: 15,   dur: 1.0 },
  ],
  bass: makeBass([
    { root: N.D4 - 12, fifth: N.A4 - 12 }, { root: N.D4 - 12, fifth: N.A4 - 12 }, // Dm
    { root: N.G3 - 12, fifth: N.D4 - 12 }, { root: N.G3 - 12, fifth: N.D4 - 12 }, // Gm
    { root: N.A3 - 12, fifth: N.E4 - 12 }, { root: N.A3 - 12, fifth: N.E4 - 12 }, // A7
    { root: N.A3 - 12, fifth: N.E4 - 12 }, { root: N.D4 - 12, fifth: N.A4 - 12 }, // A7 → Dm
  ]),
};

const PHRASES: Phrase[] = [PHRASE_A, PHRASE_B, PHRASE_C];

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
  // Rotate through phrases so the same melody never plays two cycles in a row.
  // Start from a random index so different sessions don't always open with A.
  let phraseIdx = Math.floor(Math.random() * PHRASES.length);

  const playPhrase = () => {
    if (!alive) return;
    const phrase = PHRASES[phraseIdx];
    phraseIdx = (phraseIdx + 1) % PHRASES.length;
    const beatSec = 60 / phrase.tempoBpm;
    const phraseSec = phrase.beats * beatSec;
    const t0 = c.currentTime + 0.05;

    // Melody — bright triangle wave through a gentle low-pass for band-organ feel.
    phrase.melody.forEach(n => {
      scheduleNote(c, nHz(n.midi), t0 + n.beat * beatSec, n.dur * beatSec * 0.95,
        (n.gain ?? 0.060), 'triangle', 2200);
      // Subtle 5th overtone for richness
      scheduleNote(c, nHz(n.midi) * 1.5, t0 + n.beat * beatSec, n.dur * beatSec * 0.95,
        (n.gain ?? 0.060) * 0.30, 'sine');
    });
    // Bass tuba — sawtooth filtered low.
    phrase.bass.forEach(n => {
      scheduleNote(c, nHz(n.midi), t0 + n.beat * beatSec, n.dur * beatSec,
        n.gain ?? 0.08, 'sawtooth', 400);
    });
    // Snare on off-beats
    SNARE_OFFBEATS.forEach(b => scheduleSnareTick(c, t0 + b * beatSec, 0.022));

    // Loop after phrase + variable 3-5s breath so the cadence isn't mechanical
    const breathSec = 3 + Math.random() * 2;
    const cycleMs = (phraseSec + breathSec) * 1000;
    nextTimer = window.setTimeout(playPhrase, cycleMs);
  };
  playPhrase();
  ambientStop = () => { alive = false; if (nextTimer !== null) clearTimeout(nextTimer); };
}

export function stopAmbient() {
  if (ambientStop) ambientStop();
  ambientStop = null;
}
