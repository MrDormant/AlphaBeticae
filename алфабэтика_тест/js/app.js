function host() {
  return document.getElementById('alfa-host');
}

const COURSE = [
  ...BOOK.lessons.map((l) => ({ id: 'l' + l.id, kind: 'lesson', ref: l })),
  ...BOOK.readings.map((r) => ({ id: r.id, kind: 'reading', ref: r })),
  { id: 'final', kind: 'final', ref: BOOK.final },
];

/** Уроки с этим номером и выше закрыты для всех (включая «Все уроки»). */
const LESSON_NOT_READY_FROM = 99;
const READINGS_NOT_READY = false;

function isLessonNotReady(item) {
  return item.kind === 'lesson' && item.ref.id >= LESSON_NOT_READY_FROM;
}

function isReadingNotReady(item) {
  return READINGS_NOT_READY && item.kind === 'reading';
}

function isCourseItemBlocked(item) {
  return isLessonNotReady(item) || isReadingNotReady(item);
}

function lockedReasonToast(item) {
  if (isLessonNotReady(item)) toast('🔒 Этот урок ещё готовится — скоро добавим');
  else if (isReadingNotReady(item)) toast('🔒 Раздел «Почитаем» ещё готовится — скоро добавим');
  else toast('🔒 Сначала пройди предыдущий урок');
}

const lessonLetters = (l) => l.letters.map((x) => x.en);

function learnedUpTo(lessonId) {
  return BOOK.lessons.filter((l) => l.id <= lessonId).flatMap(lessonLetters);
}

function wordPool(lessonId) {
  return BOOK.lessons.filter((l) => l.id <= lessonId).flatMap((l) => l.words || []);
}

function isUnlocked(index) {
  const item = COURSE[index];
  if (isCourseItemBlocked(item)) return false;
  if (Store.data.unlockAll || index === 0) return true;
  return !!Store.data.done[COURSE[index - 1].id];
}

function starsFor(mistakes) {
  if (mistakes <= 2) return 3;
  if (mistakes <= 6) return 2;
  return 1;
}

function header() {
  window.dispatchEvent(new CustomEvent('alfabetica-store'));
}

// ---------- Вход и регистрация ----------

function renderAuth() {
  if (Auth.user) {
    go('#/');
    return;
  }
  let mode = 'login';
  const error = h('div', { class: 'auth-error' });
  const login = h('input', { class: 'auth-input', name: 'login', autocomplete: 'username', placeholder: 'Логин', maxlength: 32, required: true });
  const password = h('input', { class: 'auth-input', name: 'password', type: 'password', autocomplete: 'current-password', placeholder: 'Пароль', maxlength: 72, required: true });
  const submit = h('button', { class: 'btn primary big', type: 'submit' });
  const hint = h('p', { class: 'auth-hint' });
  const tabs = h('div', { class: 'auth-tabs' });

  const setMode = (m) => {
    mode = m;
    error.textContent = '';
    submit.textContent = m === 'login' ? 'Войти ▶' : 'Зарегистрироваться ▶';
    password.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    hint.textContent = m === 'login'
      ? 'Необязательно: войди, чтобы звёзды и кабинет сохранялись на любом устройстве.'
      : 'Придумай логин (от 3 символов) и пароль (от 4 символов). Прогресс с этого устройства попадёт в профиль.';
    tabs.replaceChildren(
      h('button', { type: 'button', class: mode === 'login' ? 'active' : '', onclick: () => setMode('login') }, 'Вход'),
      h('button', { type: 'button', class: mode === 'register' ? 'active' : '', onclick: () => setMode('register') }, 'Регистрация'));
  };

  const form = h('form', {
    class: 'auth-form',
    onsubmit: async (e) => {
      e.preventDefault();
      error.textContent = '';
      submit.disabled = true;
      try {
        await Auth.submit(mode, login.value, password.value);
        Sfx.good();
        go('#/');
        route();
      } catch (err) {
        error.textContent = err.message;
        Sfx.bad();
        shake(form);
      } finally {
        submit.disabled = false;
      }
    },
  }, tabs, hint, login, password, error, submit);

  setMode('login');
  host().replaceChildren(h('div', { class: 'auth' },
    h('img', { class: 'auth-img', src: img('hero'), alt: '' }),
    h('div', { class: 'auth-card' },
      h('h1', null, 'Вход и регистрация'),
      h('p', { class: 'auth-lead' }, 'Уроки можно проходить без аккаунта. Регистрация нужна, чтобы сохранить прогресс и кабинет.'),
      form,
      h('a', { class: 'link-btn', href: '#/' }, '← К урокам без регистрации'))));
  login.focus();
}

// ---------- Главная ----------

function heroLisaCard() {
  const lines = [
    { text: 'Молодец!', audio: 'assets/audio/fox/good.m4a' },
    { text: 'What is right, what is wrong?', audio: 'assets/audio/fox/idle.m4a' },
    { text: 'Ох, ошибка!', audio: 'assets/audio/fox/wrong.m4a' },
  ];
  const bubble = h('div', { class: 'hero-lisa-bubble', role: 'status' });
  const vid = h('video', {
    class: 'hero-img hero-anim',
    src: 'assets/video/lisa-hero.mp4?v=2',
    autoplay: true,
    muted: true,
    loop: true,
    playsinline: true,
    disablepictureinpicture: true,
  });
  vid.muted = true;
  vid.defaultMuted = true;
  vid.playsInline = true;
  vid.autoplay = true;
  vid.loop = true;
  vid.setAttribute('muted', '');
  vid.setAttribute('playsinline', '');
  vid.play?.().catch(() => {});

  const prompt = 'Нажми 🔊';
  bubble.textContent = prompt;
  bubble.classList.add('show', 'hint');

  const wrap = h('div', {
    class: 'hero-lisa',
    title: 'Нажми на облачко — Лиса скажет фразу',
  }, bubble, vid);

  let last = -1;
  const voice = new Audio();
  voice.preload = 'auto';

  const showPrompt = () => {
    bubble.textContent = prompt;
    bubble.classList.add('hint');
  };

  const speak = () => {
    if (!wrap.isConnected) return;
    let i;
    do { i = Math.floor(Math.random() * lines.length); } while (i === last && lines.length > 1);
    last = i;
    const line = lines[i];
    bubble.textContent = line.text;
    bubble.classList.remove('hint');
    voice.onended = showPrompt;
    voice.onerror = showPrompt;
    voice.pause();
    try { voice.currentTime = 0; } catch (e) { /* ignore */ }
    if (typeof Store === 'undefined' || Store.data.sound) {
      voice.src = line.audio;
      voice.play().catch(showPrompt);
    } else {
      setTimeout(showPrompt, 2200);
    }
  };

  wrap.addEventListener('click', speak);
  return wrap;
}

function renderHome() {
  const name = Store.data.name || (Auth.user && Auth.user.login);
  const learned = BOOK.lessons.filter((l) => Store.data.done['l' + l.id]).flatMap(lessonLetters);
  const passedCount = COURSE.filter((c) => Store.data.done[c.id]).length;
  const coursePercent = Math.round((passedCount / COURSE.length) * 100);

  const sections = [];
  let current = null;
  COURSE.forEach((item, index) => {
    const section = item.kind === 'lesson' ? item.ref.section : 'Почитаем';
    if (!current || current.title !== section) {
      current = { title: section, items: [] };
      sections.push(current);
    }
    current.items.push({ item, index });
  });

  const card = ({ item, index }) => {
    const unlocked = isUnlocked(index);
    const stars = Store.data.done[item.id] || 0;
    const badge = item.kind === 'lesson'
      ? (item.ref.badge || item.ref.letters.map((x) => x.en + (x.en.length === 1 ? x.en.toLowerCase() : '')).join(' '))
      : item.kind === 'reading' ? '📖' : '🏆';
    const label = item.kind === 'lesson' ? `Урок ${item.ref.id}` : item.kind === 'reading' ? 'Чтение' : 'Финал';
    return h('a', {
      class: 'lesson-card' + (unlocked ? '' : ' locked') + (stars ? ' done' : ''),
      href: unlocked ? `#/${item.kind}/${item.id}` : null,
      onclick: unlocked ? null : (e) => { e.preventDefault(); lockedReasonToast(item); },
    },
    h('div', { class: 'lc-badge' }, item.kind === 'lesson' ? colorize(badge) : badge),
    h('div', { class: 'lc-body' },
      h('div', { class: 'lc-num' }, label),
      h('div', { class: 'lc-title' }, item.ref.title)),
    h('div', { class: 'lc-stars' }, unlocked ? [1, 2, 3].map((n) => h('span', { class: n <= stars ? 'on' : '' }, '★')) : '🔒'));
  };

  const nextIndex = COURSE.findIndex((c, i) => !Store.data.done[c.id] && isUnlocked(i));
  const next = nextIndex >= 0 ? COURSE[nextIndex] : null;
  const moreContentLater = !next && COURSE.some((c) => isCourseItemBlocked(c) && !Store.data.done[c.id]);

  host().replaceChildren(
    h('section', { class: 'hero-block' },
      h('div', { class: 'hero-text' },
        h('h1', null, name ? `Привет, ${name}!` : 'Привет!'),
        h('p', null, 'Буквы А и О собирают команду, чтобы помочь российским ребятам научиться читать и писать по-английски. Проходи уроки, читай слоги и слова, играй и собирай звёзды!'),
        next ? h('a', { class: 'btn primary big', href: `#/${next.kind}/${next.id}` },
          Store.stars() ? 'Продолжить ▶' : 'Начать первый урок ▶')
          : moreContentLater
            ? h('div', { class: 'all-done' }, '📚 Скоро добавим новые уроки и раздел чтения')
            : h('div', { class: 'all-done' }, '🏆 Все уроки пройдены!')),
      heroLisaCard()),
    h('div', { class: 'home-progress' },
      h('div', { class: 'tp-label' }, `Пройдено ${passedCount} из ${COURSE.length} · ${coursePercent}%`),
      h('div', { class: 'progress-bar big' },
        h('div', { class: 'progress-fill', style: { width: coursePercent + '%' } }))),
    storyTeaser(),
    h('section', { class: 'team-block' },
      h('div', { class: 'team-title' }, 'Моя команда букв'),
      learned.length ? teamStrip(learned) : h('p', { class: 'muted' }, 'Пройди первый урок, и в команде появятся гласные A O E I U.')),
    h('section', { class: 'games' },
      h('a', { class: 'game-card', href: '#/cubes' }, h('span', { class: 'gc-icon' }, '🎲'), h('b', null, 'Кубики со слогами'), h('span', null, 'Крути кубики и собирай слова')),
      h('a', { class: 'game-card', href: '#/alphabet' }, h('span', { class: 'gc-icon' }, '🔤'), h('b', null, 'Английский алфавит'), h('span', null, 'Все 26 букв и их названия')),
      h('a', { class: 'game-card', href: '#/profile' }, h('span', { class: 'gc-icon' }, '🏅'), h('b', null, 'Личный кабинет'), h('span', null, 'Звёзды, уроки, мотивация и реакция'))),
    ...sections.map((s) => h('section', { class: 'map-section' },
      h('h2', null, s.title),
      h('div', { class: 'lesson-list' }, s.items.map(card)))),
    h('section', { class: 'settings' },
      h('button', {
        class: 'btn ghost small', type: 'button',
        onclick: () => { if (confirm('Сбросить весь прогресс и звёзды?')) { Store.reset(); header(); renderHome(); } },
      }, 'Сбросить прогресс')),
    h('footer', { class: 'credits' },
      'По учебно-методическому пособию Ю.О. Чумаковой «АЛФАБЭТИКА. ALFABETICA. От русского к английскому». Иллюстрации выполнены учениками МБОУ СОШ №12 г. Новочеркасска.'));
}

function storyTeaser() {
  const lines = BOOK.lessons[0].story[0].dialogue.slice(0, 3);
  const page = { image: null, dialogue: lines };
  const holder = h('div', { class: 'teaser-dialogue' }, Ex.dialogue(page, { done() {} }));
  return h('section', { class: 'story-teaser' },
    h('div', { class: 'teaser-head' },
      h('h2', null, 'Знакомьтесь: А и О!'),
      h('p', { class: 'muted' }, 'Две главные героини Алфабэтики. Нажми на А или О — они споют А О Э И У. А вот с чего всё началось:')),
    (() => {
      let singing = false;
      const bounce = (el) => {
        el.classList.remove('jump');
        void el.offsetWidth;
        el.classList.add('jump');
      };
      const sing = async () => {
        if (singing) return;
        singing = true;
        [heroA, heroO].forEach((el) => { bounce(el); heroTalk(el, true); });
        try {
          if (typeof VowelAudio !== 'undefined') await VowelAudio.playAll();
        } finally {
          [heroA, heroO].forEach((el) => heroTalk(el, false));
          singing = false;
        }
      };
      const heroA = Hero('A', { size: 96, title: 'Нажми — споём А О Э И У', onClick: sing });
      const heroO = Hero('O', { size: 96, title: 'Нажми — споём А О Э И У', onClick: sing });
      return h('div', { class: 'teaser-heroes' }, heroA, heroO);
    })(),
    holder,
    h('a', { class: 'btn primary', href: '#/lesson/l1' }, '📖 Почитать историю целиком'));
}

// ---------- Личный кабинет ----------

const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function courseLabel(item) {
  if (item.kind === 'lesson') return `Урок ${item.ref.id}. ${item.ref.title}`;
  return item.ref.title;
}

function renderProfile() {
  const done = Store.data.done;
  const dates = Store.data.dates || {};
  const passed = COURSE.filter((c) => done[c.id]);
  const maxStars = COURSE.length * 3;
  const stars = Store.stars();
  const learned = BOOK.lessons.filter((l) => done['l' + l.id]).flatMap(lessonLetters);
  const percent = Math.round((passed.length / COURSE.length) * 100);
  const nextIndex = COURSE.findIndex((c) => !done[c.id]);
  const next = nextIndex >= 0 ? COURSE[nextIndex] : null;
  const lastDate = Object.values(dates).sort().pop();
  const who = Auth.user ? Auth.user.login : 'Гость';

  const stat = (icon, value, label) => h('div', { class: 'stat' },
    h('div', { class: 'stat-icon' }, icon), h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label));

  const rows = COURSE.map((item, index) => {
    const s = done[item.id] || 0;
    const unlocked = isUnlocked(index);
    return h('div', { class: 'pr-row' + (s ? ' done' : '') },
      h('div', { class: 'pr-status' }, s ? '✅' : unlocked ? '▶️' : '🔒'),
      h('div', { class: 'pr-title' },
        h('div', null, courseLabel(item)),
        h('div', { class: 'pr-date' }, s && dates[item.id] ? `Пройден ${formatDate(dates[item.id])}` : s ? 'Пройден' : unlocked ? 'Можно проходить' : isCourseItemBlocked(item) ? 'Скоро будет' : 'Ещё закрыт')),
      h('div', { class: 'lc-stars' }, [1, 2, 3].map((n) => h('span', { class: n <= s ? 'on' : '' }, '★'))),
      unlocked ? h('a', { class: 'btn ghost small', href: `#/${item.kind}/${item.id}` }, s ? 'Повторить' : 'Пройти') : h('span'));
  });

  host().replaceChildren(h('div', { class: 'page profile' },
    h('div', { class: 'player-head' }, h('a', { class: 'close', href: '#/' }, '✕'), h('div', { class: 'player-title' }, 'Личный кабинет')),
    h('div', { class: 'profile-head' },
      h('div', { class: 'avatar' }, who[0].toUpperCase()),
      h('div', null,
        h('h1', null, who),
        h('div', { class: 'muted' },
          Auth.user && Auth.user.created_at ? `В Алфабэтике с ${formatDate(Auth.user.created_at)}` : 'Занимаешься без регистрации',
          lastDate ? ` · последний урок ${formatDate(lastDate)}` : ''))),
    !Auth.user ? h('div', { class: 'guest-note' },
      'Это локальный кабинет: звёзды и метрики уже пишутся на этом компьютере. Регистрация нужна, чтобы открыть их с другого устройства.',
      h('a', { class: 'btn primary small', href: '#/auth' }, 'Регистрация')) : null,
    h('div', { class: 'stats' },
      stat('⭐', `${stars} / ${maxStars}`, 'звёзд собрано'),
      stat('📚', `${passed.length} / ${COURSE.length}`, 'уроков пройдено'),
      stat('🔤', learned.length, 'букв в команде'),
      stat('🎲', Store.data.cubeScore || 0, 'ответов в кубиках')),
    cabinetBlock(summarizeLearning(Store.data)),
    h('div', { class: 'total-progress' },
      h('div', { class: 'tp-label' }, `Пройдено ${percent}% Алфабэтики`),
      h('div', { class: 'progress-bar big' }, h('div', { class: 'progress-fill', style: { width: percent + '%' } }))),
    next ? h('a', { class: 'btn primary', href: `#/${next.kind}/${next.id}` }, `Дальше: ${courseLabel(next)} ▶`) : h('div', { class: 'all-done' }, '🏆 Вся Алфабэтика пройдена!'),
    h('div', { class: 'team' },
      h('div', { class: 'team-title' }, 'Моя команда букв'),
      learned.length ? teamStrip(learned) : h('p', { class: 'muted' }, 'Пока пусто — пройди первый урок!')),
    h('h2', { class: 'step-title' }, 'Мои уроки'),
    h('div', { class: 'pr-list' }, rows)));
}

// ---------- Шаги уроков ----------

const POEM_STEP_TITLE = 'Стихотворение Лисы Лисичкиной';

function poemStep(poem, opts) {
  if (!poem || typeof Ex.poem !== 'function') return null;
  return { title: POEM_STEP_TITLE, render: (ctx) => Ex.poem(poem, ctx, opts) };
}

function insertPoem(lesson, steps) {
  const out = [];
  const hello = poemStep(window.POEMS && window.POEMS[1]);
  if (hello) out.push(hello);
  out.push(...steps);
  if (lesson.id !== 1) {
    const own = poemStep(window.POEMS && window.POEMS[lesson.id]);
    if (own) out.push(own);
  }
  const ruPoem = window.POEMS_RU && (window.POEMS_RU[lesson.id] || window.POEMS_RU[1]);
  const ru = poemStep(ruPoem, { closing: true });
  if (ru) out.push(ru);
  return out;
}

function lessonSteps(lesson) {
  const steps = [];
  const learned = learnedUpTo(lesson.id);
  const pool = wordPool(lesson.id);

  if (lesson.id === 1) {
    lesson.story.forEach((p, n) => steps.push({ title: n === 0 ? 'Давай знакомиться!' : 'Секрет алфавитов', render: (ctx) => Ex.storyPage(p, ctx) }));
    steps.push({ title: 'Пропевка АОЭИУ', render: (ctx) => Ex.vowelChant(ctx) });
    steps.push({ title: 'Семейный альбом', render: (ctx) => Ex.album(lesson, ctx) });
    steps.push({ title: 'Гласные, значит красные', render: (ctx) => Ex.vowelTable(lesson, ctx) });
    steps.push({ title: 'Раскрасим', render: (ctx) => Ex.paintVowels(ctx) });
    steps.push({
      title: 'Какой звук?',
      render: (ctx) => Ex.quiz(shuffle(lesson.letters).map((l) => ({
        prompt: h('span', { class: 'q-big' }, colorize(l.en + l.en.toLowerCase())),
        answer: l.ru,
        options: [l, ...sample(lesson.letters.filter((x) => x !== l), 2)].map((o) => ({ key: o.ru, label: `${o.ru} [${o.sound}]` })),
      })), ctx, 'Какая русская буква звучит так же, как эта английская?'),
    });
    steps.push({ title: 'Пропись', render: (ctx) => Ex.tracing(lesson.write, ctx, 'Урок 1. Гласные A O E I U') });
    return insertPoem(lesson, steps);
  }

  steps.push({ title: 'Пропевка АОЭИУ', render: (ctx) => Ex.vowelChant(ctx) });
  (lesson.story || []).forEach((p) => steps.push({ title: 'История', render: (ctx) => Ex.storyPage(p, ctx) }));
  steps.push({ title: 'Новая буква', render: (ctx) => Ex.letterIntro(lesson, learned, ctx) });
  steps.push({ title: 'Читаем слоги', render: (ctx) => Ex.syllableTable(lesson.syllables, ctx) });
  steps.push({ title: 'Узнай слог', render: (ctx) => Ex.syllableQuiz(lesson, ctx) });
  steps.push({ title: 'Новые слова', render: (ctx) => Ex.wordCards(lesson.words, ctx) });
  steps.push({ title: 'Читаем текст', render: (ctx) => Ex.reading(lesson, ctx) });

  const quizWords = lesson.words.length >= 3
    ? sample(lesson.words, Math.min(5, lesson.words.length))
    : uniq([...lesson.words, ...sample(pool.filter((x) => !lesson.words.includes(x)), 3 - lesson.words.length)]);
  steps.push({ title: 'Что это значит?', render: (ctx) => Ex.wordQuiz(quizWords, pool, ctx) });
  steps.push({ title: 'Послушай и найди', render: (ctx) => Ex.listenPick(sample(quizWords, Math.min(4, quizWords.length)), pool, ctx) });

  const buildable = lesson.words.filter((x) => x.en.replace(/ /g, '').length <= 8);
  const buildSet = sample(buildable.length >= 2 ? buildable : [...buildable, ...pool.filter((x) => x.en.length <= 6)], 3);
  steps.push({ title: 'Собери слово', render: (ctx) => Ex.buildWords(uniq(buildSet), learned.filter((l) => l.length === 1), ctx) });

  const letterLine = lesson.letters.map((l) => l.en.length === 1 ? `${l.en} ${l.en.toLowerCase()}  ${l.en} ${l.en.toLowerCase()}` : `${l.en} ${l.en.toLowerCase()}`).join('  ');
  const sylLine = lesson.id === 2 && lesson.syllables[0]?.enLow
    ? lesson.syllables.slice(0, 5).map((s) => `${s.ru} ${s.en} ${s.enLow}`).join('  ')
    : lesson.syllables.filter((s) => s.en.length === 2).slice(0, 5).map((s) => s.en).join(' ');
  const wordsLine = lesson.words.filter((x) => x.en.length <= 7).slice(0, 2).map(wordDisplay).join('  ');
  steps.push({ title: 'Пропись', render: (ctx) => Ex.tracing([letterLine, sylLine, wordsLine].filter(Boolean), ctx, `Урок ${lesson.id}. ${lesson.title}`) });

  if (lesson.grid) steps.push({ title: 'Найди слова и раскрась', render: (ctx) => Ex.wordSearch(lesson.grid, ctx, lesson.gridImage, lesson) });
  if (lesson.snake) steps.push({ title: 'Найди слова и раскрась', render: (ctx) => Ex.wordSearch(lesson.snake, ctx, null, lesson) });
  if (lesson.draw) steps.push({ title: lesson.draw.title, render: (ctx) => Ex.draw(lesson.draw, ctx, lesson) });
  return insertPoem(lesson, steps);
}

function readingSteps(reading) {
  return [
    {
      title: reading.title,
      render: (ctx) => {
        ctx.done();
        return h('div', { class: 'reading' },
          pic(reading.image, 'lesson-img'),
          h('p', { class: 'task' }, 'Прочитай текст. Нажимай на английские слова, если забыл, что они значат.'),
          h('div', { class: 'print-row' },
            h('button', {
              class: 'btn ghost', type: 'button',
              onclick: () => playReadingText(reading),
            }, '🔊 Послушай текст')),
          h('div', { class: 'reading-card' }, reading.text.map((p) => readingLine(p))));
      },
    },
    { title: 'Вопросы по тексту', render: (ctx) => Ex.finalQuestions(reading, ctx) },
  ];
}

function finalSteps(fin) {
  return [
    { title: 'Мы готовы!', render: (ctx) => Ex.storyPage({ image: null, dialogue: fin.epilogue }, ctx) },
    { title: 'It is …', render: (ctx) => Ex.sentences(fin.sentences, ctx) },
    {
      title: 'Переведи предложение',
      render: (ctx) => Ex.quiz(sample(fin.sentences, 6).map((s) => ({
        prompt: h('span', { class: 'q-sent' }, colorize(s.en)),
        say: s.en,
        sayAudio: s.audio,
        sayAudioClips: s.audioClips,
        answer: s.ru,
        options: [s, ...sample(fin.sentences.filter((x) => x !== s), 2)].map((o) => ({ key: o.ru, label: o.ru })),
      })), ctx, 'Что значит это предложение?'),
    },
    { title: 'Реки и города', render: (ctx) => Ex.match(fin.places, ctx, 'Прочитай названия рек и городов России и найди пару для каждого.') },
    { title: 'Напиши своё имя', render: (ctx) => Ex.myName(ctx) },
  ];
}

// ---------- Скрытые метрики урока ----------

function avgNums(values) {
  const nums = values.filter((v) => typeof v === 'number' && v >= 0);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function motivationLabel(score) {
  if (score >= 80) return 'Горит желанием учиться';
  if (score >= 55) return 'Занимается с интересом';
  if (score >= 30) return 'Потихоньку входит во вкус';
  return 'Нужна поддержка и похвала';
}

function reactionLabel(ms) {
  if (ms == null) return 'Пока мало данных';
  if (ms < 1200) return 'Молниеносная';
  if (ms < 3000) return 'Живая';
  if (ms < 6000) return 'Спокойная';
  return 'Вдумчивая';
}

function speedLabel(ms) {
  if (ms == null) return 'Пока мало данных';
  if (ms < 2500) return 'Отвечает очень быстро';
  if (ms < 6000) return 'В своём уверенном темпе';
  return 'Не спешит, думает';
}

function formatMs(ms) {
  if (ms == null) return '';
  const sec = ms / 1000;
  return sec < 10 ? `${sec.toFixed(1)} с` : `${Math.round(sec)} с`;
}

function summarizeLearning(data) {
  const total = COURSE.length;
  const done = (data && data.done) || {};
  const lessonsDone = Object.values(done).filter(Boolean).length;
  const sessions = ((data && data.metrics && data.metrics.sessions) || []);
  const finished = sessions.filter((s) => s.completed);
  const abandoned = sessions.filter((s) => !s.completed);
  const reactions = sessions.map((s) => s.avgReactionMs).filter(Boolean);
  const answers = sessions.map((s) => s.avgAnswerMs).filter(Boolean);
  const corrects = sessions.reduce((a, s) => a + (s.corrects || 0), 0);
  const mistakes = sessions.reduce((a, s) => a + (s.mistakes || 0), 0);
  const attempts = corrects + mistakes;
  const accuracy = attempts ? corrects / attempts : null;

  let score = 35;
  if (total) score += 30 * (lessonsDone / total);
  if (accuracy != null) score += 20 * accuracy;
  if (finished.length) score += 10;
  if (abandoned.length && abandoned.length > finished.length) score -= 12;
  const avgDur = avgNums(finished.map((s) => s.durationMs || 0));
  if (finished.length && avgDur && avgDur > 90000) score += 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const reactionMs = avgNums(reactions);
  const answerMs = avgNums(answers);
  return {
    lessonsDone,
    lessonsTotal: total,
    motivationScore: score,
    motivationLabel: motivationLabel(score),
    reactionMs: reactionMs == null ? null : Math.round(reactionMs),
    reactionLabel: reactionLabel(reactionMs),
    answerMs: answerMs == null ? null : Math.round(answerMs),
    speedLabel: speedLabel(answerMs),
    sessions: sessions.length,
  };
}

function cabinetBlock(info) {
  const local = !Auth.user;
  const card = (icon, title, value, hint) => h('div', { class: 'cabinet-card' },
    h('div', { class: 'cabinet-k' }, icon, ' ', title),
    h('div', { class: 'cabinet-v' }, value),
    hint ? h('div', { class: 'cabinet-h' }, hint) : null);

  return h('div', { class: 'cabinet' },
    h('h2', { class: 'step-title' }, 'Как ты учишься'),
    h('p', { class: 'cabinet-lead' }, local
      ? 'Без регистрации метрики тоже собираются — тихо, во время уроков, и остаются на этом устройстве.'
      : 'Пока идут уроки, Алфабэтика тихо собирает, как ты занимаешься — без оценок и без лишних экранов.'),
    h('div', { class: 'cabinet-grid' },
      card('🔥', 'Мотивация', info.motivationLabel, `${info.motivationScore} из 100`),
      card('⚡', 'Реакция', info.reactionLabel, formatMs(info.reactionMs) || 'Пройди урок с заданиями'),
      card('⏱️', 'Скорость ответа', info.speedLabel, formatMs(info.answerMs) || 'Появится после первых ответов'),
      card('📚', 'Пройдено уроков', `${info.lessonsDone} / ${info.lessonsTotal}`, info.sessions ? `занятий записано: ${info.sessions}` : 'Ещё ни одного занятия')));
}

const LessonTracker = {
  session: null,
  start(itemId) {
    this.abandon();
    const now = Date.now();
    this.session = {
      id: itemId,
      at: new Date().toISOString(),
      startedAt: now,
      markAt: now,
      reactions: [],
      answers: [],
      corrects: 0,
      mistakes: 0,
      reacted: false,
    };
  },
  step() {
    if (!this.session) return;
    this.session.markAt = Date.now();
  },
  notice() {
    if (!this.session || this.session.reacted) return;
    this.session.reacted = true;
    this.session.reactions.push(Math.max(0, Date.now() - this.session.startedAt));
  },
  correct() { this._answer(true); },
  mistake() { this._answer(false); },
  _answer(ok) {
    if (!this.session) return;
    this.notice();
    const now = Date.now();
    this.session.answers.push(Math.max(0, now - this.session.markAt));
    this.session.markAt = now;
    if (ok) this.session.corrects++;
    else this.session.mistakes++;
  },
  snapshot(completed) {
    if (!this.session) return null;
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    return {
      id: this.session.id,
      at: this.session.at,
      completed,
      durationMs: Date.now() - this.session.startedAt,
      avgReactionMs: avg(this.session.reactions),
      avgAnswerMs: avg(this.session.answers),
      corrects: this.session.corrects,
      mistakes: this.session.mistakes,
    };
  },
  complete() {
    const snap = this.snapshot(true);
    if (snap) Store.recordSession(snap);
    this.session = null;
  },
  abandon() {
    const snap = this.snapshot(false);
    this.session = null;
    if (!snap) return;
    if (snap.durationMs < 4000 && !snap.corrects && !snap.mistakes) return;
    Store.recordSession(snap);
  },
};

// ---------- Проигрыватель урока ----------

function renderPlayer(kind, id) {
  if (typeof Fox !== 'undefined') Fox.detachLesson();
  const index = COURSE.findIndex((c) => c.id === id);
  const item = COURSE[index];
  if (!item) return go('#/');
  if (!isUnlocked(index)) { lockedReasonToast(item); return go('#/'); }

  const steps = item.kind === 'lesson' ? lessonSteps(item.ref)
    : item.kind === 'reading' ? readingSteps(item.ref) : finalSteps(item.ref);
  let step = 0;
  let mistakes = 0;
  LessonTracker.start(item.id);

  const title = item.kind === 'lesson' ? `Урок ${item.ref.id}. ${item.ref.title}` : item.ref.title;
  const progress = h('div', { class: 'progress-bar' }, h('div', { class: 'progress-fill' }));
  const dots = h('div', { class: 'progress-label' });
  const stepJump = h('div', { class: 'step-jump', role: 'tablist', 'aria-label': 'Шаги урока' });
  const stage = h('div', { class: 'stage' });
  const stepTitle = h('h2', { class: 'step-title' });
  const back = h('button', { class: 'btn ghost', type: 'button', onclick: () => { if (step > 0) { step--; show(); } } }, '◀ Назад');
  const next = h('button', { class: 'btn primary', type: 'button', onclick: () => { step++; show(); } }, 'Дальше ▶');

  const paintStepJump = () => {
    stepJump.replaceChildren(...steps.map((s, i) => h('button', {
      type: 'button',
      class: 'step-jump-btn' + (i === step ? ' active' : '') + (i < step ? ' done' : ''),
      title: s.title,
      'aria-label': `Шаг ${i + 1}: ${s.title}`,
      'aria-selected': i === step ? 'true' : 'false',
      onclick: () => { if (step !== i) { step = i; show(); } },
    }, String(i + 1))));
  };

  const show = () => {
    if (step >= steps.length) return finish();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (typeof VowelAudio !== 'undefined') VowelAudio.stop();
    if (typeof ClipAudio !== 'undefined') ClipAudio.stop();
    if (typeof PoemPlayer !== 'undefined') PoemPlayer.stop();
    const s = steps[step];
    progress.firstChild.style.width = `${(step / steps.length) * 100}%`;
    dots.textContent = `Шаг ${step + 1} из ${steps.length}: ${s.title}`;
    stepTitle.textContent = s.title;
    paintStepJump();
    next.disabled = true;
    next.classList.remove('pulse');
    back.style.visibility = step > 0 ? 'visible' : 'hidden';
    LessonTracker.step();
    const ctx = {
      done: () => { next.disabled = false; next.classList.add('pulse'); },
      advance: () => { step++; show(); },
      mistake: () => {
        mistakes++;
        LessonTracker.mistake();
        if (typeof Fox !== 'undefined') Fox.lessonWrong();
      },
      correct: () => {
        LessonTracker.correct();
        if (typeof Fox !== 'undefined') Fox.lessonRight();
      },
    };
    stage.replaceChildren(s.render(ctx));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = () => {
    if (typeof Fox !== 'undefined') {
      Fox.hideWalker();
      Fox.detachLesson({ keepHidden: true });
    }
    LessonTracker.complete();
    const stars = starsFor(mistakes);
    Store.complete(item.id, stars);
    header();
    Sfx.win();
    confetti();
    const after = COURSE[index + 1];
    const newLetters = item.kind === 'lesson' ? lessonLetters(item.ref) : [];
    const foxCheer = typeof Fox !== 'undefined'
      ? Fox.finishPanel({ stars, perfect: mistakes === 0, final: item.kind === 'final' })
      : null;
    host().replaceChildren(h('div', { class: 'finish' },
      foxCheer,
      h('h1', null, item.kind === 'final' ? 'Ура! Ты прошёл всю Алфабэтику!' : 'Урок пройден!'),
      h('div', { class: 'finish-stars' }, [1, 2, 3].map((n) => h('span', { class: n <= stars ? 'on' : '' }, '★'))),
      h('p', null, mistakes === 0 ? 'Ни одной ошибки! Великолепно!' : `Ошибок: ${mistakes}. ${stars === 3 ? 'Отлично!' : 'Можно пройти ещё раз и получить больше звёзд.'}`),
      newLetters.length ? h('div', { class: 'team' },
        h('div', { class: 'team-title' }, 'В команду пришли новые буквы!'),
        teamStrip(learnedUpTo(item.ref.id), newLetters)) : null,
      h('div', { class: 'finish-actions' },
        h('a', { class: 'btn ghost', href: '#/' }, '🗺️ К урокам'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => renderPlayer(kind, id) }, '🔁 Ещё раз'),
        after ? h('a', { class: 'btn primary', href: `#/${after.kind}/${after.id}` }, 'Следующий урок ▶') : null)));
  };

  const foxSlot = h('div', { class: 'fox-podium-slot' });
  const player = h('div', { class: 'player' },
    h('div', { class: 'player-head' },
      h('a', { class: 'close', href: '#/', title: 'К урокам' }, '✕'),
      h('div', { class: 'player-title' }, title)),
    h('div', { class: 'fox-podium' }, foxSlot),
    progress, dots, stepJump, stepTitle, stage,
    h('div', { class: 'player-nav' }, back, next));
  if (typeof Fox !== 'undefined') Fox.attachLesson(foxSlot);
  stage.addEventListener('pointerdown', () => LessonTracker.notice(), { capture: true });
  host().replaceChildren(player);
  show();
}

// ---------- Кубики ----------

function cubeLetterOnCube(letter) {
  return letter.en.length === 1 || letter.en === 'QU';
}

function cubeSyllableFaces(letter, syllables) {
  const pool = syllables.filter((s) => (letter.en === 'QU' ? s.en === 'QU' : s.en[0] === letter.en));
  return pool.map((s) => ({ ...s, audio: s.audio || syllableAudioClip(s.en) }));
}

function cubeSyllableMode() {
  const cubes = BOOK.lessons.filter((l) => l.id > 1).flatMap((l) => l.letters.filter(cubeLetterOnCube).map((letter) => {
    const faces = cubeSyllableFaces(letter, l.syllables);
    const lone = { en: letter.en, ru: letter.ru, audio: syllableAudioClip(letter.en) };
    return { letter: letter.en, ru: letter.ru, faces: [...faces, lone], lesson: l.id };
  }));
  let currentCube = cubes[0];
  let spins = 0;
  let busy = false;
  let score = Store.data.cubeScore || 0;

  const orient = [[0, 0], [0, -90], [0, -180], [0, 90], [-90, 0], [90, 0]];
  const tilt = 'rotateX(-14deg) rotateY(18deg)';
  const cube = h('div', { class: 'cube' });
  const scene = h('div', { class: 'scene' }, cube);
  const question = h('div', { class: 'cube-question' }, 'Нажми «Бросить кубик»!');
  const scoreBox = h('div', { class: 'cube-score' });
  const updateScore = () => { scoreBox.textContent = `⭐ Правильных ответов: ${score}`; };

  const buildCube = () => {
    cube.replaceChildren(...currentCube.faces.map((f, i) => h('div', { class: `face f${i}` }, colorize(f.en))));
    cube.style.transform = `${tilt} rotateX(0deg) rotateY(${360 * spins}deg)`;
    question.replaceChildren('Нажми «Бросить кубик»!');
  };

  const roll = () => {
    if (busy) return;
    busy = true;
    spins++;
    const n = Math.floor(Math.random() * 6);
    const face = currentCube.faces[n];
    const [x, y] = orient[n];
    cube.style.transform = `${tilt} rotateX(${x + 360 * spins}deg) rotateY(${y + 360 * spins}deg)`;
    question.replaceChildren('Кубик катится…');
    setTimeout(() => {
      busy = false;
      const opts = uniq([face.ru, ...sample(currentCube.faces.filter((f) => f.ru !== face.ru).map((f) => f.ru), 2)]);
      question.replaceChildren(
        h('div', { class: 'quiz-q' },
          'Как читается ', h('b', null, colorize(face.en)), '?',
          listenBtn(face.en, 'en', null, face.audio || syllableAudioClip(face.en))),
        h('div', { class: 'quiz-options' }, shuffle(opts).map((o) => h('button', {
          class: 'option', type: 'button',
          onclick: (e) => {
            if (o === face.ru) {
              e.currentTarget.classList.add('ok'); Sfx.good();
              playSyllableEn(face.en);
              score++; Store.data.cubeScore = score; Store.save(); updateScore();
              question.querySelectorAll('.option').forEach((b) => { b.disabled = true; });
            } else {
              e.currentTarget.classList.add('bad'); e.currentTarget.disabled = true; Sfx.bad(); shake(e.currentTarget);
            }
          },
        }, o))));
      setTimeout(() => playSyllableEn(face.en), 200);
    }, 1300);
  };

  const picker = h('div', { class: 'cube-picker' }, cubes.map((c) => h('button', {
    class: 'chip' + (c === currentCube ? ' active' : ''), type: 'button',
    onclick: (e) => {
      currentCube = c;
      picker.querySelectorAll('.chip').forEach((n) => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
      buildCube();
    },
  }, colorize(c.letter))));

  buildCube();
  updateScore();
  return h('div', null,
    h('p', { class: 'task' }, 'Выбери кубик с буквой, брось его и прочитай слог, который выпал.'),
    picker, scene,
    h('div', { class: 'cube-actions' }, h('button', { class: 'btn primary big', type: 'button', onclick: roll }, '🎲 Бросить кубик')),
    question, scoreBox);
}

const CUBE_ORIENT = [[0, 0], [0, -90], [0, -180], [0, 90], [-90, 0], [90, 0]];
const CUBE_TILT = 'rotateX(-14deg) rotateY(18deg)';

const CUBE_WORDS = [
  ['MA|MA', 'мама'], ['NI|NA', 'Нина'], ['RO|MA', 'Рома'], ['NO|N|NA', 'Нонна'], ['PU|MA', 'пума'],
  ['LE|MO|N', 'лимон'], ['TO|MA|TO', 'помидор'], ['BA|NA|NA', 'банан'], ['PO|LI|NA', 'Полина'],
  ['RA|DI|O', 'радио'], ['DI|A|NA', 'Диана'], ['A|N|TO|N', 'Антон'], ['GA|LI|NA', 'Галина'],
  ['ZE|B|RA', 'зебра'], ['CI|NE|MA', 'кино'],
].map(([parts, ru]) => ({ parts: parts.split('|'), en: parts.replace(/\|/g, ''), ru }));

// Режим «Собери слово»: поворачивай кубики, пока на них не сложится слово.
function cubeWordMode() {
  const allChunks = uniq([
    ...BOOK.lessons.flatMap((l) => (l.syllables || []).map((s) => s.en)),
    ...BOOK.lessons.flatMap((l) => l.letters.map((x) => x.en)),
  ]).filter((x) => x.length <= 2);
  let order = shuffle(CUBE_WORDS);
  let wi = 0;
  let solved = 0;
  const row = h('div', { class: 'word-cubes' });
  const target = h('div', { class: 'wc-target' });
  const status = h('div', { class: 'cube-question' });
  const nextBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => { wi++; build(); } }, 'Следующее слово ▶');

  const faceSet = (chunk) => {
    const sameType = allChunks.filter((c) => c !== chunk && (c.length === chunk.length || Math.random() < 0.3));
    return shuffle([chunk, ...sample(sameType, 5)]);
  };

  function build() {
    if (wi >= order.length) { order = shuffle(CUBE_WORDS); wi = 0; }
    const word = order[wi];
    nextBtn.style.visibility = 'hidden';
    target.replaceChildren(
      h('span', { class: 'wc-task' }, `Собери слово «${word.ru}»`),
      listenBtn(word.en, 'en', null, lessonWordAudioClip(word.en)),
      h('span', { class: 'wc-hint' }, ' — нажимай на кубики, они поворачиваются'));
    status.replaceChildren(h('span', { class: 'muted' }, 'Подсказка: послушай слово и найди нужный слог на каждом кубике.'));
    const cubes = word.parts.map((chunk) => {
      const faces = faceSet(chunk);
      let idx = (faces.indexOf(chunk) + 1 + Math.floor(Math.random() * 5)) % 6;
      let laps = 0;
      const cube = h('div', { class: 'cube small' }, faces.map((f, i) => h('div', { class: `face f${i}` }, colorize(f))));
      const set = () => {
        const [x, y] = CUBE_ORIENT[idx];
        cube.style.transform = `${CUBE_TILT} rotateX(${x}deg) rotateY(${y - 360 * laps}deg)`;
      };
      set();
      const scene = h('button', {
        class: 'scene small', type: 'button', title: 'Повернуть кубик',
        onclick: () => {
          if (row.classList.contains('solved')) return;
          idx = (idx + 1) % 6;
          if (idx === 0) laps++;
          set();
          Sfx.tone([440 + idx * 40], 0.05);
          setTimeout(() => { playSyllableEn(faces[idx]); check(); }, 350);
        },
      }, cube);
      return { scene, chunk, get value() { return faces[idx]; } };
    });
    row.classList.remove('solved');
    row.replaceChildren(...cubes.map((c) => c.scene));

    function check() {
      cubes.forEach((c) => c.scene.classList.toggle('right', c.value === c.chunk));
      if (cubes.every((c) => c.value === c.chunk)) {
        row.classList.add('solved');
        solved++;
        Store.data.cubeScore = (Store.data.cubeScore || 0) + 1;
        Store.save();
        Sfx.good();
        setTimeout(() => playEnglishWordEn(word.en), 300);
        status.replaceChildren(h('div', { class: 'wc-done' }, '🎉 ', colorize(wordDisplay({ en: word.en, name: /^[А-Я]/.test(word.ru) })), ` — ${word.ru}! Собрано слов: ${solved}`));
        nextBtn.style.visibility = 'visible';
        if (solved % 3 === 0) {
          confetti();
          if (typeof Fox !== 'undefined') Fox.celebrate();
        }
      }
    }
    check();
    setTimeout(() => playEnglishWordEn(word.en), 450);
  }

  build();
  return h('div', null, target, row, status, h('div', { class: 'cube-actions' }, nextBtn));
}

function cubePrintMode() {
  const sheets = [
    ['cube_m_n', 'M и N'], ['cube_l_r', 'L и R'], ['cube_d_t', 'D и T'], ['cube_b_p', 'B и P'],
    ['cube_s_f', 'S и F'], ['cube_v_c', 'V и C'], ['cube_g_z', 'G и Z'], ['cube_h_qu', 'H и QU'],
  ];
  return h('div', null,
    h('p', { class: 'task' }, 'Распечатай развёртку, вырежи, согни по линиям и склей настоящий кубик — как в книге!'),
    h('div', { class: 'print-grid' }, sheets.map(([file, label]) => {
      const src = `assets/print/${file}.jpg`;
      return h('div', { class: 'print-card' },
        h('img', { src, alt: `Кубики ${label}`, loading: 'lazy' }),
        h('b', null, `Кубики ${label}`),
        printBtn('Распечатать', () => Printer.image(`Кубики ${label}`, src)));
    })));
}

function renderCubes() {
  const modes = [
    { id: 'word', label: '🧩 Собери слово', render: cubeWordMode },
    { id: 'syl', label: '🎲 Прочитай слог', render: cubeSyllableMode },
    { id: 'print', label: '🖨 Распечатай кубик', render: cubePrintMode },
  ];
  const body = h('div');
  const tabs = h('div', { class: 'tabs' }, modes.map((m, n) => h('button', {
    class: 'tab' + (n === 0 ? ' active' : ''), type: 'button',
    onclick: (e) => {
      tabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      body.replaceChildren(m.render());
    },
  }, m.label)));
  body.append(modes[0].render());
  host().replaceChildren(h('div', { class: 'page' },
    h('div', { class: 'player-head' }, h('a', { class: 'close', href: '#/' }, '✕'), h('div', { class: 'player-title' }, 'Кубики со слогами')),
    tabs, body));
}

// ---------- Алфавит ----------

function renderAlphabet() {
  const known = new Set(BOOK.lessons.flatMap(lessonLetters).flatMap((x) => [...x]));
  host().replaceChildren(h('div', { class: 'page' },
    h('div', { class: 'player-head' }, h('a', { class: 'close', href: '#/' }, '✕'), h('div', { class: 'player-title' }, 'Алфавит английского языка')),
    h('p', { class: 'task' }, 'Нажми на букву, чтобы услышать, как она называется по-английски. Цветные буквы ты изучишь в Алфабэтике, серые — ещё впереди!'),
    h('div', { class: 'abc' }, BOOK.alphabet.map(([L, tr]) => h('button', {
      class: 'abc-cell' + (known.has(L) ? (VOWELS.has(L) ? ' v' : ' c') : ' later'), type: 'button',
      onclick: () => Speech.say(L, 'en'),
    }, h('span', { class: 'abc-l' }, L + L.toLowerCase()), h('span', { class: 'abc-tr' }, `[${tr}]`)))),
    h('img', { class: 'lesson-img', src: img('final'), alt: 'Алфавит английского языка' })));
}

// ---------- Маршрутизация ----------

function go(hash) { location.hash = hash; }

function stopPlayback() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (typeof VowelAudio !== 'undefined') VowelAudio.stop();
  if (typeof ClipAudio !== 'undefined') ClipAudio.stop();
}

function show() {
  stopPlayback();
  const [, kind, id] = location.hash.replace(/^#/, '').split('/');
  const playing = kind === 'lesson' || kind === 'reading' || kind === 'final';
  if (!playing) LessonTracker.abandon();
  if (kind === 'auth') renderAuth();
  else if (playing) renderPlayer(kind, id);
  else if (kind === 'cubes') renderCubes();
  else if (kind === 'alphabet') renderAlphabet();
  else if (kind === 'profile') renderProfile();
  else renderHome();
  Mascots.updateVisibility(kind);
  if (typeof Fox !== 'undefined') Fox.updateVisibility(kind);
}

function route() {
  stopPlayback();
  window.dispatchEvent(new CustomEvent('alfabetica-route'));
}

async function init() {
  Store.load(null);
  Speech.init();
  await Auth.restore();
  if (!Auth.user) Store.load(null);
  Mascots.mount();
  if (typeof Fox !== 'undefined') Fox.mount();
  window.addEventListener('pagehide', () => LessonTracker.abandon());
}

window.Alfa = { init, show };
