/**
 * Original 1980s-flavoured audio, synthesised at runtime.
 *
 * Everything here is generated from oscillators and noise buffers - there are no
 * sample files, so nothing is copied from anywhere and the whole soundtrack
 * costs zero download. That also matches how a 1987 machine actually made
 * sound: a handful of oscillators and a filter.
 */

type Wave = OscillatorType;

/** One melodic voice in a tune. `notes` is one entry per 16th-note step. */
interface Track {
  wave: Wave;
  gain: number;
  /** Note names ('C4', 'F#3') or '-' to rest, '.' to hold the previous note. */
  notes: string[];
  /** Low-pass cutoff in Hz. The single most 'analogue synth' parameter there is. */
  cutoff?: number;
  /** Sweep the cutoff down over the note, for plucks and basses. */
  sweep?: number;
  attack?: number;
  release?: number;
  detune?: number;
  /**
   * How many oscillators to stack, spread either side of the note in cents.
   *
   * One oscillator playing one frequency is the sound of a beeper. Two or
   * three of the same wave a few cents apart beat against each other, and that
   * slow drift is most of what makes a synthesiser sound like an instrument
   * rather than a test tone.
   */
  unison?: number;
  spread?: number;
  /** Filter resonance. The peak at the cutoff is the 'analogue' in analogue. */
  resonance?: number;
  /** Stereo position, -1 to 1. Anything mono sounds like it is behind glass. */
  pan?: number;
  /** How much of this voice is sent to the reverb, 0 to 1. */
  space?: number;
  /** Held fraction of the step, so a pad can sustain instead of stabbing. */
  sustain?: number;
}

interface Tune {
  bpm: number;
  /** Drum pattern: k=kick, s=snare, h=closed hat, o=open hat, '-'=rest. */
  drums?: string;
  tracks: Track[];
  /** Gated reverb tail on the snare - the definitive 1980s production trick. */
  gatedSnare?: boolean;
  swing?: number;
}

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

function noteToFreq(note: string): number | null {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!m) return null;
  const semis = NOTE_INDEX[m[1]];
  if (semis === undefined) return null;
  const octave = parseInt(m[2], 10);
  // A4 = 440Hz, MIDI 69.
  const midi = (octave + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * A reverb impulse: noise decaying exponentially, slightly different per ear.
 *
 * A recorded impulse would be better and would also be a file to ship. This is
 * a few lines and, at this length, indistinguishable from a cheap plate - which
 * is exactly the reference anyway.
 */
function buildImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const fade = Math.pow(1 - i / len, decay);
      // A short silent head stops it sounding like the note itself is smeared.
      const head = i < rate * 0.012 ? i / (rate * 0.012) : 1;
      data[i] = (Math.random() * 2 - 1) * fade * head;
    }
  }
  return buf;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private reverbSend: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private delayNode: DelayNode | null = null;

  private currentTune: Tune | null = null;
  private currentId = '';
  private nextStepTime = 0;
  private step = 0;
  private schedulerHandle: number | null = null;
  private activeNodes: AudioNode[] = [];

  musicVolume = 0.5;
  sfxVolume = 0.7;
  private muted = false;

  /** Browsers refuse to start audio before a user gesture; call this from the
   *  first click or keypress. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private init(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    /*
     * Music runs through a proper output chain rather than straight out.
     *
     * Dry oscillators panned dead centre are what make synth music sound like
     * a PC speaker, however good the notes are. A room to play in - a short
     * plate reverb and a tempo-ish delay - plus a compressor to glue it
     * together, is the difference between a beeper and a record.
     */
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;

    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18;
    glue.knee.value = 12;
    glue.ratio.value = 3;
    glue.attack.value = 0.006;
    glue.release.value = 0.18;
    glue.connect(this.master);
    this.musicBus.connect(glue);

    // Reverb send: an impulse built from decaying noise, which is cheap and
    // sounds far more like a room than any amount of extra oscillators.
    const verb = ctx.createConvolver();
    verb.buffer = buildImpulse(ctx, 1.7, 2.6);
    const verbSend = ctx.createGain();
    verbSend.gain.value = 1;
    verbSend.connect(verb);
    const verbLevel = ctx.createGain();
    verbLevel.gain.value = 0.5;
    verb.connect(verbLevel);
    verbLevel.connect(glue);
    this.reverbSend = verbSend;

    // Delay send: one eighth-ish repeat, fed back gently and rolled off, which
    // is the other half of the era's production.
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.33;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    const delaySend = ctx.createGain();
    delaySend.gain.value = 1;
    delaySend.connect(delay);
    const delayLevel = ctx.createGain();
    delayLevel.gain.value = 0.28;
    damp.connect(delayLevel);
    delayLevel.connect(glue);
    this.delaySend = delaySend;
    this.delayNode = delay;

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.sfxBus.connect(this.master);

    // Two seconds of white noise, reused for every percussive and static sound.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicBus) this.musicBus.gain.value = this.musicVolume;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVolume;
  }

  // ---------------------------------------------------------------- music

  playMusic(id: string): void {
    if (this.currentId === id) return;
    this.stopMusic();
    const tune = TUNES[id];
    if (!tune) return;
    this.unlock();
    if (!this.ctx) return;

    this.currentId = id;
    this.currentTune = tune;
    // A delay at an arbitrary time smears the beat; one locked to a dotted
    // eighth lands its repeats between the notes, which is what makes the
    // echo sound deliberate rather than like a fault.
    if (this.delayNode) {
      this.delayNode.delayTime.value = (60 / tune.bpm) * 0.75;
    }
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.06;
    this.schedulerHandle = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    if (this.schedulerHandle !== null) {
      clearInterval(this.schedulerHandle);
      this.schedulerHandle = null;
    }
    this.currentTune = null;
    this.currentId = '';
    for (const n of this.activeNodes) {
      try {
        (n as OscillatorNode).stop?.();
      } catch {
        /* already stopped */
      }
    }
    this.activeNodes = [];
  }

  get nowPlaying(): string {
    return this.currentId;
  }

  /**
   * Lookahead scheduler. Queues any step falling inside the next 100ms of audio
   * time. Driving note timing off setInterval alone would jitter audibly;
   * scheduling ahead against ctx.currentTime keeps it sample-accurate.
   */
  private schedule(): void {
    const ctx = this.ctx;
    const tune = this.currentTune;
    if (!ctx || !tune) return;

    const stepDur = 60 / tune.bpm / 4; // one 16th note
    while (this.nextStepTime < ctx.currentTime + 0.1) {
      const s = this.step;
      const swing = tune.swing && s % 2 === 1 ? stepDur * tune.swing : 0;
      const t = this.nextStepTime + swing;

      tune.tracks.forEach((track, i) => {
        const raw = track.notes[s % track.notes.length];
        if (!raw || raw === '-' || raw === '.') return;
        const freq = noteToFreq(raw);
        if (freq === null) return;
        // Hold across following '.' steps so notes can be longer than a 16th.
        let len = 1;
        while (track.notes[(s + len) % track.notes.length] === '.') len++;
        this.voice(track, freq, t, stepDur * len, i, tune.tracks.length);
      });

      if (tune.drums) {
        const hit = tune.drums[s % tune.drums.length];
        if (hit === 'k') this.kick(t);
        else if (hit === 's') this.snare(t, tune.gatedSnare ?? false);
        else if (hit === 'h') this.hat(t, 0.03);
        else if (hit === 'o') this.hat(t, 0.13);
      }

      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  /**
   * One note.
   *
   * A stack of slightly detuned oscillators through a resonant filter into a
   * shaped envelope, placed in the stereo field and sent to the reverb and
   * delay. Every one of those is what a single bare oscillator was missing.
   */
  /**
   * Where a part sits in the stereo field when it has not asked for a place.
   *
   * The first track is the bass and stays in the middle, because low frequencies
   * panned to one side just sound broken. Everything after it fans out to
   * alternating sides, which stops three parts stacking up in the centre - the
   * other half of why this sounded like one small speaker.
   */
  private static defaultPan(index: number, total: number): number {
    if (index === 0 || total < 2) return 0;
    const side = index % 2 === 1 ? -1 : 1;
    const depth = 0.22 + 0.18 * Math.floor((index - 1) / 2);
    return side * Math.min(0.6, depth);
  }

  private voice(
    track: Track, freq: number, t: number, dur: number,
    index = 0, total = 1,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;

    const held = dur * (track.sustain ?? 1);
    const attack = track.attack ?? 0.008;
    const release = track.release ?? 0.09;
    const voices = Math.max(1, track.unison ?? 2);
    const spread = track.spread ?? 9;

    const amp = ctx.createGain();
    const peak = track.gain / Math.sqrt(voices);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(peak, t + attack);
    amp.gain.setValueAtTime(peak, t + Math.max(attack, held - release));
    amp.gain.exponentialRampToValueAtTime(0.0001, t + held + release);

    // Filter first, so every oscillator in the stack shares one sweep.
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = track.resonance ?? 7;
    const cutoff = track.cutoff ?? 12000;
    filt.frequency.setValueAtTime(cutoff, t);
    if (track.sweep) {
      filt.frequency.exponentialRampToValueAtTime(
        Math.max(80, cutoff * track.sweep), t + held,
      );
    }
    filt.connect(amp);

    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < voices; i++) {
      const osc = ctx.createOscillator();
      osc.type = track.wave;
      osc.frequency.value = freq;
      // Centred spread: one voice sits on the note, the rest either side.
      const offset = voices === 1 ? 0 : (i / (voices - 1) - 0.5) * 2 * spread;
      osc.detune.value = (track.detune ?? 0) + offset;
      osc.connect(filt);
      osc.start(t);
      osc.stop(t + held + release + 0.02);
      this.track(osc);
      oscs.push(osc);
    }

    const pan = ctx.createStereoPanner();
    pan.pan.value = track.pan ?? AudioEngine.defaultPan(index, total);
    amp.connect(pan);
    pan.connect(this.musicBus);

    // Sends are post-pan taps, so a voice keeps its position in its own tail.
    const space = track.space ?? 0.25;
    if (space > 0 && this.reverbSend && this.delaySend) {
      const send = ctx.createGain();
      send.gain.value = space;
      pan.connect(send);
      send.connect(this.reverbSend);
      send.connect(this.delaySend);
    }
  }

  private kick(t: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    // Fast pitch drop is what makes a sine into a kick drum. Starting higher
    // and dropping further gives it a beater click as well as a body.
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    // A touch of saturation, so it is felt on small speakers rather than just
    // occupying the bottom of the mix where a laptop cannot reproduce it.
    const drive = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    drive.curve = curve;
    osc.connect(g);
    g.connect(drive);
    drive.connect(this.musicBus);
    osc.start(t);
    osc.stop(t + 0.32);
    this.track(osc);
  }

  private snare(t: number, gated: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1750;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    // A gated reverb is a long tail cut off abruptly - the sound of every drum
    // machine record between 1983 and 1989.
    const tail = gated ? 0.22 : 0.12;
    g.gain.setValueAtTime(0.55, t);
    g.gain.linearRampToValueAtTime(gated ? 0.34 : 0.0001, t + tail * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + tail);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.musicBus);

    // Noise alone is a hiss. Real snares have a drum under the wires, so a
    // short tuned thump underneath gives it a pitch and stops it sounding
    // like a burst of static on the backbeat.
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(240, t);
    body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.34, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    body.connect(bg);
    bg.connect(this.musicBus);
    body.start(t);
    body.stop(t + 0.12);
    this.track(body);

    // The gate is the point, so it goes to the reverb generously.
    if (this.reverbSend) {
      const send = ctx.createGain();
      send.gain.value = gated ? 0.5 : 0.2;
      g.connect(send);
      send.connect(this.reverbSend);
    }

    src.start(t);
    src.stop(t + tail + 0.02);
    this.track(src);
  }

  private hat(t: number, dur: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    src.start(t);
    src.stop(t + dur + 0.02);
    this.track(src);
  }

  private track(node: AudioNode): void {
    this.activeNodes.push(node);
    if (this.activeNodes.length > 96) this.activeNodes.splice(0, 48);
  }

  // ------------------------------------------------------------------ sfx

  /** Fire a named one-shot. Unknown names are silently ignored so content data
   *  can reference a sound before it is designed. */
  sfx(name: string): void {
    if (!this.ctx) this.init();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;

    switch (name) {
      case 'coin':
        // Two quick rising square blips - the universal arcade coin.
        this.blip(t, 988, 0.06, 'square', 0.3);
        this.blip(t + 0.06, 1319, 0.11, 'square', 0.3);
        break;
      case 'credit':
        this.blip(t, 523, 0.05, 'square', 0.25);
        this.blip(t + 0.05, 659, 0.05, 'square', 0.25);
        this.blip(t + 0.1, 784, 0.05, 'square', 0.25);
        this.blip(t + 0.15, 1047, 0.16, 'square', 0.3);
        break;
      case 'button':
        this.blip(t, 660, 0.04, 'square', 0.18);
        break;
      case 'select':
        this.blip(t, 880, 0.03, 'square', 0.14);
        break;
      case 'deny':
        this.blip(t, 180, 0.16, 'sawtooth', 0.22);
        break;
      case 'pickup':
        this.blip(t, 700, 0.05, 'triangle', 0.25);
        this.blip(t + 0.05, 1050, 0.09, 'triangle', 0.25);
        break;
      case 'score':
        this.blip(t, 1319, 0.05, 'square', 0.2);
        this.blip(t + 0.06, 1760, 0.12, 'square', 0.2);
        break;
      case 'door':
        this.noise(t, 0.18, 380, 'lowpass', 0.35);
        break;
      case 'switch':
      case 'relay':
        this.noise(t, 0.035, 2400, 'bandpass', 0.4);
        this.blip(t + 0.02, 120, 0.04, 'square', 0.15);
        break;
      case 'cassette':
        this.noise(t, 0.05, 1500, 'bandpass', 0.35);
        this.blip(t + 0.04, 220, 0.06, 'square', 0.12);
        break;
      case 'rewind':
        this.sweepNoise(t, 0.9, 900, 5200, 0.22);
        break;
      case 'static':
        this.noise(t, 0.55, 3200, 'highpass', 0.3);
        break;
      case 'crt-on':
        // A snap of static plus the 15.6kHz line-whistle dropping in.
        this.noise(t, 0.12, 4000, 'highpass', 0.4);
        this.blip(t, 60, 0.3, 'sine', 0.25);
        break;
      case 'buzz':
        this.blip(t, 50, 0.5, 'sawtooth', 0.14);
        this.blip(t, 100, 0.5, 'square', 0.07);
        break;
      case 'hum':
        this.blip(t, 100, 1.6, 'sine', 0.1);
        this.blip(t, 150, 1.6, 'sine', 0.04);
        break;
      case 'phone':
        // UK double-ring: two bursts, pause, repeat.
        for (const off of [0, 0.4]) {
          for (let i = 0; i < 12; i++) {
            this.blip(t + off + i * 0.025, i % 2 ? 400 : 450, 0.022, 'sine', 0.22);
          }
        }
        break;
      case 'projector':
        for (let i = 0; i < 14; i++) this.noise(t + i * 0.055, 0.02, 900, 'bandpass', 0.16);
        break;
      case 'seagull':
        this.blip(t, 900, 0.1, 'sawtooth', 0.12);
        this.blip(t + 0.13, 1100, 0.09, 'sawtooth', 0.11);
        this.blip(t + 0.3, 820, 0.13, 'sawtooth', 0.1);
        break;
      case 'footstep':
        this.noise(t, 0.045, 700, 'lowpass', 0.16);
        break;
      case 'rain':
        this.noise(t, 1.4, 2600, 'highpass', 0.12);
        break;
      case 'zap':
        this.sweepNoise(t, 0.35, 4000, 300, 0.4);
        break;
      case 'powerup':
        for (let i = 0; i < 8; i++) this.blip(t + i * 0.045, 300 + i * 130, 0.05, 'square', 0.18);
        break;
      case 'powerdown':
        for (let i = 0; i < 8; i++) this.blip(t + i * 0.05, 1200 - i * 130, 0.06, 'square', 0.18);
        break;
      case 'die':
        this.blip(t, 400, 0.1, 'square', 0.25);
        this.blip(t + 0.1, 300, 0.1, 'square', 0.25);
        this.blip(t + 0.2, 200, 0.35, 'square', 0.25);
        break;
      case 'typewriter':
        this.blip(t, 1500 + Math.random() * 500, 0.008, 'square', 0.05);
        break;
      default:
        break;
    }
  }

  private blip(t: number, freq: number, dur: number, wave: Wave, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, freq: number, type: BiquadFilterType, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private sweepNoise(t: number, dur: number, from: number, to: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

const R = '-';

/**
 * The soundtrack. Deliberately simple and a bit cheesy, as spec s.21 asks:
 * analogue synth, gated drum machine, a bassline and a melody you could hum.
 */
export const TUNES: Record<string, Tune> = {
  // Main theme: minor key, driving eighths, gated snare on 2 and 4.
  title: {
    bpm: 116,
    gatedSnare: true,
    drums: 'k--h--s-k-h-s--h',
    tracks: [
      {
        wave: 'sawtooth',
        gain: 0.16,
        cutoff: 900,
        sweep: 0.5,
        notes: ['A1','.','A2','.','A1','.','G1','.','F1','.','F2','.','G1','.','G2','.'],
      },
      {
        wave: 'square',
        gain: 0.1,
        cutoff: 2200,
        attack: 0.02,
        release: 0.2,
        notes: ['A4','.','.','C5','.','E5','.','.','D5','.','.','C5','.','.','.',R],
      },
      {
        wave: 'triangle',
        gain: 0.06,
        detune: 7,
        notes: ['A3','.','.','.','F3','.','.','.','C4','.','.','.','G3','.','.','.'],
      },
    ],
  },

  // Arcade floor: fast, bright, relentless. It should get slightly annoying.
  arcade: {
    bpm: 148,
    drums: 'k-h-s-h-k-h-s-hh',
    tracks: [
      {
        wave: 'square',
        gain: 0.12,
        cutoff: 1800,
        sweep: 0.4,
        notes: ['C2','C2','G2','C2','C2','C2','G2','C2','A1','A1','E2','A1','F1','F1','C2','F1'],
      },
      {
        wave: 'square',
        gain: 0.085,
        notes: ['C5','E5','G5','E5','C5','E5','G5','B5','A4','C5','E5','C5','F4','A4','C5','A4'],
      },
    ],
  },

  // Mystery: slow pad, unresolved. Used when the town starts going wrong.
  mystery: {
    bpm: 74,
    tracks: [
      {
        wave: 'sawtooth',
        gain: 0.075,
        cutoff: 620,
        attack: 0.5,
        release: 0.9,
        detune: -6,
        notes: ['D2','.','.','.','.','.','.','.','A2','.','.','.','.','.','.','.'],
      },
      {
        wave: 'sawtooth',
        gain: 0.055,
        cutoff: 780,
        attack: 0.6,
        release: 1.1,
        detune: 8,
        notes: ['F3','.','.','.','.','.','.','.','E3','.','.','.','.','.','.','.'],
      },
      {
        wave: 'triangle',
        gain: 0.045,
        attack: 0.05,
        release: 0.5,
        notes: [R,R,R,R,'A4','.','.',R,R,R,R,R,'G4','.','.',R],
      },
    ],
  },

  // Seafront: wistful, a bit windswept, still 1987.
  seafront: {
    bpm: 96,
    drums: '--h---h---h---h-',
    tracks: [
      {
        wave: 'triangle',
        gain: 0.1,
        notes: ['F2','.','.','.','C3','.','.','.','D2','.','.','.','A2','.','.','.'],
      },
      {
        wave: 'square',
        gain: 0.06,
        cutoff: 1600,
        attack: 0.03,
        release: 0.3,
        notes: ['A4','.','C5','.','.','A4','.','.','F4','.','G4','.','.','.','.',R],
      },
    ],
  },

  // Machine room: low hum with a pulse. Barely music. Deliberately oppressive.
  machine: {
    bpm: 60,
    tracks: [
      {
        wave: 'sine',
        gain: 0.14,
        notes: ['C1','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
      },
      {
        wave: 'sawtooth',
        gain: 0.05,
        cutoff: 300,
        sweep: 0.35,
        attack: 0.01,
        notes: ['C3',R,R,R,'C3',R,R,R,'C3',R,R,R,'C3',R,'D#3',R],
      },
    ],
  },

  // Final scene: piano-ish triangle and a warm pad. No drums. No jokes.
  ending: {
    bpm: 68,
    tracks: [
      {
        wave: 'triangle',
        gain: 0.11,
        attack: 0.005,
        release: 0.7,
        notes: ['F3','.','A3','.','C4','.','.','.','E3','.','G3','.','B3','.','.','.'],
      },
      {
        wave: 'sawtooth',
        gain: 0.05,
        cutoff: 560,
        attack: 0.7,
        release: 1.2,
        notes: ['F2','.','.','.','.','.','.','.','C2','.','.','.','.','.','.','.'],
      },
    ],
  },

  // Cinema: sparse, dusty, faintly wrong.
  cinema: {
    bpm: 80,
    tracks: [
      {
        wave: 'sine',
        gain: 0.08,
        attack: 0.4,
        release: 0.8,
        notes: ['D2','.','.','.','.','.','.','.','C2','.','.','.','.','.','.','.'],
      },
      {
        wave: 'triangle',
        gain: 0.04,
        notes: [R,R,'A4',R,R,R,R,R,R,R,'F4',R,R,R,R,R],
      },
    ],
  },

  // Danger: the loop tightening in Act VI.
  loop: {
    bpm: 132,
    drums: 'k-k-s-k-k-k-s-kk',
    gatedSnare: true,
    tracks: [
      {
        wave: 'sawtooth',
        gain: 0.13,
        cutoff: 1100,
        sweep: 0.3,
        notes: ['E2','E2','E2','E2','G2','G2','F2','F2','E2','E2','E2','E2','D2','D2','C2','B1'],
      },
      {
        wave: 'square',
        gain: 0.07,
        notes: ['E5','.',R,'D5','.',R,'B4','.','.',R,'E5','.',R,R,R,R],
      },
    ],
  },
};

export const audio = new AudioEngine();
