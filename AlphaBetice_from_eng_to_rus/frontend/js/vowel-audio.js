// Recorded clips from the shared voice folder. Speech synthesis is the fallback.
const ClipAudio = {
  current: null,
  stop() {
    if (!this.current) return;
    this.current.onended = null;
    this.current.onerror = null;
    this.current.pause();
    this.current = null;
  },
  play(src) {
    if (!src || (typeof Store !== 'undefined' && Store.data && Store.data.sound === false)) {
      return Promise.resolve();
    }
    this.stop();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const audio = new Audio(src);
    this.current = audio;
    return audio.play().catch(() => {});
  },
  playThrough(src) {
    if (!src || (typeof Store !== 'undefined' && Store.data && Store.data.sound === false)) {
      return Promise.resolve(false);
    }
    this.stop();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const audio = new Audio(src);
    this.current = audio;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (this.current === audio) this.current = null;
        resolve(ok);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    });
  },
};

// Vowel chant A–O–E–Y–I–U (А–О–Э–Ы–И–У) · assets/audio/vowel-chant.wav
const VowelAudio = {
  src: 'assets/audio/vowel-chant.wav',
  order: ['A', 'O', 'E', 'Y', 'I', 'U'],
  duration: 4.779,
  segments: null,
  _audio: null,
  _timers: [],
  isPlaying() {
    return !!(this._audio && !this._audio.paused);
  },

  _el() {
    if (!this._audio) {
      this._audio = new Audio(this.src);
      this._audio.preload = 'auto';
    }
    return this._audio;
  },

  stop() {
    this._timers.forEach((t) => clearTimeout(t));
    this._timers = [];
    const a = this._audio;
    if (a) {
      a.onended = null;
      a.pause();
      try { a.currentTime = 0; } catch (e) { /* ignore */ }
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },

  _index(letter) {
    const i = this.order.indexOf(String(letter).toUpperCase());
    return i >= 0 ? i : 0;
  },

  async _ready() {
    if (!Store.data.sound) return false;
    const a = this._el();
    if (a.readyState >= 1 && Number.isFinite(a.duration) && a.duration > 0) {
      this.duration = a.duration;
      return true;
    }
    return new Promise((resolve) => {
      const done = () => {
        if (Number.isFinite(a.duration) && a.duration > 0) this.duration = a.duration;
        resolve(true);
      };
      a.addEventListener('loadedmetadata', done, { once: true });
      a.addEventListener('error', () => resolve(false), { once: true });
      a.load();
    });
  },

  bounds(letter) {
    const i = this._index(letter);
    if (this.segments && this.segments[i]) {
      const [start, end] = this.segments[i];
      return { start, end };
    }
    const step = this.duration / this.order.length;
    const pad = 0.012;
    return { start: Math.max(0, i * step + pad), end: Math.min(this.duration, (i + 1) * step - pad) };
  },

  playLetter(letter) {
    return this._playRange(this.bounds(letter));
  },

  _playRange({ start, end }) {
    return this._ready().then((ok) => {
      if (!ok) return;
      const a = this._el();
      this.stop();
      a.currentTime = start;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        a.removeEventListener('timeupdate', onTime);
        try { a.pause(); } catch (e) { /* ignore */ }
      };
      const onTime = () => {
        if (a.currentTime >= end - 0.02) finish();
      };
      return a.play().catch(finish).then(() => new Promise((resolve) => {
        const endPlay = () => { finish(); resolve(); };
        a.addEventListener('timeupdate', onTime);
        this._timers.push(setTimeout(endPlay, Math.max(120, (end - start) * 1000 + 200)));
      }));
    });
  },

  playAll(onStep) {
    return this._ready().then((ok) => {
      if (!ok) return;
      const a = this._el();
      this.stop();
      const step = this.duration / this.order.length;
      for (let i = 0; i < this.order.length; i++) {
        this._timers.push(setTimeout(() => { if (onStep) onStep(i); }, i * step * 1000));
      }
      a.currentTime = 0;
      return a.play().then(() => new Promise((resolve) => {
        const done = () => {
          a.onended = null;
          resolve();
        };
        a.onended = done;
        this._timers.push(setTimeout(done, this.duration * 1000 + 350));
      })).catch(() => {});
    });
  },
};
