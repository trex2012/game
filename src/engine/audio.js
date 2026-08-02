// All-code audio: synthesized SFX (Web Audio) + spoken move callouts
// (Web Speech API). No sound files needed.

const VOICE = {
  deku: { pitch: 1.4, rate: 1.15 },
  yuji: { pitch: 1.15, rate: 1.1 },
  maki: { pitch: 1.2, rate: 1.05 },
  megumi: { pitch: 0.95, rate: 1.0 },
  naoya: { pitch: 1.1, rate: 1.2 },
  choso: { pitch: 0.85, rate: 0.95 },
  mahito: { pitch: 1.25, rate: 1.1 },
  toji: { pitch: 0.75, rate: 1.0 },
  geto: { pitch: 0.85, rate: 0.95 },
  shigaraki: { pitch: 1.05, rate: 0.9 },
  allmight: { pitch: 0.6, rate: 1.0 },
  gojo: { pitch: 1.1, rate: 1.1 },
  sukuna: { pitch: 0.5, rate: 0.9 },
  allforone: { pitch: 0.4, rate: 0.85 },
  bakugo: { pitch: 1.0, rate: 1.25 },
  todoroki: { pitch: 0.9, rate: 0.9 },
  nobara: { pitch: 1.3, rate: 1.15 },
  nanami: { pitch: 0.7, rate: 0.95 },
  higuruma: { pitch: 0.65, rate: 0.9 },
  yuta: { pitch: 1.05, rate: 1.0 },
  hawks: { pitch: 1.0, rate: 1.15 },
};

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxOn = true;
    this.voiceOn = true;
  }

  ensure() {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  tone({ freq = 440, end = freq, dur = 0.15, type = 'square', vol = 0.3, delay = 0 }) {
    if (!this.sfxOn || !this.ensure()) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.15, vol = 0.25, freq = 1200, delay = 0 }) {
    if (!this.sfxOn || !this.ensure()) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  sfx(name) {
    switch (name) {
      case 'hit':
        this.noise({ dur: 0.08, vol: 0.3, freq: 2400 });
        this.tone({ freq: 220, end: 120, dur: 0.07, type: 'triangle', vol: 0.2 });
        break;
      case 'heavy':
        this.noise({ dur: 0.18, vol: 0.4, freq: 900 });
        this.tone({ freq: 130, end: 50, dur: 0.22, type: 'sawtooth', vol: 0.3 });
        break;
      case 'super':
        this.tone({ freq: 200, end: 900, dur: 0.25, type: 'sawtooth', vol: 0.25 });
        this.noise({ dur: 0.3, vol: 0.35, freq: 1600, delay: 0.08 });
        break;
      case 'domain':
        this.tone({ freq: 60, end: 30, dur: 1.1, type: 'sine', vol: 0.5 });
        this.tone({ freq: 300, end: 1400, dur: 0.8, type: 'sawtooth', vol: 0.15 });
        this.noise({ dur: 0.9, vol: 0.3, freq: 500, delay: 0.15 });
        break;
      case 'clash':
        this.tone({ freq: 500, end: 80, dur: 0.5, type: 'square', vol: 0.35 });
        this.noise({ dur: 0.5, vol: 0.45, freq: 2000 });
        break;
      case 'jump':
        this.tone({ freq: 260, end: 480, dur: 0.09, type: 'square', vol: 0.08 });
        break;
      case 'shoot':
        this.tone({ freq: 700, end: 250, dur: 0.09, type: 'square', vol: 0.1 });
        break;
      case 'absorb':
        this.tone({ freq: 800, end: 90, dur: 0.4, type: 'sine', vol: 0.25 });
        break;
      case 'ko':
        this.tone({ freq: 400, end: 40, dur: 0.6, type: 'sawtooth', vol: 0.35 });
        this.noise({ dur: 0.5, vol: 0.4, freq: 700 });
        break;
      case 'blip':
        this.tone({ freq: 600, end: 700, dur: 0.05, type: 'square', vol: 0.12 });
        break;
      case 'confirm':
        this.tone({ freq: 520, end: 780, dur: 0.1, type: 'square', vol: 0.15 });
        break;
      case 'deny':
        this.tone({ freq: 180, end: 120, dur: 0.15, type: 'square', vol: 0.18 });
        break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, end: f, dur: 0.18, type: 'square', vol: 0.18, delay: i * 0.12 }));
        break;
      case 'victory':
        [392, 523, 659, 784].forEach((f, i) => this.tone({ freq: f, end: f, dur: 0.22, type: 'triangle', vol: 0.2, delay: i * 0.14 }));
        break;
      case 'defeat':
        [330, 262, 196].forEach((f, i) => this.tone({ freq: f, end: f * 0.95, dur: 0.4, type: 'triangle', vol: 0.2, delay: i * 0.25 }));
        break;
    }
  }

  // Spoken move callouts — characters literally shout their techniques.
  say(text, charId = null, { interrupt = true } = {}) {
    if (!this.voiceOn) return;
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      if (interrupt) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = VOICE[charId] ?? { pitch: 1, rate: 1 };
      u.pitch = v.pitch;
      u.rate = v.rate;
      u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch { /* speech unavailable — stay silent */ }
  }
}

export const audio = new GameAudio();
