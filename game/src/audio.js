// All of Solmar Bay's sound is synthesized with WebAudio: no audio files
// are shipped, nothing is fetched, and every call is guarded so a browser
// with no audio device never throws a page error.
export function createAudio() {
  const api = {
    muted: false,
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenLfo: null,
    sirenOn: false,
  };

  function ensure() {
    if (api.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      api.ctx = new AC();
      api.master = api.ctx.createGain();
      api.master.gain.value = 0.4;
      api.master.connect(api.ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  function resume() {
    if (api.ctx && api.ctx.state === 'suspended') {
      api.ctx.resume().catch(() => {});
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    try {
      resume();
      const t = api.ctx.currentTime;
      const osc = api.ctx.createOscillator();
      const gain = api.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(vol || 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(api.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (e) {
      /* sound is decoration; never break the game for it */
    }
  }

  function noise(dur, vol, lowpass) {
    if (!ensure()) return;
    try {
      resume();
      const t = api.ctx.currentTime;
      const len = Math.floor(api.ctx.sampleRate * dur);
      const buffer = api.ctx.createBuffer(1, len, api.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = api.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = api.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const gain = api.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(api.master);
      src.start(t);
    } catch (e) {
      /* sound is decoration; never break the game for it */
    }
  }

  api.unlock = function unlock() {
    ensure();
    resume();
  };

  api.click = function click() {
    blip(660, 0.07, 'triangle', 0.15);
  };

  api.shot = function shot() {
    noise(0.16, 0.5, 900);
    blip(180, 0.1, 'square', 0.12, 60);
  };

  api.punch = function punch() {
    noise(0.09, 0.35, 500);
  };

  api.chime = function chime() {
    blip(523, 0.16, 'sine', 0.22);
    setTimeout(() => blip(784, 0.24, 'sine', 0.22), 120);
  };

  api.deny = function deny() {
    blip(160, 0.18, 'square', 0.15, 110);
  };

  api.radioBlip = function radioBlip() {
    blip(880, 0.08, 'triangle', 0.1);
    setTimeout(() => blip(1174, 0.1, 'triangle', 0.1), 90);
  };

  api.setEngine = function setEngine(speed01, on) {
    if (!ensure()) return;
    try {
      resume();
      if (!api.engineOsc) {
        api.engineOsc = api.ctx.createOscillator();
        api.engineOsc.type = 'sawtooth';
        api.engineGain = api.ctx.createGain();
        api.engineGain.gain.value = 0;
        const filter = api.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        api.engineOsc.connect(filter);
        filter.connect(api.engineGain);
        api.engineGain.connect(api.master);
        api.engineOsc.start();
      }
      const target = on ? 0.05 + speed01 * 0.06 : 0;
      api.engineGain.gain.setTargetAtTime(target, api.ctx.currentTime, 0.1);
      api.engineOsc.frequency.setTargetAtTime(55 + speed01 * 90, api.ctx.currentTime, 0.1);
    } catch (e) {
      /* sound is decoration; never break the game for it */
    }
  };

  api.setSiren = function setSiren(on) {
    if (on === api.sirenOn) return;
    api.sirenOn = on;
    if (!on) {
      try {
        if (api.sirenOsc) api.sirenOsc.stop();
        if (api.sirenLfo) api.sirenLfo.stop();
      } catch (e) {}
      api.sirenOsc = null;
      api.sirenLfo = null;
      return;
    }
    if (!ensure()) return;
    try {
      resume();
      api.sirenOsc = api.ctx.createOscillator();
      api.sirenOsc.type = 'sine';
      api.sirenOsc.frequency.value = 720;
      api.sirenGain = api.ctx.createGain();
      api.sirenGain.gain.value = 0.035;
      const lfo = api.ctx.createOscillator();
      lfo.frequency.value = 0.7;
      const lfoGain = api.ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(api.sirenOsc.frequency);
      api.sirenOsc.connect(api.sirenGain);
      api.sirenGain.connect(api.master);
      api.sirenOsc.start();
      lfo.start();
      api.sirenLfo = lfo;
    } catch (e) {
      /* sound is decoration; never break the game for it */
    }
  };

  api.toggleMute = function toggleMute() {
    api.muted = !api.muted;
    if (api.master) api.master.gain.value = api.muted ? 0 : 0.4;
    return api.muted;
  };

  return api;
}
