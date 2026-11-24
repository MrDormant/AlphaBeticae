// Пропевка А–О–Э–И–У из записи assets/audio/aoeiu.m4a
const VowelAudio = {
  src: 'assets/audio/aoeiu.m4a',
  order: ['A', 'O', 'E', 'I', 'U'],
  /** Длина файла (с); уточняется из metadata при первом воспроизведении. */
  duration: 2.535,
  /** Опционально: [[start, end], …] для A,O,E,I,U — если нужно подогнать вручную. */
  segments: null,
  _audio: null,
  _timers: [],
  _playing: false,
  _waiters: [],

  isPlaying() {
    return this._playing;
  },

  _finishWaiters() {
    const wait = this._waiters;
    this._waiters = [];
    this._playing = false;
    wait.forEach((fn) => fn());
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
    this._finishWaiters();
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

  /** Целиком, как в книге; onStep(i) — подсветка буквы. */
  playAll(onStep) {
    return this._ready().then((ok) => {
      if (!ok) return;
      const a = this._el();
      this.stop();
      const step = this.duration / this.order.length;
      for (let i = 0; i < this.order.length; i++) {
        this._timers.push(setTimeout(() => { if (onStep) onStep(i); }, i * step * 1000));
      }
      this._playing = true;
      a.currentTime = 0;
      return a.play().then(() => new Promise((resolve) => {
        const done = () => {
          a.onended = null;
          this._waiters = [];
          this._playing = false;
          resolve();
        };
        this._waiters.push(resolve);
        a.onended = done;
        this._timers.push(setTimeout(done, this.duration * 1000 + 350));
      })).catch(() => { this._playing = false; });
    });
  },
};

/** Отдельные записи слогов (целиком), напр. MAA.m4a для «ма». */
const ClipAudio = {
  _audio: null,
  stop() {
    const a = this._audio;
    if (!a) return;
    a.onended = null;
    a.pause();
    try { a.currentTime = 0; } catch (e) { /* ignore */ }
  },
  _srcUrl(src) {
    const i = src.lastIndexOf('/');
    return i >= 0 ? src.slice(0, i + 1) + encodeURIComponent(src.slice(i + 1)) : encodeURIComponent(src);
  },

  play(src) {
    if (!Store.data.sound) return Promise.resolve();
    if (typeof VowelAudio !== 'undefined') VowelAudio.stop();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (!this._audio) {
      this._audio = new Audio();
      this._audio.preload = 'auto';
    }
    const a = this._audio;
    a.onended = null;
    a.pause();
    a.src = this._srcUrl(src);
    return a.play();
  },

  /** Воспроизвести клип до конца (для диалогов и длинных фраз). */
  playThrough(src) {
    if (!Store.data.sound) return Promise.resolve();
    if (typeof VowelAudio !== 'undefined') VowelAudio.stop();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (!this._audio) {
      this._audio = new Audio();
      this._audio.preload = 'auto';
    }
    const a = this._audio;
    a.pause();
    a.src = this._srcUrl(src);
    return new Promise((resolve) => {
      const done = () => {
        a.onended = null;
        a.onerror = null;
        resolve();
      };
      a.onended = done;
      a.onerror = done;
      a.play().catch(done);
    });
  },
};
