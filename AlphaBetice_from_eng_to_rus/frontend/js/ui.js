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

const VOWELS = new Set([
  'A', 'E', 'I', 'O', 'U', 'Y', 'a', 'e', 'i', 'o', 'u', 'y',
  'А', 'О', 'Э', 'И', 'У', 'Ы', 'а', 'о', 'э', 'и', 'у', 'ы', 'Е', 'е', 'Ё', 'ё',
]);
const EN_RU = () => BOOK.direction === 'en-ru';
/** UI copy: English for FROM ENGLISH TO RUSSIAN, Russian for the RU→EN book. */
function L(ru, en) { return EN_RU() ? en : ru; }
window.L = L;

function colorize(text) {
  return h('span', { class: 'colorized' }, [...text].map((ch) =>
    (/[A-Za-z]/.test(ch) || /[А-Яа-яЁё]/.test(ch))
      ? h('span', { class: VOWELS.has(ch) ? 'v' : 'c' }, ch) : ch));
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

// Прогресс: у гостя — только в браузере, у пользователя — локальная копия + сервер.
const Store = {
  key: null,
  user: null,
  data: null,
  syncTimer: null,
  defaults: () => ({ done: {}, dates: {}, name: '', unlockAll: false, sound: true, cubeScore: 0 }),
  load(user = null) {
    this.user = user;
    this.key = user ? `alfabetica-enru-user-${user}` : 'alfabetica-enru-progress-v1';
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
    window.dispatchEvent(new Event('alfa-progress'));
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

function playKnown(text, lang) {
  const key = String(text).toUpperCase().replace(/[^A-ZА-ЯЁ]/g, '');
  const src = window.BOOK && BOOK.speak && BOOK.speak[key];
  if (src && typeof ClipAudio !== 'undefined') {
    ClipAudio.playThrough(src).then((ok) => { if (!ok) Speech.say(text, lang); });
    return;
  }
  Speech.say(text, lang);
}

function listenBtn(text, lang = 'en', label) {
  return h('button', {
    class: 'listen', title: L('Послушать', 'Listen'), type: 'button',
    onclick: (e) => { e.stopPropagation(); Speech.say(text, lang); },
  }, '🔊', label ? h('span', null, label) : null);
}

// Текст, в котором английские слова можно нажать: прозвучит слово и появится перевод.
function mixedText(text) {
  const parts = EN_RU() ? text.split(/([A-Za-z]+|[А-Яа-яЁё]+)/g) : text.split(/([A-Za-z]+)/g);
  return h('p', { class: 'mixed' }, parts.map((tok) => {
    if (/^[A-Za-z]+$/.test(tok)) {
      return h('button', {
        class: 'en-word', type: 'button',
        onclick: () => {
          Speech.say(tok, 'en');
          const hint = BOOK.glossary[tok.toLowerCase()];
          toast(h('span', null, h('b', null, tok), hint ? ` — ${hint}` : ''));
        },
      }, colorize(tok));
    }
    if (EN_RU() && /^[А-Яа-яЁё]+$/.test(tok)) {
      return h('button', {
        class: 'ru-word', type: 'button',
        onclick: () => {
          playKnown(tok, 'ru');
          const hint = BOOK.glossary[tok.toLowerCase()];
          toast(h('span', null, h('b', { class: 'ru-letter' }, tok), hint ? ` — ${hint}` : ''));
        },
      }, colorize(tok));
    }
    return tok;
  }));
}

const Ex = {};

Ex.storyPage = (page, ctx) => {
  if (page.dialogue) return Ex.dialogue(page, ctx);
  ctx.done();
  return h('div', { class: 'story' },
    page.image ? h('img', { class: 'story-img', src: img(page.image), alt: '' }) : null,
    h('div', { class: 'story-text' }, page.text.map((p) => h('p', null, highlightAO(p)))),
    h('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => Speech.say(page.text.join(' ').replace(/—/g, ''), 'ru'),
    }, L('🔊 Прочитать вслух', '🔊 Read aloud')));
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
  const pick = (btn, side) => {
    if (btn.classList.contains('ok')) return;
    if (!selected || selected.side === side) {
      wrap.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
      btn.classList.add('sel');
      selected = { btn, side };
      Speech.say(btn.dataset.sound, 'ru');
      return;
    }
    const a = selected.btn, b = btn;
    a.classList.remove('sel');
    selected = null;
    if (a.dataset.key === b.dataset.key) {
      a.classList.add('ok'); b.classList.add('ok');
      Sfx.good();
      const p = pairs.find((x) => x.en === a.dataset.key);
      notes.prepend(h('div', { class: 'note' }, colorize(p.en), ' ', h('span', { class: 'ru-letter' }, p.ru), ' — ', p.note));
      if (++matched === pairs.length) {
        notes.prepend(h('div', { class: 'note big' }, EN_RU() ? '— EXACTLY! THEY MATCH! — cried Oo.' : '— ТОЧНО! ОНИ! — закричала Оо.'));
        ctx.done();
      }
    } else {
      Sfx.bad(); ctx.mistake(); shake(a); shake(b);
    }
  };
  for (const p of shuffle(pairs)) {
    left.append(h('button', { class: 'tile en', 'data-key': p.en, 'data-sound': p.ru[1], type: 'button', onclick: (e) => pick(e.currentTarget, 'en') }, colorize(p.en)));
  }
  for (const p of shuffle(pairs)) {
    right.append(h('button', { class: 'tile ru', 'data-key': p.en, 'data-sound': p.ru[1], type: 'button', onclick: (e) => pick(e.currentTarget, 'ru') }, p.ru));
  }
  wrap.append(left, right);
  return h('div', null,
    h('p', { class: 'task' }, EN_RU()
      ? 'Match each Latin letter with its Cyrillic friend — like in the family album!'
      : 'Буква Аа достала свой семейный альбом. Найди каждой английской букве её русскую родственницу!'),
    wrap, notes);
};

Ex.vowelTable = (lesson, ctx) => {
  const seen = new Set();
  const rows = lesson.letters.map((l) => h('button', {
    class: 'vowel-row', type: 'button',
    onclick: (e) => {
      Speech.say(l.sound, 'ru');
      e.currentTarget.classList.add('seen');
      seen.add(l.en);
      if (seen.size === lesson.letters.length) ctx.done();
    },
  },
  h('span', { class: 'big v' }, l.pair || (l.en + l.en.toLowerCase())),
  h('span', { class: 'tr' }, `[${l.sound}]`)));
  return h('div', null,
    h('p', { class: 'task' }, L('Это наша команда гласных. Нажми на каждую строчку и послушай, как звучит буква.', 'Our vowel team. Tap each row and listen to the sound.')),
    h('div', { class: 'vowel-table' }, rows));
};

Ex.paintVowels = (ctx) => {
  const base = EN_RU()
    ? ['A', 'O', 'Э', 'Ы', 'И', 'У', 'а', 'о', 'э', 'ы', 'и', 'у', 'N', 'T', 'K', 'S', 'Н', 'Т', 'К', 'С']
    : ['A', 'O', 'E', 'I', 'U', 'a', 'o', 'e', 'i', 'u', 'N', 'M', 'R', 'L', 'T', 'D', 'B', 'S', 'n', 'm', 'r', 'l', 't', 'd'];
  const letters = shuffle(base);
  let left = letters.filter((l) => VOWELS.has(l)).length;
  const grid = h('div', { class: 'paint-grid' }, letters.map((ch) => h('button', {
    class: 'paint-cell', type: 'button',
    onclick: (e) => {
      const b = e.currentTarget;
      if (b.classList.contains('red')) return;
      if (VOWELS.has(ch)) {
        b.classList.add('red'); Sfx.good();
        if (--left === 0) ctx.done();
      } else {
        Sfx.bad(); ctx.mistake(); shake(b);
      }
    },
  }, ch)));
  return h('div', null,
    h('p', { class: 'task' }, EN_RU()
      ? 'Color the vowels red! Tap every vowel — Latin and Cyrillic.'
      : 'РАСКРАСИМ! Гласные, значит красные. Нажми на все гласные буквы, чтобы раскрасить их в красный цвет.'),
    grid);
};

Ex.letterIntro = (lesson, learned, ctx) => {
  ctx.done();
  return h('div', { class: 'letter-intro' },
    h('div', { class: 'letter-cards' }, lesson.letters.map((l) => h('button', {
      class: 'letter-card', type: 'button',
      onclick: () => Speech.say(EN_RU() ? l.ru : l.ru.split(' / ')[0], 'ru'),
    },
    h('div', { class: 'en-big' }, colorize(l.en.length > 1 ? l.en : l.en + l.en.toLowerCase())),
    h('div', { class: 'arrow' }, '⇄'),
    h('div', { class: 'ru-big' }, l.ru.length > 2 ? l.ru : l.ru + l.ru.toLowerCase())))),
    h('p', { class: 'hint' }, lesson.hint),
    lesson.rule ? h('p', { class: 'rule' }, '💡 ', lesson.rule) : null,
    lesson.image ? h('img', { class: 'lesson-img', src: img(lesson.image), alt: '' }) : null,
    h('div', { class: 'team' },
      h('div', { class: 'team-title' }, L('Наша команда букв', 'Our letter team')),
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
      if (s.audio && typeof ClipAudio !== 'undefined') {
        ClipAudio.playThrough(s.audio).then((ok) => { if (!ok) Speech.say(s.ru, 'ru'); });
      } else Speech.say(s.ru, 'ru');
      e.currentTarget.classList.add('seen');
      seen.add(i);
      if (seen.size === syllables.length) ctx.done();
    },
  },
  h('span', { class: 'ru-syl' }, colorize(s.ru)),
  h('span', { class: 'en-syl low' }, s.sound ? `[${s.sound}]` : ''),
  h('span', { class: 'en-syl' }, colorize(s.pair || s.en))));
  return h('div', null,
    h('p', { class: 'task' }, L(
      '1. Выучи таблицу слогов наизусть и запиши в тетрадь. Нажми каждый слог и прочитай вслух.',
      '1. Learn by heart the syllable table! Write it down into your copybook. Tap each syllable and read it aloud.')),
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
      box.append(h('div', { class: 'quiz-done' }, L('🎉 Молодец! Все ответы верные.', '🎉 Great job! All answers correct.')));
      ctx.done();
      return;
    }
    const q = questions[i];
    counter.textContent = L(`Вопрос ${i + 1} из ${questions.length}`, `Question ${i + 1} of ${questions.length}`);
    if (q.say) setTimeout(() => Speech.say(q.say, q.sayLang || 'en'), 250);
    box.append(
      h('div', { class: 'quiz-q' }, q.prompt, q.say ? listenBtn(q.say, q.sayLang || 'en') : null),
      h('div', { class: 'quiz-options' + (q.big ? ' big' : '') }, shuffle(q.options).map((opt) => h('button', {
        class: 'option', type: 'button',
        onclick: (e) => {
          const b = e.currentTarget;
          if (opt.key === q.answer) {
            b.classList.add('ok'); Sfx.good();
            box.querySelectorAll('.option').forEach((x) => { x.disabled = true; });
            setTimeout(() => { i++; render(); }, 700);
          } else {
            b.classList.add('bad'); b.disabled = true; Sfx.bad(); ctx.mistake(); shake(b);
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
    const mark = (o) => (o.pair ? `${o.pair}[${o.sound}]` : o.en);
    return n % 2 === 0
      ? { prompt: h('span', { class: 'q-big' }, colorize(s.ru)), answer: s.ru, options: opts.map((o) => ({ key: o.ru, label: mark(o) })) }
      : { prompt: h('span', { class: 'q-big' }, mark(s)), say: s.ru, sayLang: 'ru', answer: s.ru, options: opts.map((o) => ({ key: o.ru, label: colorize(o.ru) })), big: true };
  });
  return Ex.quiz(qs, ctx, L('Как читается слог? Выбери правильный ответ.', 'How do you read this syllable? Pick the right answer.'));
};

Ex.wordCards = (words, ctx) => {
  const seen = new Set();
  const cards = words.map((wd, i) => h('button', {
    class: 'word-card', type: 'button',
    onclick: (e) => {
      if (wd.audio && typeof ClipAudio !== 'undefined') {
        ClipAudio.playThrough(wd.audio).then((ok) => {
          if (!ok) Speech.say(wd.cyr || wd.en, wd.cyr ? 'ru' : 'en');
        });
      } else if (EN_RU() && wd.cyr) {
        Speech.say(wd.cyr, 'ru');
        setTimeout(() => Speech.say(wd.en, 'en'), 600);
      } else Speech.say(wd.en, 'en');
      e.currentTarget.classList.add('flipped');
      seen.add(i);
      if (seen.size === words.length) ctx.done();
    },
  },
  h('div', { class: 'wc-en' }, colorize(wd.en)),
  h('div', { class: 'wc-low' }, colorize(wd.cyr || wordDisplay(wd))),
  h('div', { class: 'wc-ru show' }, colorize(wd.ru || ''))));
  return h('div', null,
    h('p', { class: 'task' }, EN_RU()
      ? '2. Read. Tap each line and read it aloud.'
      : '2. Читаем. Нажми на каждую строку и прочитай вслух.'),
    h('div', { class: 'word-grid' }, cards));
};

Ex.remember = (pairs, ctx, title = 'Remember!') => {
  const flat = pairs.map(([cyr, en]) => ({ cyr, en, key: cyr }));
  const small = flat.some((p) => p.cyr.length > 8 || p.en.length > 12);
  let matched = 0;
  const wrap = h('div', { class: 'album remember' });
  const left = h('div', { class: 'col' });
  const right = h('div', { class: 'col' });
  let selected = null;
  const pick = (btn, side) => {
    if (btn.classList.contains('ok')) return;
    if (side === 'cyr') playKnown(btn.dataset.key, 'ru');
    if (!selected || selected.side === side) {
      wrap.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
      btn.classList.add('sel');
      selected = { btn, side };
      return;
    }
    const a = selected.btn; const b = btn;
    a.classList.remove('sel'); selected = null;
    if (a.dataset.key === b.dataset.key) {
      a.classList.add('ok'); b.classList.add('ok'); Sfx.good();
      if (++matched === flat.length) ctx.done();
    } else { Sfx.bad(); ctx.mistake(); shake(a); shake(b); }
  };
  for (const p of shuffle(flat)) {
    left.append(h('button', { class: 'tile ru' + (small ? ' small' : ''), type: 'button', 'data-key': p.key, onclick: (e) => pick(e.currentTarget, 'cyr') }, p.cyr));
  }
  for (const p of shuffle(flat)) {
    right.append(h('button', { class: 'tile en' + (small ? ' small' : ''), type: 'button', 'data-key': p.key, onclick: (e) => pick(e.currentTarget, 'en') }, p.en));
  }
  wrap.append(left, right);
  return h('div', null,
    h('p', { class: 'task' }, title),
    wrap);
};

Ex.vowelExamples = (examples, ctx) => {
  const seen = new Set();
  const rows = examples.map((ex, i) => h('button', {
    class: 'vowel-row', type: 'button',
    onclick: () => {
      const vowelClip = {
        'a:': 'assets/audio/vowels/a.m4a',
        o: 'assets/audio/vowels/o.m4a',
        e: 'assets/audio/vowels/e.m4a',
        'ɪ': 'assets/audio/vowels/i.m4a',
        u: 'assets/audio/vowels/u.m4a',
      }[ex.sound];
      const speakWords = () => {
        Speech.say(ex.en, 'en');
        setTimeout(() => Speech.say(ex.ru, 'ru'), 500);
      };
      if (ex.audio && typeof ClipAudio !== 'undefined') ClipAudio.playThrough(ex.audio);
      else if (vowelClip && typeof ClipAudio !== 'undefined') ClipAudio.playThrough(vowelClip).then(speakWords);
      else speakWords();
      seen.add(i);
      if (seen.size === examples.length) ctx.done();
    },
  },
  h('span', { class: 'big v' }, colorize(ex.pair || ex.en)),
  ex.sound ? h('span', { class: 'tr' }, ` [${ex.sound}]  `) : null,
  h('span', { class: 'big' }, colorize(ex.en)),
  h('span', null, ' · '),
  h('span', { class: 'ru-letter big' }, ex.ru)));
  return h('div', null,
    h('p', { class: 'task' }, 'Look! Tap each vowel, then the word pair from the book.'),
    h('div', { class: 'vowel-table' }, rows));
};

Ex.reading = (lesson, ctx) => {
  ctx.done();
  return h('div', { class: 'reading' },
    h('p', { class: 'task' }, EN_RU()
      ? '3. Read. Tap a word to hear it.'
      : '3. Читаем. Нажми на слово, чтобы услышать его.'),
    lesson.extraImage ? h('figure', null, h('img', { class: 'lesson-img', src: img(lesson.extraImage.name), alt: '' }), h('figcaption', null, colorize(lesson.extraImage.caption))) : null,
    h('div', { class: 'reading-card' }, mixedText(lesson.text)),
    lesson.textAudio ? h('button', {
      class: 'btn primary', type: 'button',
      onclick: () => {
        if (typeof ClipAudio !== 'undefined') ClipAudio.playThrough(lesson.textAudio);
      },
    }, L('🔊 Послушать текст', '🔊 Listen')) : null);
};

Ex.readFive = (text, ctx, audio) => {
  let n = 0;
  const dots = h('div', { class: 'read-dots' });
  const label = h('span', null, '0 / 5');
  const paint = () => {
    label.textContent = `${n} / 5`;
    dots.replaceChildren(...[1, 2, 3, 4, 5].map((i) => h('span', { class: i <= n ? 'on' : '' }, '●')));
  };
  paint();
  return h('div', { class: 'read-five' },
    h('p', { class: 'task' }, L(
      'Прочитай вслух 5 раз. Кнопка произнесёт текст, если хочешь свериться.',
      'Read aloud 5 times. The button speaks the text if you want to check.')),
    h('div', { class: 'reading-card' }, mixedText(text)),
    h('div', { class: 'read-five-row' },
      dots,
      label,
      h('button', {
        class: 'btn primary', type: 'button',
        onclick: () => {
          if (audio && typeof ClipAudio !== 'undefined') ClipAudio.playThrough(audio);
          else Speech.say(text, 'ru', { rate: 0.85 });
          if (n < 5) n += 1;
          paint();
          if (n >= 5) ctx.done();
        },
      }, L('Прочитал(а)', 'I read it'))));
};

Ex.wordQuiz = (words, pool, ctx) => {
  const qs = words.map((wd) => {
    const others = sample(pool.filter((x) => x !== wd), 2);
    if (EN_RU() && wd.cyr) {
      return {
        prompt: h('span', { class: 'q-big' }, colorize(wd.en)),
        say: wd.en,
        answer: wd.cyr,
        options: [wd, ...others].map((o) => ({ key: o.cyr || o.ru, label: o.cyr || o.ru })),
      };
    }
    return {
      prompt: h('span', { class: 'q-big' }, colorize(wd.en)),
      say: wd.en,
      answer: wd.ru,
      options: [wd, ...others].map((o) => ({ key: o.ru, label: o.ru })),
    };
  });
  return Ex.quiz(qs, ctx, EN_RU() ? 'How do you write it in Cyrillic?' : 'Что значит это слово?');
};

Ex.listenPick = (words, pool, ctx) => {
  const qs = words.map((wd) => {
    const others = sample(pool.filter((x) => x !== wd), 2);
    if (EN_RU() && wd.cyr) {
      return {
        prompt: h('span', null, 'Listen and find the Cyrillic word'),
        say: wd.cyr,
        sayLang: 'ru',
        answer: wd.cyr,
        options: [wd, ...others].map((o) => ({ key: o.cyr || o.en, label: colorize(o.cyr || o.en) })),
        big: true,
      };
    }
    return {
      prompt: h('span', null, 'Послушай и найди слово'),
      say: wd.en,
      answer: wd.en,
      options: [wd, ...others].map((o) => ({ key: o.en, label: colorize(o.en) })),
      big: true,
    };
  });
  return Ex.quiz(qs, ctx, EN_RU() ? 'Press 🔊, listen, and pick the Cyrillic spelling.' : 'Нажми 🔊, послушай слово и выбери, как оно пишется.');
};

Ex.buildWords = (words, extraLetters, ctx) => {
  let i = 0;
  const box = h('div', { class: 'build' });
  const render = () => {
    box.innerHTML = '';
    if (i >= words.length) {
      box.append(h('div', { class: 'quiz-done' }, L('🎉 Все слова собраны!', '🎉 All words built!')));
      ctx.done();
      return;
    }
    const wd = words[i];
    const target = (EN_RU() && wd.cyr ? wd.cyr : wd.en).replace(/ /g, '');
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
            Sfx.good();
            Speech.say(wd.en, 'en');
            setTimeout(() => { i++; render(); }, 1100);
          }
        } else {
          Sfx.bad(); ctx.mistake(); shake(b);
        }
      },
    }, ch));
    box.append(
      h('div', { class: 'build-q' }, h('span', { class: 'ru-word' }, wd.ru), listenBtn(wd.en)),
      h('div', { class: 'slots' }, slots),
      h('div', { class: 'tiles' }, tiles),
      h('div', { class: 'quiz-counter' }, L(`Слово ${i + 1} из ${words.length}`, `Word ${i + 1} of ${words.length}`)));
  };
  render();
  return h('div', null, h('p', { class: 'task' }, L('Собери слово из букв. Нажимай буквы по порядку.', 'Build the word from letters. Tap in order.')), box);
};

// Холст для прописей и рисования
Ex.canvas = (opts, ctx) => {
  const { guide = [], palette = false, minStrokes = 1 } = opts;
  const colors = ['#1e63c6', '#e53935', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#6d4c41', '#212121'];
  let color = guide.length ? '#1e63c6' : '#e53935';
  let size = guide.length ? 6 : 8;
  let erase = false;
  let strokes = 0;
  const canvas = h('canvas', { class: 'pad' + (guide.length ? ' lined' : '') });
  const wrap = h('div', { class: 'pad-wrap' }, canvas);
  const g = canvas.getContext('2d');
  const lineH = 110;
  let cssW = 0, cssH = 0;

  const drawGuide = () => {
    const dpr = window.devicePixelRatio || 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cssW, cssH);
    if (!guide.length) return;
    guide.forEach((line, n) => {
      const top = n * lineH + 18;
      const base = top + 72;
      g.strokeStyle = '#9ccc65'; g.lineWidth = 1.5; g.setLineDash([]);
      g.beginPath(); g.moveTo(10, top); g.lineTo(cssW - 10, top); g.moveTo(10, base); g.lineTo(cssW - 10, base); g.stroke();
      g.strokeStyle = '#c5e1a5'; g.setLineDash([6, 6]);
      g.beginPath(); g.moveTo(10, top + 30); g.lineTo(cssW - 10, top + 30); g.stroke();
      g.setLineDash([]);
      let fontSize = 72;
      g.font = `600 ${fontSize}px Nunito, Arial, sans-serif`;
      while (g.measureText(line).width > cssW - 40 && fontSize > 30) {
        fontSize -= 4;
        g.font = `600 ${fontSize}px Nunito, Arial, sans-serif`;
      }
      let x = 20;
      for (const ch of line) {
        g.fillStyle = VOWELS.has(ch) ? 'rgba(229,57,53,0.22)' : 'rgba(30,99,198,0.2)';
        g.fillText(ch, x, base - 4);
        x += g.measureText(ch).width;
      }
    });
  };

  const setup = () => {
    const dpr = window.devicePixelRatio || 1;
    cssW = wrap.clientWidth || 600;
    cssH = guide.length ? guide.length * lineH + 20 : Math.min(420, Math.round(cssW * 0.7));
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = cssH + 'px';
    drawGuide();
  };
  requestAnimationFrame(setup);

  let drawing = false, last = null;
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (e) => {
    drawing = true; last = point(e); canvas.setPointerCapture(e.pointerId);
    g.beginPath(); g.arc(last.x, last.y, size / 2, 0, Math.PI * 2);
    g.fillStyle = erase ? '#fff' : color; g.fill();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = point(e);
    g.strokeStyle = erase ? '#fff' : color;
    g.lineWidth = erase ? size * 3 : size;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
    last = p;
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    if (++strokes >= minStrokes) ctx.done();
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
    class: 'tool', type: 'button', title: L('Ластик', 'Eraser'),
    onclick: (e) => {
      erase = true;
      swatches.querySelectorAll('.swatch, .tool').forEach((n) => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
    },
  }, '🧽'),
  h('button', { class: 'tool', type: 'button', title: L('Очистить', 'Clear'), onclick: drawGuide }, '🗑️'));

  if (!palette) {
    swatches.querySelectorAll('.swatch').forEach((s, n) => { if (n > 2) s.remove(); });
  }
  return h('div', { class: 'canvas-ex' }, swatches, wrap);
};

Ex.tracing = (lines, ctx, title = L('Пропись', 'Tracing')) => h('div', null,
  h('p', { class: 'task' }, L(
    'Пропись. Обведи буквы и слова пальцем или мышкой. Гласные можно обводить красным! А ещё пропись можно распечатать и прописать ручкой.',
    'Trace the letters with your finger or mouse. Vowels can be red! You can also print the sheet and write with a pencil.')),
  h('div', { class: 'print-row' }, printBtn(L('Распечатай и пропиши', 'Print and trace'), () => { Printer.propis(title, lines); ctx.done(); })),
  Ex.canvas({ guide: lines, minStrokes: 3 }, ctx));

Ex.draw = (task, ctx) => {
  const prompt = h('div', { class: 'draw-prompt' });
  const setPrompt = (wd) => {
    prompt.innerHTML = '';
    prompt.append(L('Нарисуй: ', 'Draw: '), h('b', null, colorize(wd)), ' ', listenBtn(wd));
  };
  setPrompt(task.prompts[0]);
  return h('div', null,
    h('p', { class: 'task' }, task.title + '! ' + L('Когда закончишь, нажми «Дальше».', 'When you are done, tap Next.')),
    task.prompts.length > 1 ? h('div', { class: 'chips' }, task.prompts.map((p) => h('button', { class: 'chip', type: 'button', onclick: () => setPrompt(p) }, colorize(p)))) : null,
    prompt,
    Ex.canvas({ palette: true }, ctx));
};

// Игра «Найдём слова»: проведи по буквам слова (по строке, столбцу или диагонали).
Ex.wordSearch = (cfg, ctx, image) => {
  const isSnake = !!cfg.text;
  const rows = isSnake ? null : cfg.rows;
  const cells = [];
  const found = new Set();
  const palette = ['#ef9a9a', '#a5d6a7', '#90caf9', '#fff176', '#ce93d8', '#ffcc80', '#80deea', '#f48fb1'];
  let crayon = palette[0];
  const wordCells = new Map();
  const crayons = h('div', { class: 'crayons' }, h('span', { class: 'crayons-label' }, L('Карандаш:', 'Crayon:')),
    palette.map((col, n) => h('button', {
      class: 'crayon' + (n === 0 ? ' active' : ''), type: 'button', title: L('Выбрать цвет', 'Pick color'),
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

  const list = h('div', { class: isSnake ? 'ws-list' : 'cw-clues' }, targets.map((wd) => h('span', {
    class: isSnake ? 'ws-word' : 'cw-clue',
    'data-w': wd,
  }, wd)));
  const board = h('div', {
    class: isSnake ? 'ws-snake' : 'cw-grid ws-grid',
    style: isSnake ? null : { gridTemplateColumns: `repeat(${rows[0].length}, 1fr)` },
  });

  if (isSnake) {
    [...cfg.text].forEach((ch, i) => {
      const cell = h('span', { class: 'ws-cell', 'data-i': i }, ch);
      cells.push({ node: cell, i, ch });
      board.append(cell);
    });
  } else {
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const cell = h('span', { class: 'cw-cell ws-cell', 'data-r': r, 'data-c': c }, ch);
      cells.push({ node: cell, r, c, ch });
      board.append(cell);
    }));
  }

  const cellFromEvent = (e) => {
    const direct = e.target && e.target.closest && e.target.closest('.ws-cell');
    const el = direct || document.elementFromPoint(e.clientX, e.clientY);
    const node = el && el.closest ? el.closest('.ws-cell') : null;
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
    for (let k = 0; k <= n; k++) {
      const cell = cells.find((x) => x.r === a.r + dr * k && x.c === a.c + dc * k);
      if (!cell) return null;
      out.push(cell);
    }
    return out;
  };
  const bestMatch = (line) => {
    if (!line.length) return null;
    const pick = (text, slice) => {
      let best = null;
      for (const word of targets) {
        if (found.has(word)) continue;
        const at = text.indexOf(word);
        if (at < 0) continue;
        if (!best || word.length > best.word.length) best = { word, cells: slice(at, word.length) };
      }
      return best;
    };
    const forward = line.map((x) => x.ch).join('');
    const byForward = pick(forward, (at, len) => line.slice(at, at + len));
    const backward = [...line].reverse();
    const byBackward = pick(backward.map((x) => x.ch).join(''), (at, len) => backward.slice(at, at + len));
    if (!byForward) return byBackward;
    if (!byBackward) return byForward;
    return byBackward.word.length > byForward.word.length ? byBackward : byForward;
  };

  let start = null, current = [];
  const paint = (sel) => {
    cells.forEach((x) => { x.node.classList.remove('sel'); x.node.classList.remove('on'); });
    (sel || []).forEach((x) => { x.node.classList.add('sel'); x.node.classList.add('on'); });
  };
  board.addEventListener('pointerdown', (e) => {
    const c = cellFromEvent(e);
    if (!c) return;
    e.preventDefault();
    if (board.setPointerCapture) board.setPointerCapture(e.pointerId);
    if (c.node.classList.contains('found')) {
      for (const [, group] of wordCells) {
        if (group.includes(c)) { group.forEach((x) => x.node.classList.add('found', 'locked')); Sfx.tone([660], 0.06); return; }
      }
    }
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
    const hit = bestMatch(current.filter(Boolean));
    if (hit) {
      found.add(hit.word);
      wordCells.set(hit.word, hit.cells);
      hit.cells.forEach((x) => x.node.classList.add('found', 'locked'));
      const chip = list.querySelector(`[data-w="${hit.word}"]`);
      if (chip) chip.classList.add('done');
      Sfx.good();
      playKnown(hit.word, /[А-Яа-яЁё]/.test(hit.word) ? 'ru' : 'en');
      if (found.size === targets.length) {
        toast(L('🎉 Все слова найдены!', '🎉 All words found!'));
        ctx.done();
      }
    } else if (current.length > 1) {
      Sfx.bad();
    }
    start = null; current = []; paint([]);
  };
  board.addEventListener('pointerup', finish);
  board.addEventListener('pointercancel', finish);

  return h('div', null,
    h('p', { class: 'task' }, isSnake
      ? L(
        'НАЙДИ СЛОВА И РАСКРАСЬ! Слова спрятались в одной длинной строчке. Выбери карандаш и проведи пальцем от первой буквы слова до последней.',
        'FIND AND COLOR WORDS! Words hide in one long line. Pick a crayon and drag from the first letter to the last.')
      : L(
        'НАЙДИ СЛОВА. Проведи по буквам: по строке, по столбику или наискосок. Найденное слово зеленеет, как в кроссворде.',
        'FIND THE WORDS. Drag across, down, or on a diagonal. A found word locks in green, like the crossword.')),
    image ? h('img', { class: 'lesson-img small', src: img(image), alt: '' }) : null,
    isSnake ? list : null,
    isSnake ? crayons : null,
    isSnake ? board : h('div', { class: 'cw-layout' }, board, list),
    h('div', { class: 'ws-skip' },
      typeof printBtn === 'function' ? printBtn(L('Распечатать и раскрасить', 'Print and color'), () => Printer.wordGrid(L('Найди слова и раскрась', 'Find words and color'), cfg)) : null,
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => ctx.done() }, L('Пропустить игру', 'Skip'))));
};

Ex.pronounPicture = (ctx) => {
  const questions = [
    { ask: 'She is?', options: ['ОН', 'ОНА', 'ОНО'], answer: 'ОНА' },
    { ask: 'He is?', options: ['ОН', 'ОНА', 'ОНО'], answer: 'ОН' },
  ];
  let index = 0;
  const status = h('p', { class: 'cw-status' });
  const bank = h('div', { class: 'cw-bank' });
  const draw = () => {
    const q = questions[index];
    status.textContent = q.ask;
    Speech.say(q.ask, 'en');
    bank.replaceChildren(...q.options.map((label) => h('button', {
      class: 'cw-key', type: 'button',
      onclick: () => {
        if (label !== q.answer) { Sfx.bad(); ctx.mistake(); shake(bank); return; }
        Sfx.good();
        index += 1;
        if (index === questions.length) {
          const playPhrase = async () => {
            const clips = ['assets/audio/l2/ona.m4a', 'assets/audio/l2/i.m4a', 'assets/audio/l2/on.m4a'];
            for (const src of clips) {
              if (!document.body.contains(status)) return;
              const ok = await ClipAudio.playThrough(src);
              if (!ok) break;
            }
          };
          status.replaceChildren(
            h('span', { class: 'pronoun-line' }, 'She and he.'),
            h('button', {
              class: 'pronoun-line ru', type: 'button',
              onclick: () => playPhrase(),
            }, 'Она и он.'),
          );
          bank.replaceChildren();
          ctx.done();
          playPhrase();
          return;
        }
        playKnown(q.answer, 'ru');
        draw();
      },
    }, colorize(label))));
  };
  draw();
  return h('div', { class: 'cw' },
    h('p', { class: 'task' }, 'Look at the picture. She is? He is?'),
    h('img', { class: 'lesson-img pronoun-pic', src: 'assets/img/ona-on.png', alt: 'ОНА и ОН' }),
    status,
    bank);
};

Ex.crossword = (cw, ctx) => {
  const rows = cw.rows;
  const clues = cw.clues.map((c) => ({ ...c, dir: c.dir === 'down' ? 'down' : 'across' }));
  const cells = [];
  const locked = new Set();
  const doneClues = new Set();
  let active = clues[0];

  const keyOf = (r, c) => `${r},${c}`;
  const cellBy = (r, c) => cells.find((x) => x.r === r && x.c === c);
  const slots = (clue) => {
    const out = [];
    for (let i = 0; i < clue.answer.length; i++) {
      const r = clue.r + (clue.dir === 'down' ? i : 0);
      const c = clue.c + (clue.dir === 'across' ? i : 0);
      out.push(cellBy(r, c));
    }
    return out;
  };
  const clueHas = (clue, cell) => slots(clue).includes(cell);

  const board = h('div', {
    class: 'cw-grid',
    style: { gridTemplateColumns: `repeat(${rows[0].length}, 1fr)` },
  });
  const startNum = new Map();
  clues.forEach((clue) => {
    const k = keyOf(clue.r, clue.c);
    if (!startNum.has(k)) startNum.set(k, clue.n);
  });

  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === ' ') {
      board.append(h('span', { class: 'cw-blank' }));
      return;
    }
    const num = startNum.get(keyOf(r, c));
    const input = h('span', { class: 'cw-letter' });
    const node = h('button', {
      class: 'cw-cell', type: 'button',
      onclick: () => {
        const hit = clues.find((clue) => !doneClues.has(clue) && clueHas(clue, cell))
          || clues.find((clue) => clueHas(clue, cell));
        if (!hit) return;
        active = hit;
        paint();
      },
    }, num ? h('span', { class: 'cw-num' }, String(num)) : null, input);
    const cell = { node, input, r, c, ch: '' };
    cells.push(cell);
    board.append(node);
  }));

  const list = h('div', { class: 'cw-clues' });
  const vowels = 'АЕЁИОУЫЭЮЯ';
  const bankLetters = uniq(clues.flatMap((c) => [...c.answer])).sort((a, b) => {
    const av = vowels.includes(a) ? 0 : 1;
    const bv = vowels.includes(b) ? 0 : 1;
    return av - bv || a.localeCompare(b, 'ru');
  });
  const status = h('p', { class: 'cw-status' });

  const paint = () => {
    const live = slots(active);
    cells.forEach((cell) => {
      cell.node.classList.toggle('on', live.includes(cell));
      cell.node.classList.toggle('locked', locked.has(keyOf(cell.r, cell.c)));
      cell.input.textContent = cell.ch;
    });
    list.querySelectorAll('.cw-clue').forEach((btn) => {
      const n = Number(btn.dataset.n);
      const dir = btn.dataset.dir;
      btn.classList.toggle('active', active.n === n && active.dir === dir);
      btn.classList.toggle('done', doneClues.has(clues.find((c) => c.n === n && c.dir === dir)));
    });
    const left = clues.length - doneClues.size;
    status.textContent = left
      ? L(`${active.n}. ${active.clue}  ·  ${active.dir === 'down' ? 'down' : 'across'}`, `${active.n}. ${active.clue}  ·  ${active.dir === 'down' ? 'down' : 'across'}`)
      : L('Кроссворд заполнен!', 'Crossword complete!');
  };

  const settle = (spoken) => {
    const live = slots(active);
    const full = live.every((cell) => cell.ch);
    if (full && live.map((cell) => cell.ch).join('') !== active.answer) {
      Sfx.bad();
      ctx.mistake();
      shake(board);
      live.forEach((cell) => {
        if (!locked.has(keyOf(cell.r, cell.c))) cell.ch = '';
      });
      paint();
      return;
    }
    let fresh = false;
    clues.forEach((clue) => {
      if (doneClues.has(clue)) return;
      const word = slots(clue);
      if (word.some((cell) => !cell || !cell.ch)) return;
      if (word.map((cell) => cell.ch).join('') !== clue.answer) return;
      doneClues.add(clue);
      word.forEach((cell) => locked.add(keyOf(cell.r, cell.c)));
      fresh = true;
      if (spoken) playKnown(clue.answer, 'ru');
    });
    if (fresh) Sfx.good();
    if (doneClues.has(active)) {
      const next = clues.find((c) => !doneClues.has(c));
      if (next) active = next;
    }
    paint();
    if (doneClues.size === clues.length) ctx.done();
  };

  const put = (letter) => {
    if (doneClues.has(active)) return;
    const hole = slots(active).find((cell) => cell && !cell.ch);
    if (!hole) return;
    hole.ch = letter;
    settle(true);
  };

  const erase = () => {
    if (doneClues.has(active)) return;
    const live = slots(active);
    for (let i = live.length - 1; i >= 0; i--) {
      if (live[i].ch && !locked.has(keyOf(live[i].r, live[i].c))) {
        live[i].ch = '';
        break;
      }
    }
    paint();
  };

  clues.forEach((clue) => {
    list.append(h('button', {
      class: 'cw-clue', type: 'button',
      'data-n': clue.n, 'data-dir': clue.dir,
      onclick: () => { active = clue; paint(); },
    }, `${clue.n}. ${clue.clue}`));
  });

  const latin = { A: 'А', a: 'А', O: 'О', o: 'О', H: 'Н', h: 'Н', N: 'Н', n: 'Н', I: 'И', i: 'И' };
  const onKey = (e) => {
    if (e.key === 'Backspace') { e.preventDefault(); erase(); return; }
    const ch = latin[e.key] || (/[А-Яа-яЁё]/.test(e.key) ? e.key.toUpperCase() : '');
    if (ch && bankLetters.includes(ch)) { e.preventDefault(); put(ch); }
  };
  document.addEventListener('keydown', onKey);
  const wrap = h('div', { class: 'cw' },
    h('p', { class: 'task' }, L(
      'Кроссворд из книги. Выбери вопрос и набирай слово кнопками. Буква Н на клавиатуре — это H или N.',
      'Crossword from the book. Pick a clue and tap letters. On a keyboard, Н is H or N, А is A, О is O, И is I.')),
    status,
    h('div', { class: 'cw-layout' }, board, list),
    h('div', { class: 'cw-bank' },
      bankLetters.map((letter) => h('button', {
        class: 'cw-key', type: 'button',
        onclick: () => put(letter),
      }, colorize(letter))),
      h('button', { class: 'cw-key cw-back', type: 'button', onclick: erase }, '⌫')));
  const obs = new MutationObserver(() => {
    if (!wrap.isConnected) {
      document.removeEventListener('keydown', onKey);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  paint();
  return wrap;
};

Ex.match = (pairs, ctx, intro) => {
  let selected = null, matched = 0;
  const wrap = h('div', { class: 'album' });
  const left = h('div', { class: 'col' });
  const right = h('div', { class: 'col' });
  const pick = (btn, side) => {
    if (btn.classList.contains('ok')) return;
    if (side === 'en') Speech.say(btn.dataset.key, 'en');
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
      a.classList.add('ok'); btn.classList.add('ok'); Sfx.good();
      if (++matched === pairs.length) ctx.done();
    } else {
      Sfx.bad(); ctx.mistake(); shake(a); shake(btn);
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
    h('p', { class: 'task' }, L(
      'Прочитай предложения сам, а потом нажми 🔊 и проверь себя. Нажми на предложение, чтобы увидеть перевод.',
      'Read the sentences yourself, then tap 🔊 to check. Tap a sentence to see the translation.')),
    h('div', { class: 'sentences' }, list.map((s) => {
      const tr = h('div', { class: 'sent-ru' }, s.ru);
      return h('div', { class: 'sentence', onclick: (e) => e.currentTarget.classList.toggle('open') },
        h('div', { class: 'sent-en' }, colorize(s.en)), listenBtn(s.en), tr);
    })));
};

Ex.myName = (ctx) => {
  const input = h('input', { class: 'name-input', placeholder: L('Напиши своё имя по-английски', 'Type your name in English letters'), value: Store.data.name || '', maxlength: 20 });
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
    h('p', { class: 'task' }, L(
      'It is … (напиши своё имя). Используй английские буквы, которые ты уже знаешь!',
      'It is … (write your name). Use the English letters you already know!')),
    h('div', { class: 'name-box' }, h('span', { class: 'name-prefix' }, 'It is'), input),
    out);
};

Ex.finalQuestions = (reading, ctx) => Ex.quiz(reading.questions.map((q) => ({
  prompt: mixedText(q.q),
  answer: q.a,
  options: [q.a, ...q.wrong].map((o) => ({ key: o, label: o })),
})), ctx, L('Ответь на вопросы по тексту.', 'Answer the questions about the text.'));
