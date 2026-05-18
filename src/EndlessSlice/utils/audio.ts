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

// Breathing ambient — required by project rule (no continuous drone).
let ambientStop: (() => void) | null = null;
export function startAmbient() {
  stopAmbient();
  let alive = true;
  const c = ac();
  let nextTimer: number | null = null;

  const cycle = () => {
    if (!alive) return;
    const rise = 5 + Math.random() * 3;
    const hold = 8 + Math.random() * 8;
    const fall = 6 + Math.random() * 4;
    const silence = 7 + Math.random() * 9;
    const total = rise + hold + fall;
    const start = c.currentTime + 0.05;

    const osc1 = c.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 110 + Math.random() * 50;
    const osc2 = c.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = osc1.frequency.value * 1.5;
    osc2.detune.value = 8;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, start);
    const peak = 0.014 + Math.random() * 0.008;
    g.gain.exponentialRampToValueAtTime(peak, start + rise);
    g.gain.setValueAtTime(peak, start + rise + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, start + rise + hold + fall);
    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(g).connect(c.destination);
    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + total + 0.1);
    osc2.stop(start + total + 0.1);

    nextTimer = window.setTimeout(cycle, (total + silence) * 1000);
  };
  cycle();
  ambientStop = () => { alive = false; if (nextTimer !== null) clearTimeout(nextTimer); };
}
export function stopAmbient() {
  if (ambientStop) ambientStop();
  ambientStop = null;
}
