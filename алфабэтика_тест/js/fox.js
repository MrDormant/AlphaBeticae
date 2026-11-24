// Лисичка — только клипы слогов и слов из BOOK (без синтеза речи).
const Fox = {
  ART: 'assets/img/fox-mascot.png?v=4',
  CLIPS: {
    start: { video: 'assets/video/fox-start.webm' },
    idle: { video: 'assets/video/fox-idle.webm', audio: 'assets/audio/fox/idle.m4a' },
    good: { video: 'assets/video/fox-good.webm', audio: 'assets/audio/fox/good.m4a' },
    bad: { video: 'assets/video/fox-bad.webm', audio: 'assets/audio/fox/wrong.m4a' },
  },
  layer: null,
  runner: null,
  bubble: null,
  timer: null,
  busy: false,
  taps: 0,
  _clipPool: null,
  _vowels: null,
  EXTRA_TALK: [
    { en: 'IT IS ANNA', ru: 'Это Анна', audio: 'final/s-it-is-anna.m4a' },
    { en: 'IT IS NINA', ru: 'Это Нина', audio: 'final/s-it-is-nina.m4a' },
    { en: 'IT IS INNA', ru: 'Это Инна', audio: 'final/s-it-is-inna.m4a' },
    { en: 'IT IS VLADIMIR', ru: 'Это Владимир', audio: 'final/s-it-is-vladimir.m4a' },
    { en: 'IT IS POLINA', ru: 'Это Полина', audio: 'final/s-it-is-polina.m4a' },
    { en: 'IS IT MARINA', ru: 'Это Марина?', audio: 'final/s-is-it-marina.m4a' },
    { en: 'IS IT DIMA', ru: 'Это Дима?', audio: 'final/s-is-it-dima.m4a' },
    { en: 'IS IT ALINA', ru: 'Это Алина?', audio: 'final/s-is-it-alina.m4a' },
    { en: 'IS IT NATA', ru: 'Это Ната?', audio: 'final/s-is-it-nata.m4a' },
    { en: 'IS IT NOVOSIBIRSC', ru: 'Это Новосибирск?', audio: 'final/s-is-it-novosibirsc.m4a' },
    { en: 'MIROSLAV IS IN SAMARA', ru: 'Мирослав в Самаре', audio: 'final/s-miroslav-in-samara.m4a' },
    { en: 'FAINA IS IN ROSTOV', ru: 'Фаина в Ростове', audio: 'final/s-faina-in-rostov.m4a' },
    { en: 'POLINA IS IN VOLGOGRAD', ru: 'Полина в Волгограде', audio: 'final/s-polina-in-volgograd.m4a' },
    { en: 'VLADIMIR IS IN NOVGOROD', ru: 'Владимир в Новгороде', audio: 'final/s-vladimir-in-novgorod.m4a' },
    { en: 'SEVASTOPL', ru: 'Севастополь', audio: 'final/s-sevastopl.m4a' },
    { en: 'VOLGA', ru: 'Волга', audio: 'final/s-volga.m4a' },
    { en: 'DON', ru: 'Дон', audio: 'final/s-don.m4a' },
  ],
  FINISH_LINES: {
    final: ['Ура! Ты прошёл всю Алфабэтику!', 'Чемпион! Молодец!'],
    perfect: ['Ни одной ошибки! Великолепно!', 'Идеально! Молодец!'],
    great: ['Молодец!', 'Супер!', 'Умничка!', 'Блестяще!'],
    good: ['Молодец!', 'Ты справился!', 'Так держать!', 'Молодчина!'],
  },

  reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  _buildPools() {
    if (this._clipPool) return;
    const out = [];
    const book = window.BOOK;
    if (!book) {
      this._clipPool = [];
      this._vowels = [];
      return;
    }

    for (const L of book.lessons) {
      for (const s of L.syllables || []) {
        if (s.audio) {
          out.push({
            kind: 'syl',
            ru: s.ru,
            en: (s.en || s.enLow || '').toUpperCase(),
            audio: s.audio,
          });
        }
      }
      for (const w of L.words || []) {
        if (w.audio) {
          out.push({
            kind: 'word',
            ru: w.ru,
            en: String(w.en).toUpperCase(),
            audio: w.audio,
          });
        }
      }
    }

    const seen = new Set(out.map((x) => x.audio));
    const addWord = (en, ru, audio) => {
      if (!audio || seen.has(audio)) return;
      seen.add(audio);
      out.push({
        kind: 'word',
        ru: ru || en,
        en: String(en).replace(/[.?]/g, '').toUpperCase(),
        audio,
      });
    };

    for (const [en, audio] of Object.entries(book.gridAudio || {})) {
      addWord(en, book.glossary?.[en.toLowerCase()] || en, audio);
    }
    for (const p of book.final?.places || []) addWord(p.en, p.ru, p.audio);
    for (const s of book.final?.sentences || []) {
      if (s.audio && String(s.audio).startsWith('final/')) addWord(s.en, s.ru, s.audio);
    }
    for (const extra of this.EXTRA_TALK) addWord(extra.en, extra.ru, extra.audio);

    this._vowels = (book.lessons[0]?.letters || []).map((l) => ({
      kind: 'vowel',
      ru: l.ru,
      en: l.en,
      audio: l.audio,
    }));

    this._clipPool = out;
  },

  _rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  _pick({ syllableBias = 0.55, allowWord = true } = {}) {
    this._buildPools();
    const syls = this._clipPool.filter((p) => p.kind === 'syl');
    const words = allowWord ? this._clipPool.filter((p) => p.kind === 'word') : [];
    if (Math.random() < syllableBias && syls.length) return this._rand(syls);
    if (words.length) return this._rand(words);
    if (syls.length) return this._rand(syls);
    return this._clipPool.length ? this._rand(this._clipPool) : null;
  },

  _pickVowelOrSyl() {
    this._buildPools();
    const syls = this._clipPool.filter((p) => p.kind === 'syl');
    const vowels = this._vowels || [];
    const mix = [...vowels, ...syls];
    if (!mix.length) return this._pick({ syllableBias: 1, allowWord: false });
    return this._rand(mix);
  },

  _bubbleFor(item) {
    if (!item) return 'Лисичка молчит — включи звук 🔊';
    if (item.kind === 'vowel') {
      return `Гласная <b class="fox-v fox-v-big">${item.en}</b> <span class="fox-ru">${item.ru}</span>`;
    }
    if (item.kind === 'syl') {
      return `Слог <b class="fox-v">${item.en}</b><br><span class="fox-ru">${item.ru}</span>`;
    }
    return `Слово <b class="fox-v">${item.en}</b><br><span class="fox-ru">${item.ru}</span>`;
  },

  _playItem(item) {
    if (!item || typeof Store === 'undefined' || !Store.data.sound) return;
    if (typeof VowelAudio !== 'undefined' && VowelAudio.isPlaying()) return;
    if (item.kind === 'vowel' && typeof VowelAudio !== 'undefined') {
      VowelAudio.playLetter(item.en);
      return;
    }
    if (item.audio && typeof ClipAudio !== 'undefined') {
      ClipAudio.play(`assets/audio/${item.audio}`).catch(() => {});
    }
  },

  _sayClip(src) {
    if (this._voiceDone) this._voiceDone();
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (this._voiceDone === done) this._voiceDone = null;
        clearTimeout(this._voiceT);
        resolve();
      };
      this._voiceDone = done;
      if (!src || typeof Store === 'undefined' || !Store.data.sound) {
        this._voiceT = setTimeout(done, 900);
        return;
      }
      if (typeof VowelAudio !== 'undefined') VowelAudio.stop();
      if (typeof ClipAudio !== 'undefined') ClipAudio.stop();
      if (!this._voice) {
        this._voice = new Audio();
        this._voice.preload = 'auto';
      }
      const a = this._voice;
      a.onended = done;
      a.onerror = done;
      a.pause();
      const slash = src.lastIndexOf('/');
      a.src = slash >= 0 ? src.slice(0, slash + 1) + encodeURIComponent(src.slice(slash + 1)) : encodeURIComponent(src);
      a.play().catch(done);
      this._voiceT = setTimeout(done, 4500);
    });
  },

  stopVoice() {
    const a = this._voice;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
      try { a.currentTime = 0; } catch (e) { /* ignore */ }
    }
    clearTimeout(this._voiceT);
    if (this._voiceDone) this._voiceDone();
  },

  whenPraised() {
    return this._praiseP || Promise.resolve();
  },

  mount() {
    if (this.layer) return;
    this.bubble = h('div', { class: 'fox-bubble', role: 'status', 'aria-live': 'polite' });
    const art = h('video', {
      class: 'fox-art',
      src: this.CLIPS.idle.video,
      muted: true,
      loop: true,
      autoplay: true,
      playsinline: true,
      disablepictureinpicture: true,
    });
    art.muted = true;
    art.defaultMuted = true;
    art.loop = true;
    art.playsInline = true;
    art.setAttribute('muted', '');
    art.setAttribute('playsinline', '');
    art.play?.().catch(() => {});
    this.homeVideo = art;
    this.runner = h('div', {
      class: 'fox-runner',
      title: 'Лисичка: нажми — слог или слово. Дважды — гласная или слог.',
    }, this.bubble, art);
    this.layer = h('div', { class: 'fox-layer', id: 'fox-layer', 'aria-hidden': 'true' }, this.runner);
    document.body.append(this.layer);

    this.runner.addEventListener('animationend', () => this._finishRun());
    this.runner.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.busy) return;
      if (this.layer?.classList.contains('fox-home')) {
        this._heartPop(e.detail > 1 ? 5 : 3);
      }
      if (e.detail > 1) {
        clearTimeout(this._clickT);
        this.vowelTrick();
        return;
      }
      clearTimeout(this._clickT);
      this._clickT = setTimeout(() => {
        if (this.busy) return;
        this.taps += 1;
        this.chitchat(true);
        this.pausePatrolBrief(1200);
        this.runner?.classList.add('fox-hop');
        clearTimeout(this._hopT);
        this._hopT = setTimeout(() => this.runner?.classList.remove('fox-hop'), 520);
      }, 260);
    });

    this._onMove = (e) => this._peekAt(e);
    document.addEventListener('mousemove', this._onMove, { passive: true });

    this._buildPools();
    this.schedulePrank();
    this.scheduleGossip();
    this.syncIdle();
  },

  _peekAt(e) {
    if (!this.runner?.classList.contains('fox-idle') || this.busy || this.runner?.classList.contains('fox-patrol')) return;
    const r = this.runner.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width * 0.55);
    const dy = e.clientY - (r.top + r.height * 0.35);
    const tilt = Math.max(-11, Math.min(11, dx / 28));
    const lean = Math.max(-6, Math.min(6, dy / 40));
    this.runner.style.setProperty('--fox-tilt', `${tilt}deg`);
    this.runner.style.setProperty('--fox-lean', `${lean}deg`);
  },

  _showBubble(html, ms = 3800) {
    if (!this.bubble) return;
    this.bubble.innerHTML = html;
    this.bubble.classList.add('show');
    clearTimeout(this._bubbleT);
    this._bubbleT = setTimeout(() => this.bubble.classList.remove('show'), ms);
  },

  chitchat(manual = false, intoLesson = false) {
    const onHome = this.layer?.classList.contains('fox-home') && this.layer.style.display !== 'none';
    if (!intoLesson && !onHome) return;
    let item;
    if (manual && this.taps % 6 === 0) {
      item = this._pickVowelOrSyl();
    } else {
      item = this._pick({ syllableBias: manual ? 0.22 : 0.4, allowWord: true });
    }
    if (!item) return;
    const html = this._bubbleFor(item);
    if (intoLesson && this.lessonBubble) {
      this.lessonBubble.innerHTML = html;
      this.lessonBubble.classList.add('show');
      clearTimeout(this._lessonBubbleT);
      this._lessonBubbleT = setTimeout(() => this.lessonBubble?.classList.remove('show'), 4000);
    } else {
      this._showBubble(html, manual ? 4000 : 3200);
    }
    this._playItem(item);
  },

  vowelTrick() {
    const item = this._pickVowelOrSyl();
    if (!item) return;
    this._showBubble(
      `Повтори!<br>${this._bubbleFor(item)}`,
      4500,
    );
    this.runner.classList.add('fox-hop');
    clearTimeout(this._hopT);
    this._hopT = setTimeout(() => this.runner?.classList.remove('fox-hop'), 520);
    this._playItem(item);
  },

  _heartPop(count = 3, parent = this.runner) {
    if (this.reducedMotion() || !parent) return;
    const glyphs = ['♥', '♡', '❤'];
    for (let i = 0; i < count; i += 1) {
      const heart = h('span', { class: 'fox-heart' }, glyphs[i % glyphs.length]);
      const left = 22 + Math.random() * 56;
      const size = 9 + Math.random() * 7;
      heart.style.left = `${left}%`;
      heart.style.fontSize = `${size}px`;
      heart.style.animationDelay = `${Math.random() * 0.12}s`;
      heart.style.setProperty('--fox-heart-drift', `${(Math.random() - 0.5) * 22}px`);
      parent.append(heart);
      heart.addEventListener('animationend', () => heart.remove(), { once: true });
    }
  },

  _finishHeartStream(parent) {
    if (this.reducedMotion() || !parent) return;
    clearTimeout(this._finishHeartLoop);
    let n = 0;
    const tick = () => {
      if (n >= 16 || !parent.isConnected) return;
      this._heartPop(2 + (n % 2), parent);
      n += 1;
      this._finishHeartLoop = setTimeout(tick, 360);
    };
    tick();
  },

  finishPanel({ stars = 3, perfect = false, final: isFinal = false } = {}) {
    let pool;
    if (isFinal) pool = this.FINISH_LINES.final;
    else if (perfect) pool = this.FINISH_LINES.perfect;
    else if (stars >= 3) pool = this.FINISH_LINES.great;
    else pool = this.FINISH_LINES.good;

    const burst = h('div', { class: 'fox-finish-burst', 'aria-hidden': 'true' });
    const art = h('video', {
      class: 'fox-finish-art',
      src: this.CLIPS.good.video,
      muted: true,
      loop: true,
      autoplay: true,
      playsinline: true,
      disablepictureinpicture: true,
    });
    art.muted = true;
    art.defaultMuted = true;
    art.loop = true;
    art.playsInline = true;
    art.setAttribute('muted', '');
    art.setAttribute('playsinline', '');
    art.play?.().catch(() => {});
    const wrap = h('div', { class: 'fox-finish' },
      burst,
      art,
      h('p', { class: 'fox-finish-msg' }, this._rand(pool)),
    );

    requestAnimationFrame(() => {
      this._finishHeartStream(burst);
      this._sayClip(this.CLIPS.good.audio);
    });
    return wrap;
  },

  enterIdle() {
    if (!this.runner || this.busy) return;
    if (!this.layer?.classList.contains('fox-home')) return;
    this.runner.classList.remove('run-ltr', 'run-rtl', 'run-quick');
    this.runner.classList.add('fox-idle', 'fox-patrol');
    this.runner.style.opacity = '1';
    this.runner.style.transform = '';
    this.runner.style.right = 'auto';
    this.homeVideo?.play?.().catch(() => {});
    this.startPatrol();
  },

  leaveIdle() {
    this.stopPatrol();
    this.runner?.classList.remove('fox-idle', 'fox-patrol');
    this.runner?.style.setProperty('--fox-tilt', '0deg');
    this.runner?.style.setProperty('--fox-lean', '0deg');
    const art = this.runner?.querySelector('.fox-art');
    if (art) art.style.transform = '';
    this.homeVideo?.pause?.();
  },

  startPatrol() {
    if (!this.runner?.classList.contains('fox-patrol')) return;
    if (this.reducedMotion()) {
      this.runner.style.left = 'auto';
      this.runner.style.right = '12px';
      return;
    }
    this.stopPatrol();
    if (this._patrolX == null) this._patrolX = Math.random();
    if (this._patrolDir == null) this._patrolDir = Math.random() > 0.5 ? 1 : -1;

    const step = (t) => {
      if (!this.runner?.classList.contains('fox-patrol') || this.busy) {
        this._patrolRaf = requestAnimationFrame(step);
        return;
      }
      if (!this._patrolLast) this._patrolLast = t;
      const dt = Math.min(48, t - this._patrolLast);
      this._patrolLast = t;
      const layerW = this.layer?.clientWidth || window.innerWidth;
      const foxW = this.runner.offsetWidth || 100;
      const pad = 10;
      const span = Math.max(120, layerW - foxW - pad * 2);
      const speed = 0.00062;
      this._patrolX += this._patrolDir * speed * (dt / 16);
      if (this._patrolX <= 0) {
        this._patrolX = 0;
        this._patrolDir = 1;
      } else if (this._patrolX >= 1) {
        this._patrolX = 1;
        this._patrolDir = -1;
      }
      const left = pad + this._patrolX * span;
      this.runner.style.left = `${left}px`;
      const art = this.runner.querySelector('.fox-art');
      if (art && !this.runner.classList.contains('fox-hop')) {
        art.style.setProperty('--fox-face', this._patrolDir < 0 ? '-1' : '1');
      }
      this._patrolRaf = requestAnimationFrame(step);
    };
    this._patrolRaf = requestAnimationFrame(step);
  },

  stopPatrol() {
    if (this._patrolRaf) cancelAnimationFrame(this._patrolRaf);
    this._patrolRaf = null;
    this._patrolLast = 0;
  },

  pausePatrolBrief(ms = 900) {
    this.runner?.classList.remove('fox-patrol');
    this.stopPatrol();
    clearTimeout(this._patrolPauseT);
    this._patrolPauseT = setTimeout(() => {
      if (this.runner?.classList.contains('fox-idle') && !this.busy) {
        this.runner.classList.add('fox-patrol');
        this._patrolLast = 0;
        this.startPatrol();
      }
    }, ms);
  },

  syncIdle() {
    if (!this.layer) return;
    if (this.layer.classList.contains('fox-home') && !this.busy) this.enterIdle();
    else this.leaveIdle();
  },

  _reset() {
    if (!this.runner) return;
    this.runner.classList.remove('run-ltr', 'run-rtl', 'run-quick');
    this.busy = false;
  },

  _finishRun() {
    clearTimeout(this._idleT);
    this._reset();
    this.syncIdle();
  },

  _wiggleOnce() {
    if (!this.runner || this.busy) return;
    this.busy = true;
    this.enterIdle();
    this.runner.classList.add('fox-wiggle');
    clearTimeout(this._wiggleT);
    this._wiggleT = setTimeout(() => {
      this.runner?.classList.remove('fox-wiggle');
      this.busy = false;
    }, 700);
  },

  runOnce({ reverse = false, quick = false } = {}) {
    if (this.busy || !this.runner) return;
    if (this.reducedMotion()) {
      this._wiggleOnce();
      return;
    }
    this.busy = true;
    this.leaveIdle();
    this.runner.classList.remove('run-ltr', 'run-rtl', 'run-quick');
    void this.runner.offsetWidth;
    this.runner.classList.add(reverse ? 'run-rtl' : 'run-ltr', quick ? 'run-quick' : '');
    this.runner.style.opacity = '';
    this.layer.setAttribute('aria-hidden', 'false');
    clearTimeout(this._hideT);
    this._hideT = setTimeout(() => this.layer.setAttribute('aria-hidden', 'true'), quick ? 1800 : 3200);
    const dur = quick ? 1850 : 2950;
    clearTimeout(this._idleT);
    this._idleT = setTimeout(() => this._finishRun(), dur);
  },

  celebrate() {
    this._buildPools();
    const hello = this._clipPool.find((x) => x.en === 'HELLO');
    const item = hello && Math.random() > 0.35 ? hello : this._pick({ syllableBias: 0.4, allowWord: true });
    if (item) {
      this._showBubble(`★ ${this._bubbleFor(item)}`, 3000);
      this._playItem(item);
    }
    const reverse = Math.random() > 0.45;
    setTimeout(() => this.runOnce({ reverse, quick: false }), 400);
  },

  schedulePrank() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!document.hidden && !this.busy && this.layer?.classList.contains('fox-home')) {
        this.chitchat(false);
      }
      this.schedulePrank();
    }, 22000 + Math.random() * 32000);
  },

  scheduleGossip() {
    clearTimeout(this._gossipT);
    this._gossipT = setTimeout(() => {
      if (!document.hidden && !this.busy && this.layer?.classList.contains('fox-home')) {
        this.chitchat(false);
      }
      this.scheduleGossip();
    }, 55000 + Math.random() * 45000);
  },

  hideWalker() {
    this.stopPatrol();
    this.leaveIdle();
    if (this.layer) {
      this.layer.classList.remove('fox-home');
      this.layer.style.display = 'none';
      this.bubble?.classList.remove('show');
    }
  },

  attachLesson(host) {
    this.detachLesson({ keepHidden: true });
    this.hideWalker();
    this._idleSaid = false;
    this.lessonBubble = h('div', { class: 'fox-lesson-bubble', role: 'status' });
    this.lessonVideo = h('video', {
      class: 'fox-lesson-art',
      muted: true,
      playsinline: true,
      preload: 'auto',
      disablepictureinpicture: true,
    });
    this.lessonVideo.muted = true;
    this.lessonVideo.playsInline = true;
    this.lessonVideo.setAttribute('playsinline', '');
    this.lessonBody = h('div', { class: 'fox-lesson-body' }, this.lessonVideo);
    this.lessonRoot = h('div', {
      class: 'fox-lesson',
      title: 'Лисичка: нажми — слог или слово',
    }, this.lessonBubble, this.lessonBody);
    this.lessonRoot.addEventListener('pointerdown', (e) => this._onLessonFoxPointer(e));
    host.append(this.lessonRoot);
    this._playLessonClip('start');
  },

  _lessonTargetUnder(e) {
    const root = this.lessonRoot;
    if (!root) return null;
    const prev = root.style.pointerEvents;
    root.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    root.style.pointerEvents = prev;
    if (!under || root.contains(under)) return null;
    return under.closest(
      'button, a, input, textarea, select, label, canvas, summary, [role="button"],' +
      '.ws-cell, .ws-word, .ws-grid, .ws-snake, .ws-list, .crayon,' +
      '.tile, .paint-cell, .letter-card, .letter-tile, .chant-cell,' +
      '.en-word, .word-card, .vowel-row, .syl-row, .option, .chip,' +
      '.listen, .slot, .pad, .pad-wrap, .swatch, .sentence'
    );
  },

  _passLessonPointer(e, under) {
    const root = this.lessonRoot;
    if (!root || !under) return;
    e.preventDefault();
    e.stopPropagation();
    root.style.pointerEvents = 'none';
    under.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      pageX: e.pageX,
      pageY: e.pageY,
      buttons: e.buttons,
      button: e.button,
      isPrimary: e.isPrimary,
    }));
    const restore = () => {
      if (this.lessonRoot === root) root.style.pointerEvents = '';
      this._foxPassRestore = null;
      window.removeEventListener('pointerup', restore, true);
      window.removeEventListener('pointercancel', restore, true);
    };
    this._foxPassRestore = restore;
    window.addEventListener('pointerup', restore, true);
    window.addEventListener('pointercancel', restore, true);
  },

  _onLessonFoxPointer(e) {
    if (e.button && e.button !== 0) return;
    const under = this._lessonTargetUnder(e);
    if (under) {
      this._passLessonPointer(e, under);
      return;
    }
    e.stopPropagation();
    this.taps += 1;
    this._heartPop(3, this.lessonBody);
    this.chitchat(true, true);
  },

  _playLessonClip(kind) {
    if (!this.lessonVideo) return;
    const clip = this.CLIPS[kind];
    if (!clip) return;
    this._lessonKind = kind;
    const v = this.lessonVideo;
    v.onended = null;
    v.loop = kind === 'idle';
    v.muted = true;
    v.src = clip.video;
    v.play().catch(() => {});
    if (kind === 'start') {
      v.onended = () => this._playLessonClip('idle');
      clearTimeout(this._startT);
      this._startT = setTimeout(() => {
        if (this._lessonKind === 'start') this._playLessonClip('idle');
      }, 8000);
      this._idleSaid = true;
      if (this.CLIPS.idle.audio) this._sayClip(this.CLIPS.idle.audio);
      return;
    }
    clearTimeout(this._startT);
    if (kind === 'good' || kind === 'bad') {
      v.onended = () => this._playLessonClip('idle');
    }
    if (kind === 'idle') return Promise.resolve();
    if (clip.audio && typeof Store !== 'undefined' && Store.data.sound) {
      return this._sayClip(clip.audio);
    }
    return Promise.resolve();
  },

  detachLesson({ keepHidden = false } = {}) {
    if (this._foxPassRestore) this._foxPassRestore();
    this.stopVoice();
    clearTimeout(this._lessonBubbleT);
    clearTimeout(this._lessonHopT);
    if (this.lessonVideo) {
      this.lessonVideo.onended = null;
      this.lessonVideo.pause();
      this.lessonVideo.removeAttribute('src');
      this.lessonVideo.load();
    }
    this.lessonRoot?.remove();
    this.lessonRoot = null;
    this.lessonBody = null;
    this.lessonBubble = null;
    this.lessonVideo = null;
    if (!keepHidden && this.layer) {
      this.layer.style.display = '';
    }
  },

  lessonRight() {
    if (!this.lessonBody) return Promise.resolve();
    this._heartPop(6, this.lessonBody);
    if (this.lessonBubble) {
      this.lessonBubble.textContent = 'Молодец!';
      this.lessonBubble.classList.add('show');
      clearTimeout(this._lessonBubbleT);
      this._lessonBubbleT = setTimeout(() => this.lessonBubble?.classList.remove('show'), 4000);
    }
    this._praising = true;
    this._praiseP = Promise.resolve(this._playLessonClip('good')).finally(() => {
      this._praising = false;
    });
    return this._praiseP;
  },

  lessonWrong() {
    if (!this.lessonBubble || !this.lessonBody) return;
    this.lessonBubble.textContent = 'Неправильно!';
    this.lessonBubble.classList.add('show');
    clearTimeout(this._lessonBubbleT);
    this._lessonBubbleT = setTimeout(() => this.lessonBubble?.classList.remove('show'), 2600);
    this._playLessonClip('bad');
  },

  updateVisibility(kind) {
    if (!this.layer) return;
    const homey = !kind || kind === 'cubes' || kind === 'alphabet' || kind === 'profile';
    const inLesson = kind === 'lesson' || kind === 'reading' || kind === 'final';
    if (inLesson) {
      this.hideWalker();
      return;
    }
    this.detachLesson();
    this.layer.classList.toggle('fox-home', homey);
    this.layer.style.display = homey ? '' : 'none';
    if (homey) this.syncIdle();
    else this.bubble?.classList.remove('show');
  },
};
