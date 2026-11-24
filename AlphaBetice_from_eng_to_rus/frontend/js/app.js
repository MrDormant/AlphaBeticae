let stage = null;
function view() {
  return stage || document.getElementById('legacy-stage') || document.getElementById('app');
}

const IS_EN_RU = BOOK.direction === 'en-ru';

const COURSE = [
  ...BOOK.lessons.map((l) => ({ id: 'l' + l.id, kind: 'lesson', ref: l })),
  ...BOOK.readings.map((r) => ({ id: r.id, kind: 'reading', ref: r })),
];
if (BOOK.final) COURSE.push({ id: 'final', kind: 'final', ref: BOOK.final });

const lessonLetters = (l) => l.letters.flatMap((x) => (IS_EN_RU ? [x.en, x.ru] : [x.en]));

function learnedUpTo(lessonId) {
  return BOOK.lessons.filter((l) => l.id <= lessonId).flatMap(lessonLetters);
}

function wordPool(lessonId) {
  return BOOK.lessons.filter((l) => l.id <= lessonId).flatMap((l) => l.words || []);
}

function isUnlocked(index) {
  if (Store.data.unlockAll || index === 0) return true;
  return !!Store.data.done[COURSE[index - 1].id];
}

function starsFor(mistakes) {
  if (mistakes <= 2) return 3;
  if (mistakes <= 6) return 2;
  return 1;
}

function header() {
  if (window.__REACT_HOME__) return;
  const stars = document.getElementById('stars-count');
  if (stars) stars.textContent = Store.stars();
  const sound = document.getElementById('sound-toggle');
  if (sound) sound.textContent = Store.data.sound ? '🔊' : '🔇';
  const unlock = document.getElementById('unlock-all');
  if (unlock) unlock.checked = !!Store.data.unlockAll;
  const box = document.getElementById('user-box');
  if (!box) return;
  if (Auth.user) {
    box.replaceChildren(
      h('a', { class: 'user-name', href: '#/profile', title: L('Личный кабинет', 'Profile') }, '👤 ', Auth.user.login),
      h('button', {
        class: 'btn ghost small', type: 'button',
        onclick: () => { Auth.logout(); go('#/'); route(); },
      }, L('Выйти', 'Log out')));
  } else {
    box.replaceChildren(h('a', {
      class: 'btn ghost small auth-top', href: '#/auth', title: L('Сохранить прогресс на сервере', 'Save progress on the server'),
    }, L('Войти', 'Sign in')));
  }
}

// ---------- Вход и регистрация ----------

function renderAuth() {
  if (Auth.user) {
    go('#/');
    return;
  }
  let mode = 'login';
  const error = h('div', { class: 'auth-error' });
  const login = h('input', { class: 'auth-input', name: 'login', autocomplete: 'username', placeholder: L('Логин', 'Login'), maxlength: 32, required: true });
  const password = h('input', { class: 'auth-input', name: 'password', type: 'password', autocomplete: 'current-password', placeholder: L('Пароль', 'Password'), maxlength: 72, required: true });
  const submit = h('button', { class: 'btn primary big', type: 'submit' });
  const hint = h('p', { class: 'auth-hint' });
  const tabs = h('div', { class: 'auth-tabs' });

  const setMode = (m) => {
    mode = m;
    error.textContent = '';
    submit.textContent = m === 'login' ? L('Войти ▶', 'Sign in ▶') : L('Зарегистрироваться ▶', 'Register ▶');
    password.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    hint.textContent = m === 'login'
      ? L('Необязательно: войди, чтобы звёзды сохранялись в твоём профиле на любом устройстве.', 'Optional: sign in to keep stars in your profile on any device.')
      : L('Придумай логин (от 3 символов) и пароль (от 4 символов). Звёзды с этого устройства подтянутся в профиль.', 'Choose a login (3+ chars) and password (4+ chars). Stars from this device will merge into your profile.');
    tabs.replaceChildren(
      h('button', { type: 'button', class: m === 'login' ? 'active' : '', onclick: () => setMode('login') }, L('Вход', 'Sign in')),
      h('button', { type: 'button', class: m === 'register' ? 'active' : '', onclick: () => setMode('register') }, L('Регистрация', 'Register')));
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
  view().replaceChildren(h('div', { class: 'auth' },
    h('img', { class: 'auth-img', src: img('hero'), alt: '' }),
    h('div', { class: 'auth-card' },
      h('h1', null, L('Вход и регистрация', 'Sign in')),
      h('p', { class: 'auth-lead' }, L(
        'Уроки можно проходить и без аккаунта. Регистрация нужна, если хочешь сохранить прогресс надолго.',
        'Lessons work without an account. Sign in to save progress on the server.')),
      form,
      h('a', { class: 'link-btn', href: '#/' }, L('← К урокам без регистрации', '← Back to lessons (no sign-in)'))))
  );
  login.focus();
}

// ---------- Главная ----------

function foxVideo() {
  const video = h('video', {
    class: 'hero-img',
    src: 'video/' + encodeURIComponent('лис главная страница.mp4'),
    autoplay: true,
    muted: true,
    loop: true,
    playsinline: true,
    preload: 'auto',
  });
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.play().catch(() => {});
  return video;
}

function renderHome() {
  const name = Store.data.name || (Auth.user && Auth.user.login);
  const learned = BOOK.lessons.filter((l) => Store.data.done['l' + l.id]).flatMap(lessonLetters);

  const sections = [];
  let current = null;
  COURSE.forEach((item, index) => {
    const section = item.kind === 'lesson' ? item.ref.section : L('Почитаем', 'Reading');
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
    const label = item.kind === 'lesson' ? L(`Урок ${item.ref.id}`, `Lesson ${item.ref.id}`) : item.kind === 'reading' ? L('Чтение', 'Reading') : L('Финал', 'Final');
    return h('a', {
      class: 'lesson-card' + (unlocked ? '' : ' locked') + (stars ? ' done' : ''),
      href: unlocked ? `#/${item.kind}/${item.id}` : null,
      onclick: unlocked ? null : (e) => { e.preventDefault(); toast(L('🔒 Сначала пройди предыдущий урок', '🔒 Complete the previous lesson first')); },
    },
    h('div', { class: 'lc-badge' }, item.kind === 'lesson' ? colorize(badge) : badge),
    h('div', { class: 'lc-body' },
      h('div', { class: 'lc-num' }, label),
      h('div', { class: 'lc-title' }, item.ref.title)),
    h('div', { class: 'lc-stars' }, unlocked ? [1, 2, 3].map((n) => h('span', { class: n <= stars ? 'on' : '' }, '★')) : '🔒'));
  };

  const nextIndex = COURSE.findIndex((c) => !Store.data.done[c.id]);
  const next = nextIndex >= 0 ? COURSE[nextIndex] : null;

  view().replaceChildren(
    h('section', { class: 'hero-block' },
      h('div', { class: 'hero-text' },
        h('h1', null, name ? (IS_EN_RU ? `Hello, ${name}!` : `Привет, ${name}!`) : (IS_EN_RU ? 'Hello!' : 'Привет!')),
        h('p', null, IS_EN_RU
          ? 'Letters A and O build a team to help English speakers learn Cyrillic and start reading Russian. Open lessons, sing vowels, play games, collect stars!'
          : 'Буквы А и О собирают команду, чтобы помочь российским ребятам научиться читать и писать по-английски. Проходи уроки, читай слоги и слова, играй и собирай звёзды!'),
        next ? h('a', { class: 'btn primary big', href: `#/${next.kind}/${next.id}` },
          Store.stars() ? (IS_EN_RU ? 'Continue ▶' : 'Продолжить ▶') : (IS_EN_RU ? 'Start lesson 1 ▶' : 'Начать первый урок ▶'))
          : h('div', { class: 'all-done' }, IS_EN_RU ? '🏆 Starter complete!' : '🏆 Все уроки пройдены!')),
      foxVideo()),
    storyTeaser(),
    h('section', { class: 'team-block' },
      h('div', { class: 'team-title' }, IS_EN_RU ? 'My letter team' : 'Моя команда букв'),
      learned.length ? teamStrip(learned) : h('p', { class: 'muted' }, IS_EN_RU
        ? 'Finish lesson 1 — Aа, Oо, Ээ, Ыы, Ии and Уу join your team.'
        : 'Пройди первый урок, и в команде появятся гласные A O E I U.')),
    h('section', { class: 'games' },
      h('a', { class: 'game-card', href: '#/cubes' }, h('span', { class: 'gc-icon' }, '🎲'), h('b', null, IS_EN_RU ? 'Syllable cubes' : 'Кубики со слогами'), h('span', null, IS_EN_RU ? 'Spin cubes and build words' : 'Крути кубики и собирай слова')),
      h('a', { class: 'game-card', href: '#/alphabet' }, h('span', { class: 'gc-icon' }, '🔤'), h('b', null, IS_EN_RU ? 'Russian alphabet' : 'Русский алфавит'), h('span', null, IS_EN_RU ? 'Letters from the book' : 'Буквы со страниц книги')),
      h('a', { class: 'game-card', href: '#/profile' }, h('span', { class: 'gc-icon' }, '🏅'), h('b', null, IS_EN_RU ? 'Profile' : 'Личный кабинет'), h('span', null, IS_EN_RU ? 'Stars and progress' : 'Мои звёзды и пройденные уроки'))),
    h('section', { class: 'map-section' },
      h('div', { class: 'lesson-list row' }, sections.flatMap((s) => s.items).map(card))),
    h('section', { class: 'settings' },
      h('button', {
        class: 'btn ghost small', type: 'button',
        onclick: () => { if (confirm(L('Сбросить весь прогресс и звёзды?', 'Reset all progress and stars?'))) { Store.reset(); header(); renderHome(); } },
      }, L('Сбросить прогресс', 'Reset progress'))),
    h('footer', { class: 'credits' },
      IS_EN_RU
        ? 'Based on «ALFABETICA · FROM ENGLISH TO RUSSIAN · STARTER» by Y.O. Chumakova, Meenakshi Arun Kumar, Kataria Yash Vijay. Art by Russian schoolchildren.'
        : 'По учебно-методическому пособию Ю.О. Чумаковой «АЛФАБЭТИКА. ALFABETICA. От русского к английскому». Иллюстрации выполнены учениками МБОУ СОШ №12 г. Новочеркасска.'));
}

function storyTeaser() {
  const lines = BOOK.lessons[0].story[0].dialogue.slice(0, 3);
  const page = { image: null, dialogue: lines };
  const holder = h('div', { class: 'teaser-dialogue' }, Ex.dialogue(page, { done() {} }));
  return h('section', { class: 'story-teaser' },
    h('div', { class: 'teaser-head' },
      h('h2', null, IS_EN_RU ? 'Meet A and O!' : 'Знакомьтесь: А и О!'),
      h('p', { class: 'muted' }, IS_EN_RU
        ? 'Our heroes. Tap them to say hi. Here is how the story begins:'
        : 'Две главные героини Алфабэтики. Нажми на них — они поздороваются. А вот с чего всё началось:')),
    h('div', { class: 'teaser-heroes' }, Hero('A', { size: 96 }), Hero('O', { size: 96 })),
    holder,
    h('a', { class: 'btn primary', href: '#/lesson/l1' }, IS_EN_RU ? '📖 Read full story' : '📖 Почитать историю целиком'));
}

// ---------- Личный кабинет ----------

const formatDate = (iso) => new Date(iso).toLocaleDateString(IS_EN_RU ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function courseLabel(item) {
  if (item.kind === 'lesson') return L(`Урок ${item.ref.id}. ${item.ref.title}`, `Lesson ${item.ref.id}. ${item.ref.title}`);
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
  const who = Auth.user ? Auth.user.login : L('Гость', 'Guest');

  const stat = (icon, value, label) => h('div', { class: 'stat' },
    h('div', { class: 'stat-icon' }, icon), h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label));

  const rows = COURSE.map((item, index) => {
    const s = done[item.id] || 0;
    const unlocked = isUnlocked(index);
    return h('div', { class: 'pr-row' + (s ? ' done' : '') },
      h('div', { class: 'pr-status' }, s ? '✅' : unlocked ? '▶️' : '🔒'),
      h('div', { class: 'pr-title' },
        h('div', null, courseLabel(item)),
        h('div', { class: 'pr-date' }, s && dates[item.id] ? L(`Пройден ${formatDate(dates[item.id])}`, `Completed ${formatDate(dates[item.id])}`) : s ? L('Пройден', 'Completed') : unlocked ? L('Можно проходить', 'Available') : L('Ещё закрыт', 'Locked'))),
      h('div', { class: 'lc-stars' }, [1, 2, 3].map((n) => h('span', { class: n <= s ? 'on' : '' }, '★'))),
      unlocked ? h('a', { class: 'btn ghost small', href: `#/${item.kind}/${item.id}` }, s ? L('Повторить', 'Replay') : L('Пройти', 'Start')) : h('span'));
  });

  view().replaceChildren(h('div', { class: 'page profile' },
    h('div', { class: 'player-head' }, h('a', { class: 'close', href: '#/' }, '✕'), h('div', { class: 'player-title' }, L('Личный кабинет', 'Profile'))),
    h('div', { class: 'profile-head' },
      h('div', { class: 'avatar' }, who[0].toUpperCase()),
      h('div', null,
        h('h1', null, who),
        h('div', { class: 'muted' },
          Auth.user && Auth.user.created_at ? L(`В Алфабэтике с ${formatDate(Auth.user.created_at)}`, `On Alfabetica since ${formatDate(Auth.user.created_at)}`) : L('Занимаешься без регистрации', 'Studying without sign-in'),
          lastDate ? L(` · последний урок ${formatDate(lastDate)}`, ` · last lesson ${formatDate(lastDate)}`) : ''))),
    !Auth.user ? h('div', { class: 'guest-note' },
      L('Прогресс на этом устройстве. Чтобы не потерять звёзды, создай профиль.', 'Progress is on this device only. Create a profile to keep your stars.'),
      h('a', { class: 'btn primary small', href: '#/auth' }, L('Войти / регистрация', 'Sign in / register'))) : null,
    h('div', { class: 'stats' },
      stat('⭐', `${stars} / ${maxStars}`, L('звёзд собрано', 'stars collected')),
      stat('📚', `${passed.length} / ${COURSE.length}`, L('уроков пройдено', 'lessons completed')),
      stat('🔤', learned.length, L('букв в команде', 'letters in team')),
      stat('🎲', Store.data.cubeScore || 0, L('ответов в кубиках', 'cube answers'))),
    h('div', { class: 'total-progress' },
      h('div', { class: 'tp-label' }, L(`Пройдено ${percent}% Алфабэтики`, `${percent}% of Starter completed`)),
      h('div', { class: 'progress-bar big' }, h('div', { class: 'progress-fill', style: { width: percent + '%' } }))),
    next ? h('a', { class: 'btn primary', href: `#/${next.kind}/${next.id}` }, L(`Дальше: ${courseLabel(next)} ▶`, `Next: ${courseLabel(next)} ▶`)) : h('div', { class: 'all-done' }, L('🏆 Вся Алфабэтика пройдена!', '🏆 Starter complete!')),
    h('div', { class: 'team' },
      h('div', { class: 'team-title' }, L('Моя команда букв', 'My letter team')),
      learned.length ? teamStrip(learned) : h('p', { class: 'muted' }, L('Пока пусто — пройди первый урок!', 'Empty — finish lesson 1!'))),
    h('h2', { class: 'step-title' }, L('Мои уроки', 'My lessons')),
    h('div', { class: 'pr-list' }, rows)));
}

// ---------- Шаги уроков ----------

function bookRemember(lesson, ctx) {
  const name = lesson.signName ? h('input', {
    class: 'name-input',
    placeholder: 'Write your name',
    value: Store.data.name || '',
    maxlength: 24,
    oninput: (e) => { Store.data.name = e.target.value.trim(); Store.save(); },
  }) : null;
  return h('div', null,
    lesson.more ? h('div', { class: 'reading-card' }, lesson.more.map((line) => mixedText(line))) : null,
    name ? h('p', { class: 'task' }, 'Ты кто? Кто ты? _________ (Write your name)') : null,
    name,
    Ex.remember(lesson.remember, ctx, 'Remember. Match the pairs printed in the book.'));
}

function insertPoem(lesson, steps) {
  const poem = window.POEMS && window.POEMS[lesson.id];
  if (!poem || typeof Ex.poem !== 'function') return steps;
  const step = { title: poem.title || 'Poem', render: (ctx) => Ex.poem(poem, ctx) };
  steps.push(step);
  return steps;
}

function lessonSteps(lesson) {
  if (lesson.id === 1) {
    const steps = [
      { title: 'Alphabet', render: (ctx) => Ex.vowelChant(ctx) },
    ];
    lesson.story.forEach((p, n) => steps.push({
      title: n === 0 ? "Let's meet!" : 'Latin and Cyrillic',
      render: (ctx) => Ex.storyPage(p, ctx),
    }));
    steps.push({ title: 'Look!', render: (ctx) => Ex.vowelExamples(lesson.vowelExamples, ctx) });
    return insertPoem(lesson, steps);
  }

  const steps = [
    { title: '1. Syllable table', render: (ctx) => Ex.syllableTable(lesson.syllables, ctx) },
    { title: '2. Read', render: (ctx) => Ex.wordCards(lesson.words, ctx) },
    { title: '3. Read', render: (ctx) => Ex.reading(lesson, ctx) },
  ];
  (lesson.traces || []).forEach((lines, i) => {
    steps.push({
      title: (lesson.traceTitles && lesson.traceTitles[i]) || 'Trace words',
      render: (ctx) => Ex.tracing(lines, ctx, `Lesson ${lesson.id}`),
    });
  });
  if (lesson.readFive) steps.push({ title: '7. Read in Russian 5 times', render: (ctx) => Ex.readFive(lesson.readFive, ctx, lesson.readFiveAudio) });
  if (lesson.crossword) steps.push({ title: '8. Fill the crossword', render: (ctx) => Ex.crossword(lesson.crossword, ctx) });
  if (lesson.remember) steps.push({ title: lesson.rememberTitle || 'Remember', render: (ctx) => bookRemember(lesson, ctx) });
  if (lesson.grid) steps.push({ title: '10. Find Russian words', render: (ctx) => Ex.wordSearch(lesson.grid, ctx, lesson.gridImage) });
  if (lesson.pronouns) steps.push({ title: '11. Он и она', render: (ctx) => Ex.pronounPicture(ctx) });
  return insertPoem(lesson, steps);
}

function readingSteps(reading) {
  return [
    {
      title: reading.title,
      render: (ctx) => {
        ctx.done();
        return h('div', { class: 'reading' },
          h('img', { class: 'lesson-img', src: img(reading.image), alt: '' }),
          h('p', { class: 'task' }, L('Прочитай текст. Нажимай на английские слова, если забыл, что они значат.', 'Read the text. Tap words if you need a hint.')),
          h('div', { class: 'reading-card' }, reading.text.map(mixedText)));
      },
    },
    { title: L('Вопросы по тексту', 'Questions about the text'), render: (ctx) => Ex.finalQuestions(reading, ctx) },
  ];
}

function finalSteps(fin) {
  return [
    { title: L('Мы готовы!', 'We are ready!'), render: (ctx) => Ex.storyPage({ image: null, dialogue: fin.epilogue }, ctx) },
    { title: 'It is …', render: (ctx) => Ex.sentences(fin.sentences, ctx) },
    {
      title: L('Переведи предложение', 'Translate the sentence'),
      render: (ctx) => Ex.quiz(sample(fin.sentences, 6).map((s) => ({
        prompt: h('span', { class: 'q-sent' }, colorize(s.en)),
        say: s.en,
        answer: s.ru,
        options: [s, ...sample(fin.sentences.filter((x) => x !== s), 2)].map((o) => ({ key: o.ru, label: o.ru })),
      })), ctx, L('Что значит это предложение?', 'What does this sentence mean?')),
    },
    { title: L('Реки и города', 'Rivers and cities'), render: (ctx) => Ex.match(fin.places, ctx, L('Прочитай названия рек и городов России и найди пару для каждого.', 'Read each Russian name and find its English pair.')) },
    { title: L('Напиши своё имя', 'Write your name'), render: (ctx) => Ex.myName(ctx) },
  ];
}

// ---------- Проигрыватель урока ----------

function renderPlayer(kind, id) {
  const index = COURSE.findIndex((c) => c.id === id);
  const item = COURSE[index];
  if (!item) return go('#/');
  if (!isUnlocked(index)) { toast(L('🔒 Сначала пройди предыдущий урок', '🔒 Complete the previous lesson first')); return go('#/'); }

  const steps = item.kind === 'lesson' ? lessonSteps(item.ref)
    : item.kind === 'reading' ? readingSteps(item.ref) : finalSteps(item.ref);
  let step = 0;
  let mistakes = 0;

  const title = item.kind === 'lesson' ? L(`Урок ${item.ref.id}. ${item.ref.title}`, `Lesson ${item.ref.id}. ${item.ref.title}`) : item.ref.title;
  const progress = h('div', { class: 'progress-bar' }, h('div', { class: 'progress-fill' }));
  const dots = h('div', { class: 'progress-label' });
  const switcher = h('div', { class: 'step-switch' });
  const stage = h('div', { class: 'stage' });
  const stepTitle = h('h2', { class: 'step-title' });
  const cleared = new Set();
  const back = h('button', { class: 'btn ghost', type: 'button', onclick: () => { if (step > 0) { step--; show(); } } }, L('◀ Назад', '◀ Back'));
  const next = h('button', { class: 'btn primary', type: 'button', onclick: () => { step++; show(); } }, L('Дальше ▶', 'Next ▶'));

  const paintSwitcher = () => {
    switcher.replaceChildren(...steps.map((s, i) => h('button', {
      class: 'step-pill' + (i === step ? ' on' : '') + (cleared.has(i) ? ' done' : ''),
      type: 'button',
      title: s.title,
      onclick: () => { if (i !== step) { step = i; show(); } },
    }, String(i + 1))));
  };

  const show = () => {
    if (step >= steps.length) return finish();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (typeof ClipAudio !== 'undefined') ClipAudio.stop();
    if (typeof VowelAudio !== 'undefined') VowelAudio.stop();
    if (typeof PoemPlayer !== 'undefined') PoemPlayer.stop();
    const s = steps[step];
    progress.firstChild.style.width = `${((step + 1) / steps.length) * 100}%`;
    dots.textContent = L(`Шаг ${step + 1} из ${steps.length}`, `Step ${step + 1} of ${steps.length}`);
    stepTitle.textContent = s.title;
    next.disabled = false;
    next.classList.toggle('pulse', cleared.has(step));
    back.style.visibility = step > 0 ? 'visible' : 'hidden';
    paintSwitcher();
    const ctx = {
      done: () => { cleared.add(step); next.classList.add('pulse'); paintSwitcher(); },
      mistake: () => { mistakes++; },
    };
    stage.replaceChildren(s.render(ctx));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = () => {
    const stars = starsFor(mistakes);
    Store.complete(item.id, stars);
    header();
    Sfx.win();
    confetti();
    const after = COURSE[index + 1];
    const newLetters = item.kind === 'lesson' ? lessonLetters(item.ref) : [];
    view().replaceChildren(h('div', { class: 'finish' },
      h('h1', null, item.kind === 'final' ? L('Ура! Ты прошёл всю Алфабэтику!', 'Hooray! You finished Starter!') : L('Урок пройден!', 'Lesson complete!')),
      h('div', { class: 'finish-stars' }, [1, 2, 3].map((n) => h('span', { class: n <= stars ? 'on' : '' }, '★'))),
      h('p', null, mistakes === 0 ? L('Ни одной ошибки! Великолепно!', 'No mistakes! Awesome!') : L(
        `Ошибок: ${mistakes}. ${stars === 3 ? 'Отлично!' : 'Можно пройти ещё раз и получить больше звёзд.'}`,
        `Mistakes: ${mistakes}. ${stars === 3 ? 'Great!' : 'Try again for more stars.'}`)),
      newLetters.length ? h('div', { class: 'team' },
        h('div', { class: 'team-title' }, L('В команду пришли новые буквы!', 'New letters joined the team!')),
        teamStrip(learnedUpTo(item.ref.id), newLetters)) : null,
      h('div', { class: 'finish-actions' },
        h('a', { class: 'btn ghost', href: '#/' }, L('🗺️ К урокам', '🗺️ To lessons')),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => renderPlayer(kind, id) }, L('🔁 Ещё раз', '🔁 Again')),
        after ? h('a', { class: 'btn primary', href: `#/${after.kind}/${after.id}` }, L('Следующий урок ▶', 'Next lesson ▶')) : null)));
  };

  view().replaceChildren(h('div', { class: 'player' },
    h('div', { class: 'player-head' },
      h('a', { class: 'close', href: '#/', title: L('К урокам', 'To lessons') }, '✕'),
      h('div', { class: 'player-title' }, title)),
    progress, dots, switcher, stepTitle, stage,
    h('div', { class: 'player-nav' }, back, next)));
  show();
}

// ---------- Кубики ----------

function cubeSyllableMode() {
  const cubes = BOOK.lessons.filter((l) => l.id > 1).flatMap((l) => l.letters.filter((x) => x.en.length === 1).map((letter) => {
    const faces = l.syllables.filter((s) => s.en[0] === letter.en).slice(0, 6);
    return { letter: letter.en, ru: letter.ru, faces, lesson: l.id };
  }));
  let currentCube = cubes[0];
  let spins = 0;
  let busy = false;
  let score = Store.data.cubeScore || 0;

  const orient = [[0, 0], [0, -90], [0, -180], [0, 90], [-90, 0], [90, 0]];
  const tilt = 'rotateX(-14deg) rotateY(18deg)';
  const cube = h('div', { class: 'cube' });
  const scene = h('div', { class: 'scene' }, cube);
  const question = h('div', { class: 'cube-question' }, L('Нажми «Бросить кубик»!', 'Tap «Roll the cube»!'));
  const scoreBox = h('div', { class: 'cube-score' });
  const updateScore = () => { scoreBox.textContent = L(`⭐ Правильных ответов: ${score}`, `⭐ Correct: ${score}`); };

  const buildCube = () => {
    cube.replaceChildren(...currentCube.faces.map((f, i) => h('div', { class: `face f${i}` }, colorize(f.en))));
    cube.style.transform = `${tilt} rotateX(0deg) rotateY(${360 * spins}deg)`;
    question.replaceChildren(L('Нажми «Бросить кубик»!', 'Tap «Roll the cube»!'));
  };

  const roll = () => {
    if (busy) return;
    busy = true;
    spins++;
    const n = Math.floor(Math.random() * 6);
    const face = currentCube.faces[n];
    const [x, y] = orient[n];
    cube.style.transform = `${tilt} rotateX(${x + 360 * spins}deg) rotateY(${y + 360 * spins}deg)`;
    question.replaceChildren(L('Кубик катится…', 'Rolling…'));
    setTimeout(() => {
      busy = false;
      const opts = uniq([face.ru, ...sample(currentCube.faces.filter((f) => f.ru !== face.ru).map((f) => f.ru), 2)]);
      question.replaceChildren(
        h('div', { class: 'quiz-q' }, L('Как читается ', 'How do you read '), h('b', null, colorize(face.en)), '?'),
        h('div', { class: 'quiz-options' }, shuffle(opts).map((o) => h('button', {
          class: 'option', type: 'button',
          onclick: (e) => {
            if (o === face.ru) {
              e.currentTarget.classList.add('ok'); Sfx.good(); playChunk(face.en);
              score++; Store.data.cubeScore = score; Store.save(); updateScore();
              question.querySelectorAll('.option').forEach((b) => { b.disabled = true; });
            } else {
              e.currentTarget.classList.add('bad'); e.currentTarget.disabled = true; Sfx.bad(); shake(e.currentTarget);
            }
          },
        }, o))));
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
    h('p', { class: 'task' }, L('Выбери кубик с буквой, брось его и прочитай слог, который выпал.', 'Pick a letter cube, roll it, and read the syllable.')),
    picker, scene,
    h('div', { class: 'cube-actions' }, h('button', { class: 'btn primary big', type: 'button', onclick: roll }, L('🎲 Бросить кубик', '🎲 Roll the cube'))),
    question, scoreBox);
}

const CUBE_ORIENT = [[0, 0], [0, -90], [0, -180], [0, 90], [-90, 0], [90, 0]];
const CUBE_TILT = 'rotateX(-14deg) rotateY(18deg)';

const CHUNK_LETTER = { A: 'А', O: 'О', E: 'Э', Y: 'Ы', I: 'И', U: 'У', N: 'Н', T: 'Т', K: 'К', S: 'С' };
// One take of each syllable. The lesson files repeat it, and that repeat was playing on every turn.
const CUBE_SYL = {
  NA: 'assets/audio/cubes/na.m4a', NO: 'assets/audio/cubes/no.m4a', NE: 'assets/audio/cubes/ne.m4a',
  NY: 'assets/audio/cubes/ny.m4a', NI: 'assets/audio/cubes/ni.m4a', NU: 'assets/audio/cubes/nu.m4a',
  TA: 'assets/audio/cubes/ta.m4a', TO: 'assets/audio/cubes/to.m4a', TE: 'assets/audio/cubes/te.m4a',
  TI: 'assets/audio/cubes/ti.m4a', TY: 'assets/audio/cubes/ty.m4a', TU: 'assets/audio/cubes/tu.m4a',
  KA: 'assets/audio/cubes/ka.m4a', KO: 'assets/audio/cubes/ko.m4a', KI: 'assets/audio/cubes/ki.m4a', KU: 'assets/audio/cubes/ku.m4a',
  SA: 'assets/audio/cubes/sa.m4a', SO: 'assets/audio/cubes/so.m4a', SE: 'assets/audio/cubes/se.m4a',
  SI: 'assets/audio/cubes/si.m4a', SU: 'assets/audio/cubes/su.m4a',
  A: 'assets/audio/vowels/a.m4a', O: 'assets/audio/vowels/o.m4a', E: 'assets/audio/vowels/e.m4a',
  I: 'assets/audio/vowels/i.m4a', U: 'assets/audio/vowels/u.m4a',
};
const CUBE_WORD_AUDIO = {
  Anna: 'assets/audio/l2/anna.m4a?v=2',
  Nina: 'assets/audio/l2/nina.m4a?v=2',
  Inna: 'assets/audio/l2/inna.m4a?v=2',
  Nonna: 'assets/audio/l2/nonna.m4a?v=2',
  Nata: 'assets/audio/words/nata.m4a',
  Anton: 'assets/audio/words/anton.m4a',
};
const CUBE_WORD_RU = {
  Anna: 'Анна', Nina: 'Нина', Inna: 'Инна', Nonna: 'Нонна',
  Nata: 'Ната', Anton: 'Антон', Nikita: 'Никита', Nika: 'Ника',
  cat: 'кот', duck: 'утка', 'who?': 'кто', 'how?': 'как',
};

function playChunk(latin) {
  const key = String(latin).toUpperCase();
  const src = CUBE_SYL[key];
  if (src && typeof ClipAudio !== 'undefined') return ClipAudio.playThrough(src);
  const cyr = [...key].map((ch) => CHUNK_LETTER[ch] || '').join('');
  if (cyr) return Speech.sayAsync(cyr, 'ru');
  return Promise.resolve();
}

function playCubeWord(word) {
  const src = CUBE_WORD_AUDIO[word.ru];
  if (src && typeof ClipAudio !== 'undefined') return ClipAudio.playThrough(src);
  const say = CUBE_WORD_RU[word.ru];
  if (say) return Speech.sayAsync(say, 'ru');
  return Promise.resolve();
}

const CUBE_WORDS = [
  ['NA|NA', 'Anna'], ['NI|NA', 'Nina'], ['IN|NA', 'Inna'], ['NO|N|NA', 'Nonna'],
  ['NA|TA', 'Nata'], ['AN|TON', 'Anton'], ['NI|KI|TA', 'Nikita'], ['NI|KA', 'Nika'],
  ['KOT', 'cat'], ['UT|KA', 'duck'], ['KTO', 'who?'], ['KAK', 'how?'],
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
  const nextBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => { wi++; build(); } }, L('Следующее слово ▶', 'Next word ▶'));

  const faceSet = (chunk) => {
    const sameType = allChunks.filter((c) => c !== chunk && (c.length === chunk.length || Math.random() < 0.3));
    return shuffle([chunk, ...sample(sameType, 5)]);
  };

  function build() {
    if (wi >= order.length) { order = shuffle(CUBE_WORDS); wi = 0; }
    const word = order[wi];
    nextBtn.style.visibility = 'hidden';
    target.replaceChildren(
      h('span', { class: 'wc-task' }, L(`Собери слово «${word.ru}»`, `Build the word «${word.ru}»`)),
      h('button', { class: 'listen', type: 'button', title: L('Послушать', 'Listen'), onclick: () => playCubeWord(word) }, '🔊'),
      h('span', { class: 'wc-hint' }, L(' — нажимай на кубики, они поворачиваются', ' — tap cubes to rotate them')));
    status.replaceChildren(h('span', { class: 'muted' }, L('Подсказка: послушай слово и найди нужный слог на каждом кубике.', 'Tip: listen to the word and find each syllable on the cubes.')));
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
        class: 'scene small', type: 'button', title: L('Повернуть кубик', 'Rotate cube'),
        onclick: () => {
          if (row.classList.contains('solved')) return;
          idx = (idx + 1) % 6;
          if (idx === 0) laps++;
          set();
          Sfx.tone([440 + idx * 40], 0.05);
          setTimeout(() => { playChunk(faces[idx]); check(); }, 350);
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
        setTimeout(() => playCubeWord(word), 300);
        status.replaceChildren(h('div', { class: 'wc-done' }, '🎉 ', colorize(wordDisplay({ en: word.en, name: /^[A-Z]/.test(word.en) })), L(` — ${word.ru}! Собрано слов: ${solved}`, ` — ${word.ru}! Words built: ${solved}`)));
        nextBtn.style.visibility = 'visible';
        if (solved % 3 === 0) confetti();
      }
    }
    check();
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
    h('p', { class: 'task' }, L('Распечатай развёртку, вырежи, согни по линиям и склей настоящий кубик — как в книге!', 'Print the template, cut, fold, and glue a real cube — like in the book!')),
    h('div', { class: 'print-grid' }, sheets.map(([file, label]) => {
      const src = `assets/print/${file}.jpg`;
      return h('div', { class: 'print-card' },
        h('img', { src, alt: `Кубики ${label}`, loading: 'lazy' }),
        h('b', null, `Кубики ${label}`),
        printBtn(L('Распечатать', 'Print'), () => Printer.image(`Cubes ${label}`, src)));
    })));
}

function renderCubes() {
  const modes = [
    { id: 'word', label: L('🧩 Собери слово', '🧩 Build a word'), render: cubeWordMode },
    { id: 'syl', label: L('🎲 Прочитай слог', '🎲 Read a syllable'), render: cubeSyllableMode },
    { id: 'print', label: L('🖨 Распечатай кубик', '🖨 Print a cube'), render: cubePrintMode },
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
  view().replaceChildren(h('div', { class: 'page' },
    h('div', { class: 'player-head' }, h('a', { class: 'close', href: '#/' }, '✕'), h('div', { class: 'player-title' }, L('Кубики со слогами', 'Syllable cubes'))),
    tabs, body));
}

// ---------- Алфавит ----------

function renderAlphabet() {
  view().replaceChildren(h('div', { class: 'page' },
    h('div', { class: 'player-head' }, h('a', { class: 'close', href: '#/' }, '✕'), h('div', { class: 'player-title' }, L('Русский алфавит', 'Russian alphabet'))),
    h('p', { class: 'task' }, L(
      'Алфавит со страниц книги. Красные — гласные, синие — согласные, Ъ и Ь — знаки. Нажми букву, чтобы услышать её.',
      'The alphabet printed in the book. Red letters are vowels, blue letters are consonants, Ъ and Ь are signs. Tap a letter to hear it.')),
    h('div', { class: 'abc' }, BOOK.alphabet.map(([up, low, kind]) => h('button', {
      class: 'abc-cell ' + kind, type: 'button',
      onclick: () => Speech.say(up, 'ru'),
    }, h('span', { class: 'abc-l' }, up + low)))),
    h('img', { class: 'lesson-img', src: img('lesson5'), alt: '' })));
}

// ---------- Маршрутизация ----------

function go(hash) { location.hash = hash; }

function route() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (typeof ClipAudio !== 'undefined') ClipAudio.stop();
  if (typeof VowelAudio !== 'undefined') VowelAudio.stop();
  const [, kind, id] = location.hash.replace(/^#/, '').split('/');
  if (!kind && window.__REACT_HOME__) {
    if (view()) view().replaceChildren();
    header();
    Mascots.updateVisibility('');
    return;
  }
  if (kind === 'auth') renderAuth();
  else if (kind === 'lesson' || kind === 'reading' || kind === 'final') renderPlayer(kind, id);
  else if (kind === 'cubes') renderCubes();
  else if (kind === 'alphabet') renderAlphabet();
  else if (kind === 'profile') renderProfile();
  else renderHome();
  header();
  Mascots.updateVisibility(kind);
}

window.Alfa = {
  attach(el) { stage = el; },
  route,
  header,
  course: COURSE,
  unlocked: isUnlocked,
  teaser: storyTeaser,
};

window.Alfa.booted = (async () => {
  Store.load(null);
  Speech.init();
  await Auth.restore();
  if (!Auth.user) Store.load(null);
  if (!window.__REACT_HOME__) {
    const sound = document.getElementById('sound-toggle');
    if (sound) {
      sound.addEventListener('click', () => {
        Store.data.sound = !Store.data.sound;
        Store.save();
        header();
      });
    }
    const unlockAll = document.getElementById('unlock-all');
    if (unlockAll) {
      unlockAll.addEventListener('change', (e) => {
        Store.data.unlockAll = e.target.checked;
        Store.save();
        route();
      });
    }
  }
  window.addEventListener('hashchange', () => {
    if (window.__REACT_HOME__) return;
    route();
  });
  Mascots.mount();
  if (!window.__REACT_HOME__) {
    try {
      route();
    } catch (err) {
      console.error(err);
      view().replaceChildren(h('div', { class: 'auth-error' }, 'Boot error: ', String(err.message || err)));
    }
  }
})();
