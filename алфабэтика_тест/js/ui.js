function h(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);
const uniq = (arr) => [...new Set(arr)];
const img = (name) => `assets/img/${name}.jpg`;

const PIC_VIDEO = {
  anna: 'assets/video/pic/anna.mp4',
  mama: 'assets/video/pic/mama.mp4',
  llama: 'assets/video/pic/llama.mp4',
  lesson7: 'assets/video/pic/lesson7.mp4',
  puma: 'assets/video/pic/puma.mp4',
  sport: 'assets/video/pic/sport.mp4',
  forest: 'assets/video/pic/forest.mp4',
  forest2: 'assets/video/pic/forest2.mp4',
  farfalla: 'assets/video/pic/farfalla.mp4',
  dog: 'assets/video/pic/dog.mp4',
  hen: 'assets/video/pic/hen.mp4',
  read2: 'assets/video/pic/read2.mp4',
};

function pic(name, className, alt = '') {
  if (!name) return null;
  const src = PIC_VIDEO[name];
  if (src) {
    const v = h('video', {
      class: className,
      src: `${src}?v=1`,
      muted: true,
      loop: true,
      autoplay: true,
      playsinline: true,
      preload: 'auto',
      disablepictureinpicture: true,
    });
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.play().catch(() => {});
    return v;
  }
  return h('img', { class: className, src: img(name), alt });
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'a', 'e', 'i', 'o', 'u', 'А', 'О', 'Э', 'И', 'У', 'а', 'о', 'э', 'и', 'у']);

function colorize(text) {
  return h('span', { class: 'colorized' }, [...text].map((ch) =>
    /[A-Za-z]/.test(ch) ? h('span', { class: VOWELS.has(ch) ? 'v' : 'c' }, ch) : ch));
}

function wordDisplay(word) {
  const en = word.en;
  return word.name ? en[0] + en.slice(1).toLowerCase() : en.toLowerCase();
}

function speakable(text) {
  return /^[A-Z ]+$/.test(text) ? text.toLowerCase() : text;
}

const Speech = {
  voices: [],
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices(); };
    load();
    speechSynthesis.onvoiceschanged = load;
  },
  pick(lang) {
    const prefs = lang === 'en' ? ['en-GB', 'en-US', 'en'] : ['ru-RU', 'ru'];
    for (const p of prefs) {
      const v = this.voices.find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(p.toLowerCase()));
      if (v) return v;
    }
    return null;
  },
  say(text, lang = 'en', opts = {}) {
    if (!('speechSynthesis' in window) || !Store.data.sound) return null;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lang === 'en' ? speakable(text) : text.toLowerCase());
    const v = this.pick(lang);
    if (v) u.voice = v;
    u.lang = lang === 'en' ? 'en-GB' : 'ru-RU';
    u.rate = opts.rate || 0.8;
    u.pitch = opts.pitch || 1;
    speechSynthesis.speak(u);
    return u;
  },
  // Ждёт конца фразы; страховочный таймер — на случай, если браузер не пришлёт onend.
  sayAsync(text, lang = 'ru', opts = {}) {
    return new Promise((resolve) => {
      const u = this.say(text, lang, opts);
      const guess = Math.min(9000, 600 + text.length * 75);
      const t = setTimeout(resolve, u ? guess : 450);
      if (u) {
        u.onend = () => { clearTimeout(t); resolve(); };
        u.onerror = () => { clearTimeout(t); resolve(); };
      }
    });
  },
};

const Sfx = {
  ctx: null,
  tone(freqs, dur = 0.12, type = 'sine') {
    if (!Store.data.sound) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      let t = this.ctx.currentTime;
      for (const f of freqs) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(this.ctx.destination);
        o.start(t);
        o.stop(t + dur);
        t += dur * 0.8;
      }
    } catch (e) { /* звук недоступен */ }
  },
  good() { this.tone([660, 880], 0.12); },
  bad() { this.tone([220, 180], 0.15, 'triangle'); },
  win() { this.tone([523, 659, 784, 1047], 0.16); },
};

function answerGood(ctx) {
  Sfx.good();
  if (ctx?.correct) ctx.correct();
  if (typeof Fox !== 'undefined' && Fox.whenPraised) return Fox.whenPraised();
  return new Promise((resolve) => setTimeout(resolve, 900));
}

function answerBad(ctx) {
  Sfx.bad();
  if (ctx?.mistake) ctx.mistake();
}

// Прогресс: у гостя — только в браузере, у пользователя — локальная копия + сервер.
const Store = {
  key: null,
  user: null,
  data: null,
  syncTimer: null,
  defaults: () => ({ done: {}, dates: {}, name: '', unlockAll: false, sound: true, cubeScore: 0 }),
  load(user = null) {
    this.user = user;
    this.key = user ? `alfabetica-user-${user}` : 'alfabetica-progress-v1';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { saved = {}; }
    this.data = { ...this.defaults(), ...saved };
  },
  // Сервер — главный источник, но звёзды, заработанные без связи, не теряются.
  applyServer(serverData) {
    const local = this.data;
    const server = { ...this.defaults(), ...(serverData || {}) };
    const done = { ...server.done };
    const dates = { ...server.dates };
    let localAhead = false;
    for (const [id, stars] of Object.entries(local.done)) {
      if (stars > (done[id] || 0)) { done[id] = stars; localAhead = true; }
    }
    for (const [id, date] of Object.entries(local.dates || {})) {
      if (!dates[id] || date > dates[id]) { dates[id] = date; localAhead = true; }
    }
    const cubeScore = Math.max(server.cubeScore || 0, local.cubeScore || 0);
    if (cubeScore > (server.cubeScore || 0)) localAhead = true;
    this.data = { ...server, done, dates, cubeScore };
    localStorage.setItem(this.key, JSON.stringify(this.data));
    if (localAhead) this.sync();
  },
  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
    if (this.user) this.sync();
  },
  sync() {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      Api.request('PUT', '/api/progress', { data: this.data }).catch((err) => {
        if (err.status === 401) Auth.expired();
      });
    }, 500);
  },
  complete(id, stars) {
    const prev = this.data.done[id] || 0;
    this.data.done[id] = Math.max(prev, stars);
    this.data.dates = { ...this.data.dates, [id]: new Date().toISOString() };
    this.save();
  },
  stars() { return Object.values(this.data.done).reduce((a, b) => a + b, 0); },
  reset() {
    this.data = { ...this.defaults(), name: this.data.name, sound: this.data.sound };
    this.save();
  },
};

function toast(content, ms = 2200) {
  const t = h('div', { class: 'toast' }, content);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

function confetti() {
  const colors = ['#e53935', '#1e63c6', '#43a047', '#fdd835', '#fb8c00', '#8e24aa'];
  const box = h('div', { class: 'confetti' });
  for (let i = 0; i < 80; i++) {
    box.append(h('i', {
      style: {
        left: Math.random() * 100 + 'vw',
        background: colors[i % colors.length],
        animationDelay: Math.random() * 0.6 + 's',
        animationDuration: 1.8 + Math.random() * 1.4 + 's',
        transform: `rotate(${Math.random() * 360}deg)`,
      },
    }));
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3600);
}

function shake(node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
}

function sentenceAudioClips(s) {
  if (s?.audioClips?.length) return s.audioClips;
  if (s?.audio) return [s.audio];
  return null;
}

async function playSentenceAudio(s, lang = 'en') {
  const clips = sentenceAudioClips(s);
  if (clips?.length && typeof ClipAudio !== 'undefined') {
    for (const c of clips) {
      await ClipAudio.playThrough(`assets/audio/${c}`);
    }
    return;
  }
  Speech.say(s?.en || s, lang);
}

function listenBtn(text, lang = 'en', label, clip) {
  const clips = Array.isArray(clip) ? clip : (clip ? [clip] : null);
  return h('button', {
    class: 'listen', title: 'Послушать', type: 'button',
    onclick: async (e) => {
      e.stopPropagation();
      if (clips?.length && typeof ClipAudio !== 'undefined') {
        let ok = true;
        for (const c of clips) {
          try { await ClipAudio.playThrough(`assets/audio/${c}`); } catch { ok = false; break; }
        }
        if (!ok) Speech.say(text, lang);
      } else Speech.say(text, lang);
    },
  }, '🔊', label ? h('span', null, label) : null);
}

function playWordAudio(wd) {
  const clip = wd?.audio || (wd?.en && lessonWordAudioClip(wd.en));
  if (clip && typeof ClipAudio !== 'undefined') {
    ClipAudio.play(`assets/audio/${clip}`).catch(() => { if (wd?.en) Speech.say(wd.en, 'en'); });
  } else if (wd?.en) Speech.say(wd.en, 'en');
}

/** Путь к клипу слога (l2/syl-na.m4a и т.д.) или гласной из урока 1. */
function syllableAudioClip(en) {
  const key = String(en).toUpperCase();
  if (key.length === 1 && BOOK.lessons[0]?.letters) {
    const v = BOOK.lessons[0].letters.find((l) => l.en === key);
    if (v?.audio) return v.audio;
  }
  for (const lesson of BOOK.lessons) {
    for (const s of lesson.syllables || []) {
      if (String(s.en).toUpperCase() === key && s.audio) return s.audio;
    }
  }
  return null;
}

function lessonWordAudioClip(en) {
  const key = String(en).toUpperCase();
  if (BOOK.gridAudio?.[key]) return BOOK.gridAudio[key];
  for (const lesson of BOOK.lessons) {
    for (const w of lesson.words || []) {
      if (w.en.toUpperCase() === key && w.audio) return w.audio;
    }
  }
  return null;
}

function playSyllableEn(en) {
  const clip = syllableAudioClip(en);
  if (clip && typeof ClipAudio !== 'undefined') {
    ClipAudio.play(`assets/audio/${clip}`).catch(() => Speech.say(en, 'en'));
  } else Speech.say(en, 'en');
}

function playEnglishWordEn(en) {
  const clip = lessonWordAudioClip(en);
  if (clip && typeof ClipAudio !== 'undefined') {
    ClipAudio.play(`assets/audio/${clip}`).catch(() => Speech.say(en, 'en'));
  } else Speech.say(en, 'en');
}

// Текст, в котором английские слова можно нажать: прозвучит слово и появится перевод.
function mixedText(text, lesson) {
  return h('p', { class: 'mixed' }, text.split(/([A-Za-z]+)/g).map((tok) => {
    if (!/^[A-Za-z]+$/.test(tok)) return tok;
    const clip = lessonWordAudioClip(tok);
    return h('button', {
      class: 'en-word', type: 'button',
      onclick: () => {
        if (clip && typeof ClipAudio !== 'undefined') {
          ClipAudio.play(`assets/audio/${clip}`).catch(() => Speech.say(tok, 'en'));
        } else Speech.say(tok, 'en');
        const ru = BOOK.glossary[tok.toLowerCase()];
        toast(h('span', null, h('b', null, tok), ru ? ` — ${ru}` : ''));
      },
    }, colorize(tok));
  }));
}

function readingLine(p) {
  const text = typeof p === 'string' ? p : p.t;
  const audio = typeof p === 'string' ? null : p.audio;
  return h('div', { class: 'reading-sent' },
    audio ? h('button', {
      class: 'listen', type: 'button', title: 'Послушать предложение',
      onclick: () => ClipAudio.playThrough(`assets/audio/${audio}`),
    }, '🔊') : h('span', { class: 'listen-spacer' }),
    mixedText(text));
}

async function playReadingText(reading) {
  const clips = (reading.text || []).map((p) => (typeof p === 'string' ? null : p.audio)).filter(Boolean);
  if (clips.length) {
    for (const c of clips) await ClipAudio.playThrough(`assets/audio/${c}`);
    return;
  }
  if (reading.textAudio) await ClipAudio.playThrough(`assets/audio/${reading.textAudio}`);
}

const Ex = {};

Ex.storyPage = (page, ctx) => {
  if (page.dialogue) return Ex.dialogue(page, ctx);
  ctx.done();
  return h('div', { class: 'story' },
    pic(page.image, 'story-img'),
    h('div', { class: 'story-text' }, page.text.map((p) => h('p', null, highlightAO(p)))),
    h('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => Speech.say(page.text.join(' ').replace(/—/g, ''), 'ru'),
    }, '🔊 Прочитать вслух'));
};

function highlightAO(text) {
  return text.split(/((?<![А-Яа-яЁё])(?:Аа|Оо|А|О|Q|U)(?![А-Яа-яЁё]))/g).map((p) =>
    /^(Аа|Оо|А|О|Q|U)$/.test(p) ? h('b', { class: 'hero' }, p) : p);
}

Ex.album = (lesson, ctx) => {
  const pairs = lesson.album;
  const wrap = h('div', { class: 'album' });
  const notes = h('div', { class: 'album-notes' });
  let selected = null;
  let matched = 0;
  const left = h('div', { class: 'col' });
  const right = h('div', { class: 'col' });
  const clipForPair = (p) => {
    if (p.audio) return p.audio;
    const letter = lesson.letters?.find((l) => p.en.toUpperCase().startsWith(l.en));
    return letter?.audio || '';
  };
  const playTileSound = (btn) => {
    const file = btn.dataset.audio;
    if (file && typeof ClipAudio !== 'undefined') ClipAudio.play(`assets/audio/${file}`);
    else Speech.say(btn.dataset.sound, 'ru');
  };
  const pick = (btn, side) => {
    if (btn.classList.contains('ok')) return;
    if (!selected || selected.side === side) {
      wrap.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
      btn.classList.add('sel');
      selected = { btn, side };
      playTileSound(btn);
      return;
    }
    const a = selected.btn, b = btn;
    a.classList.remove('sel');
    selected = null;
    if (a.dataset.key === b.dataset.key) {
      a.classList.add('ok'); b.classList.add('ok');
      answerGood(ctx);
      const p = pairs.find((x) => x.en === a.dataset.key);
      notes.prepend(h('div', { class: 'note' }, colorize(p.en), ' ', h('span', { class: 'ru-letter' }, p.ru), ' — ', p.note));
      if (++matched === pairs.length) {
        notes.prepend(h('div', { class: 'note big' }, '— ТОЧНО! ОНИ! — закричала Оо.'));
        ctx.done();
      }
    } else {
      answerBad(ctx); shake(a); shake(b);
    }
  };
  for (const p of shuffle(pairs)) {
    const clip = clipForPair(p);
    left.append(h('button', {
      class: 'tile en', 'data-key': p.en, 'data-sound': p.ru[1], 'data-audio': clip,
      type: 'button', onclick: (e) => pick(e.currentTarget, 'en'),
    }, colorize(p.en)));
  }
  for (const p of shuffle(pairs)) {
    const clip = clipForPair(p);
    right.append(h('button', {
      class: 'tile ru', 'data-key': p.en, 'data-sound': p.ru[1], 'data-audio': clip,
      type: 'button', onclick: (e) => pick(e.currentTarget, 'ru'),
    }, p.ru));
  }
  wrap.append(left, right);
  return h('div', null,
    h('p', { class: 'task' }, 'Буква Аа достала свой семейный альбом. Найди каждой английской букве её русскую родственницу!'),
    wrap, notes);
};

Ex.vowelTable = (lesson, ctx) => {
  const seen = new Set();
  const rows = lesson.letters.map((l) => h('button', {
    class: 'vowel-row', type: 'button',
    onclick: (e) => {
      const btn = e.currentTarget;
      if (btn.classList.contains('seen')) return;
      btn.classList.add('seen');
      seen.add(l.en);
      if (seen.size === lesson.letters.length) ctx.done();
      if (l.audio && typeof ClipAudio !== 'undefined') {
        ClipAudio.play(`assets/audio/${l.audio}`);
      } else Speech.say(l.sound, 'ru');
    },
  },
  h('span', { class: 'big v' }, l.en + l.en.toLowerCase()),
  h('span', { class: 'tr' }, `[${l.sound}]`),
  h('span', { class: 'big ru-letter' }, l.ru + l.ru.toLowerCase())));
  return h('div', null,
    h('p', { class: 'task' }, 'Это наша команда гласных. Нажми на каждую строчку и послушай, как звучит буква.'),
    h('div', { class: 'vowel-table' }, rows));
};

Ex.paintVowels = (ctx) => {
  const letters = shuffle(['A', 'O', 'E', 'I', 'U', 'a', 'o', 'e', 'i', 'u', 'N', 'M', 'R', 'L', 'T', 'D', 'B', 'S', 'n', 'm', 'r', 'l', 't', 'd']);
  let left = letters.filter((l) => VOWELS.has(l)).length;
  const grid = h('div', { class: 'paint-grid' }, letters.map((ch) => h('button', {
    class: 'paint-cell', type: 'button',
    onclick: (e) => {
      const b = e.currentTarget;
      if (b.classList.contains('red')) return;
      if (VOWELS.has(ch)) {
        b.classList.add('red'); answerGood(ctx);
        if (--left === 0) ctx.done();
      } else {
        answerBad(ctx); shake(b);
      }
    },
  }, ch)));
  return h('div', null,
    h('p', { class: 'task' }, 'РАСКРАСИМ! Гласные, значит красные. Нажми на все гласные буквы, чтобы раскрасить их в красный цвет.'),
    grid);
};

function hintListenButton(lesson) {
  if (!lesson.hintAudio) return null;
  const clips = Array.isArray(lesson.hintAudio) ? lesson.hintAudio : [lesson.hintAudio];
  return h('button', {
    class: 'listen', type: 'button', title: 'Послушать',
    onclick: async (e) => {
      e.stopPropagation();
      if (typeof ClipAudio === 'undefined') {
        Speech.say(lesson.hint, 'ru');
        return;
      }
      for (const c of clips) {
        await ClipAudio.playThrough(`assets/audio/${c}`);
      }
    },
  }, '🔊', h('span', null, 'Запись'));
}

Ex.letterIntro = (lesson, learned, ctx) => {
  ctx.done();
  return h('div', { class: 'letter-intro' },
    h('div', { class: 'letter-cards' }, lesson.letters.map((l) => h('button', {
      class: 'letter-card', type: 'button',
      onclick: () => Speech.say(l.ru.split(' / ')[0], 'ru'),
    },
    h('div', { class: 'en-big' }, colorize(l.en.length > 1 ? l.en : l.en + l.en.toLowerCase())),
    h('div', { class: 'arrow' }, '⇄'),
    h('div', { class: 'ru-big' }, l.ru.length > 2 ? l.ru : l.ru + l.ru.toLowerCase())))),
    h('p', { class: 'hint' }, lesson.hint, hintListenButton(lesson)),
    lesson.rule ? h('p', { class: 'rule' }, '💡 ', lesson.rule) : null,
    lesson.besideImage
      ? h('div', { class: 'lesson-pics' }, pic(lesson.image, 'lesson-img'), pic(lesson.besideImage, 'lesson-img'))
      : pic(lesson.image, 'lesson-img'),
    h('div', { class: 'team' },
      h('div', { class: 'team-title' }, 'Наша команда букв'),
      teamStrip(learned, lesson.letters.map((l) => l.en))));
};

function teamStrip(learned, fresh = []) {
  return h('div', { class: 'strip' }, learned.map((l) =>
    h('span', { class: ['strip-l', VOWELS.has(l) ? 'v' : 'c', fresh.includes(l) ? 'new' : ''].join(' ') }, l)));
}

Ex.syllableTable = (syllables, ctx) => {
  const seen = new Set();
  const rows = syllables.map((s, i) => h('button', {
    class: 'syl-row', type: 'button',
    onclick: (e) => {
      const btn = e.currentTarget;
      if (btn.classList.contains('seen')) return;
      btn.classList.add('seen');
      seen.add(i);
      if (seen.size === syllables.length) ctx.done();
      if (s.audio && typeof ClipAudio !== 'undefined') {
        ClipAudio.play(`assets/audio/${s.audio}`);
      } else Speech.say(s.ru, 'ru');
    },
  },
  h('span', { class: 'ru-syl' }, s.ru),
  h('span', { class: 'en-syl' }, colorize(s.en)),
  h('span', { class: 'en-syl low' }, colorize(s.enLow != null ? s.enLow : s.en.toLowerCase()))));
  return h('div', null,
    h('p', { class: 'task' }, 'Читаем слоги! Нажми на каждый слог и повтори вслух.'),
    h('div', { class: 'syl-table' }, rows));
};

// Универсальная викторина: вопросы по очереди, неверный ответ — тряска и ещё одна попытка.
Ex.quiz = (questions, ctx, intro) => {
  let i = 0;
  const box = h('div', { class: 'quiz' });
  const counter = h('div', { class: 'quiz-counter' });
  const render = () => {
    box.innerHTML = '';
    if (i >= questions.length) {
      box.append(h('div', { class: 'quiz-done' }, '🎉 Молодец! Все ответы верные.'));
      ctx.done();
      return;
    }
    const q = questions[i];
    counter.textContent = `Вопрос ${i + 1} из ${questions.length}`;
    if (q.say) {
      setTimeout(() => {
        if (q.sayAudioClips?.length && typeof ClipAudio !== 'undefined') {
          (async () => {
            for (const c of q.sayAudioClips) await ClipAudio.playThrough(`assets/audio/${c}`);
          })();
        } else if (q.sayAudio && typeof ClipAudio !== 'undefined') ClipAudio.playThrough(`assets/audio/${q.sayAudio}`);
        else Speech.say(q.say, q.sayLang || 'en');
      }, 250);
    }
    const qClips = q.sayAudioClips || (q.sayAudio ? [q.sayAudio] : null);
    box.append(
      h('div', { class: 'quiz-q' }, q.prompt, q.say ? listenBtn(q.say, q.sayLang || 'en', null, qClips) : null),
      h('div', { class: 'quiz-options' + (q.big ? ' big' : '') }, shuffle(q.options).map((opt) => h('button', {
        class: 'option', type: 'button',
        onclick: (e) => {
          const b = e.currentTarget;
          if (opt.key === q.answer) {
            b.classList.add('ok');
            box.querySelectorAll('.option').forEach((x) => { x.disabled = true; });
            answerGood(ctx).then(() => { i++; render(); });
          } else {
            b.classList.add('bad'); b.disabled = true; answerBad(ctx); shake(b);
          }
        },
      }, opt.label))));
  };
  render();
  return h('div', null, intro ? h('p', { class: 'task' }, intro) : null, counter, box);
};

Ex.syllableQuiz = (lesson, ctx) => {
  const all = lesson.syllables;
  const qs = sample(all, Math.min(5, all.length)).map((s, n) => {
    const others = sample(all.filter((x) => x !== s), 2);
    const opts = [s, ...others];
    const clip = s.audio;
    return n % 2 === 0
      ? {
        prompt: h('span', { class: 'q-big' }, colorize(s.en)),
        answer: s.en,
        say: s.en,
        sayLang: 'en',
        sayAudio: clip,
        options: opts.map((o) => ({ key: o.en, label: o.ru })),
      }
      : {
        prompt: h('span', null, 'Найди слог ', h('b', { class: 'q-big ru' }, s.ru)),
        say: s.ru,
        sayLang: 'ru',
        sayAudio: clip,
        answer: s.en,
        options: opts.map((o) => ({ key: o.en, label: colorize(o.en) })),
        big: true,
      };
  });
  return Ex.quiz(qs, ctx, 'Как читается слог? Выбери правильный ответ.');
};

Ex.wordCards = (words, ctx) => {
  const seen = new Set();
  const cards = words.map((wd, i) => h('button', {
    class: 'word-card', type: 'button',
    onclick: (e) => {
      playWordAudio(wd);
      e.currentTarget.classList.add('flipped');
      seen.add(i);
      if (seen.size === words.length) ctx.done();
    },
  },
  h('div', { class: 'wc-en' }, colorize(wd.en)),
  h('div', { class: 'wc-low' }, colorize(wordDisplay(wd))),
  h('div', { class: 'wc-ru' }, wd.ru)));
  return h('div', null,
    h('p', { class: 'task' }, 'Новые слова. Нажми на каждую карточку: послушай слово и узнай, что оно значит.'),
    h('div', { class: 'word-grid' }, cards));
};

Ex.reading = (lesson, ctx) => {
  ctx.done();
  return h('div', { class: 'reading' },
    h('p', { class: 'task' }, 'Читаем! Английские слова можно нажать: ты услышишь слово и увидишь перевод.'),
    lesson.textAudio ? h('div', { class: 'print-row' },
      h('button', {
        class: 'btn ghost', type: 'button',
        onclick: () => ClipAudio.playThrough(`assets/audio/${lesson.textAudio}`),
      }, '🔊 Послушай текст урока')) : null,
    lesson.extraImage ? h('figure', null, pic(lesson.extraImage.name, 'lesson-img'), h('figcaption', null, colorize(lesson.extraImage.caption))) : null,
    h('div', { class: 'reading-card' }, mixedText(lesson.text, lesson)));
};

Ex.wordQuiz = (words, pool, ctx) => {
  const qs = words.map((wd) => {
    const others = sample(pool.filter((x) => x.ru !== wd.ru), 2);
    return {
      prompt: h('span', { class: 'q-big' }, colorize(wd.en)),
      say: wd.en,
      sayAudio: wd.audio,
      answer: wd.ru,
      options: [wd, ...others].map((o) => ({ key: o.ru, label: o.ru })),
    };
  });
  return Ex.quiz(qs, ctx, 'Что значит это слово?');
};

Ex.listenPick = (words, pool, ctx) => {
  const qs = words.map((wd) => {
    const others = sample(pool.filter((x) => x.en !== wd.en), 2);
    return {
      prompt: h('span', null, 'Послушай и найди слово'),
      say: wd.en,
      sayAudio: wd.audio,
      answer: wd.en,
      options: [wd, ...others].map((o) => ({ key: o.en, label: colorize(o.en) })),
      big: true,
    };
  });
  return Ex.quiz(qs, ctx, 'Нажми 🔊, послушай слово и выбери, как оно пишется.');
};

Ex.buildWords = (words, extraLetters, ctx) => {
  let i = 0;
  const box = h('div', { class: 'build' });
  const render = () => {
    box.innerHTML = '';
    if (i >= words.length) {
      box.append(h('div', { class: 'quiz-done' }, '🎉 Все слова собраны!'));
      ctx.done();
      return;
    }
    const wd = words[i];
    const target = wd.en.replace(/ /g, '');
    let pos = 0;
    const slots = [...target].map(() => h('span', { class: 'slot' }));
    const extras = sample(extraLetters.filter((l) => !target.includes(l)), Math.min(2, Math.max(0, 9 - target.length)));
    const tiles = shuffle([...target, ...extras]).map((ch) => h('button', {
      class: 'letter-tile', type: 'button',
      onclick: (e) => {
        const b = e.currentTarget;
        if (ch === target[pos]) {
          slots[pos].textContent = ch;
          slots[pos].className = 'slot filled ' + (VOWELS.has(ch) ? 'v' : 'c');
          b.classList.add('used'); b.disabled = true;
          pos++;
          if (pos === target.length) {
            answerGood(ctx).then(() => { i++; render(); });
          }
        } else {
          answerBad(ctx); shake(b);
        }
      },
    }, ch));
    box.append(
      h('div', { class: 'build-q' }, h('span', { class: 'ru-word' }, wd.ru), listenBtn(wd.en, 'en', null, wd.audio)),
      h('div', { class: 'slots' }, slots),
      h('div', { class: 'tiles' }, tiles),
      h('div', { class: 'quiz-counter' }, `Слово ${i + 1} из ${words.length}`));
  };
  render();
  return h('div', null, h('p', { class: 'task' }, 'Собери слово из букв. Нажимай буквы по порядку.'), box);
};

// Холст для прописей и рисования
Ex.canvas = (opts, ctx) => {
  const { guide = [], palette = false, minStrokes = 1 } = opts;
  const colors = ['#1e63c6', '#e53935', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#6d4c41', '#212121'];
  let color = guide.length ? '#1e63c6' : '#e53935';
  let size = guide.length ? 6 : 8;
  let erase = false;
  let strokes = 0;
  const bg = h('canvas', { class: 'pad-guide', 'aria-hidden': 'true' });
  const canvas = h('canvas', { class: 'pad' + (guide.length ? ' lined' : '') });
  const wrap = h('div', { class: 'pad-wrap' }, bg, canvas);
  const gg = bg.getContext('2d');
  const g = canvas.getContext('2d');
  const lineH = 110;
  let cssW = 0, cssH = 0;

  const sizeCanvas = (el, ctx2d) => {
    const dpr = window.devicePixelRatio || 1;
    el.width = cssW * dpr;
    el.height = cssH * dpr;
    el.style.height = cssH + 'px';
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawGuide = () => {
    gg.setTransform((window.devicePixelRatio || 1), 0, 0, (window.devicePixelRatio || 1), 0, 0);
    gg.fillStyle = '#fff';
    gg.fillRect(0, 0, cssW, cssH);
    if (!guide.length) return;
    guide.forEach((line, n) => {
      const top = n * lineH + 18;
      const base = top + 72;
      gg.strokeStyle = '#9ccc65'; gg.lineWidth = 1.5; gg.setLineDash([]);
      gg.beginPath(); gg.moveTo(10, top); gg.lineTo(cssW - 10, top); gg.moveTo(10, base); gg.lineTo(cssW - 10, base); gg.stroke();
      gg.strokeStyle = '#c5e1a5'; gg.setLineDash([6, 6]);
      gg.beginPath(); gg.moveTo(10, top + 30); gg.lineTo(cssW - 10, top + 30); gg.stroke();
      gg.setLineDash([]);
      let fontSize = 72;
      gg.font = `600 ${fontSize}px Nunito, Arial, sans-serif`;
      while (gg.measureText(line).width > cssW - 40 && fontSize > 30) {
        fontSize -= 4;
        gg.font = `600 ${fontSize}px Nunito, Arial, sans-serif`;
      }
      const xTop = top + 30;
      const baseline = base - 4;
      const guideChar = (ch, x) => {
        const fill = VOWELS.has(ch) ? 'rgba(229,57,53,0.35)' : 'rgba(30,99,198,0.28)';
        if (typeof PropisGlyphs !== 'undefined' && PropisGlyphs.has(ch)) {
          PropisGlyphs.draw(gg, ch, x, baseline, fontSize, fill, xTop);
          return PropisGlyphs.width(ch, xTop, baseline);
        }
        gg.fillStyle = fill;
        gg.fillText(ch, x, baseline);
        return gg.measureText(ch).width;
      };
      const text = line.trim();
      if (text.length <= 2 && !/\s/.test(text)) {
        const w = (typeof PropisGlyphs !== 'undefined' && PropisGlyphs.has(text))
          ? PropisGlyphs.width(text, xTop, baseline) : gg.measureText(text).width;
        guideChar(text, (cssW - w) / 2);
      } else {
        let x = 20;
        for (const ch of line) {
          x += guideChar(ch, x);
        }
      }
    });
  };

  const clearInk = () => {
    g.setTransform((window.devicePixelRatio || 1), 0, 0, (window.devicePixelRatio || 1), 0, 0);
    g.clearRect(0, 0, cssW, cssH);
  };

  const paintInk = (from, to) => {
    g.save();
    if (erase) {
      g.globalCompositeOperation = 'destination-out';
      g.strokeStyle = '#000';
      g.fillStyle = '#000';
      g.lineWidth = size * 3;
    } else {
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = size;
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (!to) {
      g.beginPath();
      g.arc(from.x, from.y, g.lineWidth / 2, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(from.x, from.y);
      g.lineTo(to.x, to.y);
      g.stroke();
    }
    g.restore();
  };

  const setup = () => {
    cssW = wrap.clientWidth || 600;
    cssH = guide.length ? guide.length * lineH + 20 : Math.min(420, Math.round(cssW * 0.7));
    sizeCanvas(bg, gg);
    sizeCanvas(canvas, g);
    drawGuide();
    clearInk();
  };
  requestAnimationFrame(setup);

  let drawing = false, last = null;
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    const k = r.width ? canvas.clientWidth / r.width : 1;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  canvas.addEventListener('pointerdown', (e) => {
    drawing = true; last = point(e); canvas.setPointerCapture(e.pointerId);
    paintInk(last);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = point(e);
    paintInk(last, p);
    last = p;
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    if (!erase && ++strokes >= minStrokes) ctx.done();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  const swatches = h('div', { class: 'swatches' }, colors.map((c) => h('button', {
    class: 'swatch' + (c === color ? ' active' : ''), type: 'button', style: { background: c },
    onclick: (e) => {
      color = c; erase = false;
      swatches.querySelectorAll('.swatch, .tool').forEach((n) => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
    },
  })),
  h('button', {
    class: 'tool', type: 'button', title: 'Ластик',
    onclick: (e) => {
      erase = true;
      swatches.querySelectorAll('.swatch, .tool').forEach((n) => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
    },
  }, '🧽'),
  h('button', { class: 'tool', type: 'button', title: 'Очистить', onclick: clearInk }, '🗑️'));

  if (!palette) {
    swatches.querySelectorAll('.swatch').forEach((s, n) => { if (n > 2) s.remove(); });
  }
  return h('div', { class: 'canvas-ex' }, swatches, wrap);
};

Ex.tracing = (lines, ctx, title = 'Пропись') => h('div', null,
  h('p', { class: 'task' }, 'Пропись. Обведи буквы и слова пальцем или мышкой. Гласные можно обводить красным! А ещё пропись можно распечатать и прописать ручкой.'),
  h('div', { class: 'print-row' }, printBtn('Распечатай и пропиши', () => { Printer.propis(title, lines); ctx.done(); })),
  Ex.canvas({ guide: lines, minStrokes: 3 }, ctx));

Ex.draw = (task, ctx, lesson) => {
  const prompt = h('div', { class: 'draw-prompt' });
  const setPrompt = (wd) => {
    prompt.innerHTML = '';
    const clip = wordAudioClip(wd, lesson);
    prompt.append('Нарисуй: ', h('b', null, colorize(wd)), ' ', listenBtn(wd, 'en', null, clip));
  };
  setPrompt(task.prompts[0]);
  return h('div', null,
    h('p', { class: 'task' }, task.title + '! Когда закончишь, нажми «Дальше».'),
    task.prompts.length > 1 ? h('div', { class: 'chips' }, task.prompts.map((p) => h('button', {
      class: 'chip', type: 'button',
      onclick: () => {
        setPrompt(p);
        const c = wordAudioClip(p, lesson);
        if (c && typeof ClipAudio !== 'undefined') ClipAudio.play(`assets/audio/${c}`);
      },
    }, colorize(p)))) : null,
    prompt,
    Ex.canvas({ palette: true }, ctx));
};

// Игра «Найдём слова»: проведи по буквам слова (по строке, столбцу или диагонали).
function wordAudioClip(word, lesson) {
  const key = String(word).toUpperCase();
  if (BOOK.gridAudio?.[key]) return BOOK.gridAudio[key];
  if (!lesson) return null;
  const pool = BOOK.lessons.filter((l) => l.id <= lesson.id).flatMap((l) => l.words || []);
  const hit = pool.find((w) => w.en.toUpperCase() === key);
  return hit?.audio || null;
}

Ex.wordSearch = (cfg, ctx, image, lesson) => {
  const isSnake = !!cfg.text;
  const rows = isSnake ? null : cfg.rows;
  const cells = [];
  const found = new Set();
  const palette = ['#ef9a9a', '#a5d6a7', '#90caf9', '#fff176', '#ce93d8', '#ffcc80', '#80deea', '#f48fb1'];
  let crayon = palette[0];
  const wordCells = new Map();
  const crayons = h('div', { class: 'crayons' }, h('span', { class: 'crayons-label' }, 'Карандаш:'),
    palette.map((col, n) => h('button', {
      class: 'crayon' + (n === 0 ? ' active' : ''), type: 'button', title: 'Выбрать цвет',
      style: { '--c': col },
      onclick: (e) => {
        crayon = col;
        crayons.querySelectorAll('.crayon').forEach((x) => x.classList.remove('active'));
        e.currentTarget.classList.add('active');
        Sfx.tone([700], 0.05);
      },
    })));

  const letterAt = (r, c) => (rows[r] || '')[c];
  const exists = (word) => {
    if (isSnake) return cfg.text.includes(word);
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
      for (const [dr, dc] of dirs) {
        let k = 0;
        while (k < word.length && letterAt(r + dr * k, c + dc * k) === word[k]) k++;
        if (k === word.length) return true;
      }
    }
    return false;
  };
  const targets = uniq(cfg.words).filter(exists);

  const playGridWord = (wd) => {
    const clip = wordAudioClip(wd, lesson);
    if (clip && typeof ClipAudio !== 'undefined') ClipAudio.play(`assets/audio/${clip}`);
    else Speech.say(wd, 'en');
  };
  const list = h('div', { class: 'ws-list' }, targets.map((wd) => h('span', {
    class: 'ws-word', 'data-w': wd, role: 'button', tabindex: 0,
    onclick: () => playGridWord(wd),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playGridWord(wd); } },
  }, wd)));
  const board = h('div', { class: isSnake ? 'ws-snake' : 'ws-grid', style: isSnake ? null : { gridTemplateColumns: `repeat(${rows[0].length}, 1fr)` } });

  if (isSnake) {
    [...cfg.text].forEach((ch, i) => {
      const cell = h('span', { class: 'ws-cell', 'data-i': i }, ch);
      cells.push({ node: cell, i, ch });
      board.append(cell);
    });
  } else {
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const cell = h('span', { class: 'ws-cell', 'data-r': r, 'data-c': c }, ch);
      cells.push({ node: cell, r, c, ch });
      board.append(cell);
    }));
  }

  const cellFromEvent = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const node = el && el.closest('.ws-cell');
    return node ? cells.find((x) => x.node === node) : null;
  };
  const path = (a, b) => {
    if (isSnake) {
      const [s, t] = a.i <= b.i ? [a.i, b.i] : [b.i, a.i];
      return cells.slice(s, t + 1);
    }
    const dr = Math.sign(b.r - a.r), dc = Math.sign(b.c - a.c);
    const lr = Math.abs(b.r - a.r), lc = Math.abs(b.c - a.c);
    if (!(lr === 0 || lc === 0 || lr === lc)) return null;
    const n = Math.max(lr, lc);
    const out = [];
    for (let k = 0; k <= n; k++) out.push(cells.find((x) => x.r === a.r + dr * k && x.c === a.c + dc * k));
    return out;
  };

  let start = null, current = [];
  const paint = (sel) => {
    cells.forEach((x) => x.node.classList.remove('sel'));
    (sel || []).forEach((x) => x.node.classList.add('sel'));
  };
  let downCell = null;
  board.addEventListener('pointerdown', (e) => {
    const c = cellFromEvent(e);
    if (!c) return;
    e.preventDefault();
    downCell = c;
    start = c; current = [c]; paint(current);
  });
  board.addEventListener('pointermove', (e) => {
    if (!start) return;
    const c = cellFromEvent(e);
    if (!c) return;
    const p = path(start, c);
    if (p) { current = p; paint(current); }
  });
  const finish = () => {
    if (!start) return;
    const str = current.map((x) => x.ch).join('');
    const rev = [...str].reverse().join('');
    const hit = targets.find((t) => !found.has(t) && (t === str || t === rev));
    if (hit) {
      found.add(hit);
      wordCells.set(hit, current);
      current.forEach((x) => { x.node.classList.add('found'); x.node.style.background = crayon; });
      const chip = list.querySelector(`[data-w="${hit}"]`);
      chip.classList.add('done');
      chip.style.background = crayon;
      answerGood(ctx);
      const clip = wordAudioClip(hit, lesson);
      if (clip && typeof ClipAudio !== 'undefined') ClipAudio.play(`assets/audio/${clip}`);
      else Speech.say(hit, 'en');
      if (found.size === targets.length) {
        toast('🎉 Все слова найдены!');
        ctx.done();
      }
    } else if (current.length === 1 && downCell?.node.classList.contains('found')) {
      for (const [, group] of wordCells) {
        if (group.includes(downCell)) {
          group.forEach((x) => { x.node.style.background = crayon; });
          Sfx.tone([660], 0.06);
          break;
        }
      }
    } else if (current.length > 1) {
      answerBad(ctx);
    }
    start = null; current = []; downCell = null; paint([]);
  };
  board.addEventListener('pointerup', finish);
  board.addEventListener('pointerleave', () => { if (start) finish(); });
  board.addEventListener('pointercancel', finish);

  return h('div', null,
    h('p', { class: 'task' }, isSnake
      ? 'НАЙДИ СЛОВА И РАСКРАСЬ! Слова спрятались в одной длинной строчке. Выбери карандаш и проведи пальцем от первой буквы слова до последней.'
      : 'НАЙДИ СЛОВА В ТАБЛИЦЕ И РАСКРАСЬ! Выбери карандаш и проведи пальцем по буквам слова: по строчке, по столбику или наискосок. Нажми на найденное слово — перекрасишь его.'),
    pic(image, 'lesson-img small'),
    list,
    crayons,
    board,
    h('div', { class: 'ws-skip' },
      typeof printBtn === 'function' ? printBtn('Распечатать и раскрасить', () => Printer.wordGrid('Найди слова и раскрась', cfg)) : null,
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => ctx.done() }, 'Пропустить игру')));
};

Ex.match = (pairs, ctx, intro) => {
  let selected = null, matched = 0;
  const wrap = h('div', { class: 'album' });
  const left = h('div', { class: 'col' });
  const right = h('div', { class: 'col' });
  const pick = (btn, side) => {
    if (btn.classList.contains('ok')) return;
    if (side === 'en') {
      const key = btn.dataset.key;
      const place = pairs.find((p) => p.en === key);
      if (place?.audio && typeof ClipAudio !== 'undefined') ClipAudio.play(`assets/audio/${place.audio}`);
      else Speech.say(key, 'en');
    }
    if (!selected || selected.side === side) {
      wrap.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
      btn.classList.add('sel');
      selected = { btn, side };
      return;
    }
    const a = selected.btn;
    a.classList.remove('sel');
    selected = null;
    if (a.dataset.key === btn.dataset.key) {
      a.classList.add('ok'); btn.classList.add('ok'); answerGood(ctx);
      if (++matched === pairs.length) ctx.done();
    } else {
      answerBad(ctx); shake(a); shake(btn);
    }
  };
  shuffle(pairs).forEach((p) => left.append(h('button', { class: 'tile en small', 'data-key': p.en, type: 'button', onclick: (e) => pick(e.currentTarget, 'en') }, colorize(p.en))));
  shuffle(pairs).forEach((p) => right.append(h('button', { class: 'tile ru small', 'data-key': p.en, type: 'button', onclick: (e) => pick(e.currentTarget, 'ru') }, p.ru)));
  wrap.append(left, right);
  return h('div', null, h('p', { class: 'task' }, intro), wrap);
};

Ex.sentences = (list, ctx) => {
  ctx.done();
  return h('div', null,
    h('p', { class: 'task' }, 'Прочитай предложения сам, а потом нажми 🔊 и проверь себя. Нажми на предложение, чтобы увидеть перевод.'),
    h('div', { class: 'sentences' }, list.map((s) => {
      const tr = h('div', { class: 'sent-ru' }, s.ru);
      return h('div', { class: 'sentence', onclick: (e) => e.currentTarget.classList.toggle('open') },
        h('div', { class: 'sent-en' }, colorize(s.en)), listenBtn(s.en, 'en', null, sentenceAudioClips(s)), tr);
    })));
};

Ex.myName = (ctx) => {
  const input = h('input', { class: 'name-input', placeholder: 'Напиши своё имя по-английски', value: Store.data.name || '', maxlength: 20 });
  const out = h('div', { class: 'name-out' });
  const show = () => {
    const v = input.value.trim();
    out.innerHTML = '';
    if (!v) return;
    Store.data.name = v; Store.save();
    out.append(h('span', null, colorize(`It is ${v}.`)), listenBtn(`It is ${v}.`));
    ctx.done();
  };
  input.addEventListener('input', show);
  if (input.value) setTimeout(show);
  return h('div', null,
    h('p', { class: 'task' }, 'It is … (напиши своё имя). Используй английские буквы, которые ты уже знаешь!'),
    h('div', { class: 'name-box' }, h('span', { class: 'name-prefix' }, 'It is'), input),
    out);
};

Ex.finalQuestions = (reading, ctx) => Ex.quiz(reading.questions.map((q) => ({
  prompt: mixedText(q.q),
  answer: q.a,
  options: [q.a, ...q.wrong].map((o) => ({ key: o, label: o })),
})), ctx, 'Ответь на вопросы по тексту.');

function notifyStore() {
  window.dispatchEvent(new CustomEvent('alfabetica-store'));
}
const storeSave = Store.save.bind(Store);
Store.save = function save() {
  storeSave();
  notifyStore();
};
const storeLoad = Store.load.bind(Store);
Store.load = function load(user) {
  storeLoad(user);
  notifyStore();
};
const storeApply = Store.applyServer.bind(Store);
Store.applyServer = function applyServer(serverData) {
  storeApply(serverData);
  notifyStore();
};

window.Store = Store;
