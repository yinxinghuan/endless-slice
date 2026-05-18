// Tiny synth helpers — perfect / good / ok cut tones + breathing ambient.

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
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gainPeak, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(c.destination);
    o.start(now);
    o.stop(now + dur + 0.05);
  } catch { /* ignore */ }
}

// Knife-swoosh: a quick noise burst with a high-pass feel.
function swoosh(gainPeak = 0.06) {
  try {
    const c = ac();
    const now = c.currentTime;
    const dur = 0.12;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // exponentially decaying noise
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const g = c.createGain();
    g.gain.value = gainPeak;
    src.connect(hp).connect(g).connect(c.destination);
    src.start(now);
  } catch { /* ignore */ }
}

export function sfxPerfect() {
  swoosh(0.05);
  tone(880, 0.16, 0.10, 'triangle');
  tone(1320, 0.18, 0.06, 'sine', 4);
}
export function sfxGood() {
  swoosh(0.04);
  tone(660, 0.14, 0.09, 'triangle');
}
export function sfxOk() {
  swoosh(0.03);
  tone(440, 0.14, 0.08, 'sine');
}
export function sfxMiss() {
  tone(140, 0.22, 0.10, 'sawtooth');
  tone(110, 0.30, 0.06, 'sawtooth', -10);
}
export function sfxFoodCleared() {
  tone(523, 0.10, 0.05, 'triangle');
  setTimeout(() => tone(784, 0.16, 0.06, 'triangle'), 80);
}
export function sfxGameOver() {
  tone(330, 0.30, 0.10, 'sawtooth');
  setTimeout(() => tone(220, 0.45, 0.08, 'sawtooth'), 180);
  setTimeout(() => tone(165, 0.60, 0.06, 'sawtooth'), 380);
}

// Breathing ambient: gentle low-pad that swells, holds, fades, then full silence.
// Per memory rule: real silent gaps required.
let ambientStop: (() => void) | null = null;
export function startAmbient() {
  stopAmbient();
  let alive = true;
  const c = ac();
  let nextTimer: number | null = null;

  const cycle = () => {
    if (!alive) return;
    const rise = 5 + Math.random() * 3;       // 5–8s
    const hold = 8 + Math.random() * 8;       // 8–16s
    const fall = 6 + Math.random() * 4;       // 6–10s
    const silence = 7 + Math.random() * 9;    // 7–16s
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
    const peak = 0.018 + Math.random() * 0.01;
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

  ambientStop = () => {
    alive = false;
    if (nextTimer !== null) clearTimeout(nextTimer);
  };
}
export function stopAmbient() {
  if (ambientStop) ambientStop();
  ambientStop = null;
}
