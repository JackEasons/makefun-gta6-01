// Solmar Bay — every sound is synthesized with WebAudio, so the game ships
// no audio files: an engine hum that follows speed, a two-tone police siren,
// pickup chimes, a mission jingle and impact thuds, all from oscillators and
// filtered noise. The context starts on the first user gesture.

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.sirenHigh = false;
    this.muted = false;
    this.footstepTimer = 0;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);

    // Engine: a low sawtooth through a low-pass, pitch follows speed.
    this.engineOsc = this.context.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.context.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();

    // Siren: a square wave that alternates between two notes.
    this.sirenOsc = this.context.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.context.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // Called every frame: speed in m/s (0 when on foot), wanted 0-5.
  update(dt, speed, wanted, walking) {
    if (!this.context) return;
    const target = speed > 0.5 ? 0.05 + Math.min(0.12, speed * 0.003) : 0;
    this.engineGain.gain.setTargetAtTime(target, this.context.currentTime, 0.08);
    this.engineOsc.frequency.setTargetAtTime(50 + speed * 4.5, this.context.currentTime, 0.08);
    this.engineFilter.frequency.setTargetAtTime(350 + speed * 22, this.context.currentTime, 0.1);

    if (wanted > 0) {
      this.sirenTimer += dt;
      if (this.sirenTimer > 0.42) {
        this.sirenTimer = 0;
        this.sirenHigh = !this.sirenHigh;
        this.sirenOsc.frequency.value = this.sirenHigh ? 880 : 660;
      }
      this.sirenGain.gain.setTargetAtTime(0.035, this.context.currentTime, 0.1);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, this.context.currentTime, 0.2);
    }

    if (walking) {
      this.footstepTimer += dt;
      if (this.footstepTimer > 0.34) {
        this.footstepTimer = 0;
        this.tap(300, 0.03, 0.05);
      }
    }
  }

  tap(freq, gain, dur) {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const g = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, this.context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(this.context.currentTime + dur + 0.02);
  }

  chime() {
    this.tap(880, 0.12, 0.12);
    setTimeout(() => this.tap(1318, 0.12, 0.18), 90);
  }

  jingle() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, i) => {
      setTimeout(() => this.tap(freq, 0.14, 0.22), i * 110);
    });
  }

  thud() {
    if (!this.context) return;
    const len = this.context.sampleRate * 0.12;
    const buffer = this.context.createBuffer(1, len, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.context.createBufferSource();
    src.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const g = this.context.createGain();
    g.gain.value = 0.35;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
  }

  honk() {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const g = this.context.createGain();
    osc.type = 'square';
    osc.frequency.value = 370;
    g.gain.setValueAtTime(0.08, this.context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.25);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(this.context.currentTime + 0.3);
  }
}
