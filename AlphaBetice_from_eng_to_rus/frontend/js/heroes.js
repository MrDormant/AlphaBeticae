// Герои А и О: SVG-буквы с лицами, история по ролям, пропевка гласных, печать.

const HERO_VOICE = { A: { pitch: 1.35, rate: 0.9 }, O: { pitch: 1.05, rate: 0.85 }, null: { pitch: 1, rate: 0.85 } };
const HERO_NAME = { A: 'А', O: 'О' };

const HERO_SVG = {
  A: `
    <svg viewBox="0 0 120 140" class="hero-svg" aria-hidden="true">
      <ellipse class="h-shadow" cx="60" cy="134" rx="38" ry="5"/>
      <path class="h-body" d="M60 14 L100 120 M60 14 L20 120 M34 88 L86 88"/>
      <g class="h-bow"><path d="M60 14 l-16 -9 v18 z M60 14 l16 -9 v18 z"/><circle cx="60" cy="14" r="5"/></g>
      <g class="h-face">
        <circle class="h-blush" cx="38" cy="72" r="6"/><circle class="h-blush" cx="82" cy="72" r="6"/>
        <g class="h-eyes">
          <circle class="h-eye" cx="49" cy="58" r="9"/><circle class="h-eye" cx="71" cy="58" r="9"/>
          <circle class="h-pupil" cx="50" cy="59" r="4.5"/><circle class="h-pupil" cx="72" cy="59" r="4.5"/>
          <circle class="h-glint" cx="52" cy="56" r="1.6"/><circle class="h-glint" cx="74" cy="56" r="1.6"/>
        </g>
        <path class="h-smile" d="M51 74 Q60 82 69 74"/>
        <ellipse class="h-mouth" cx="60" cy="76" rx="6" ry="5"/>
      </g>
      <g class="h-feet"><ellipse cx="22" cy="124" rx="11" ry="6"/><ellipse cx="98" cy="124" rx="11" ry="6"/></g>
    </svg>`,
  O: `
    <svg viewBox="0 0 120 140" class="hero-svg" aria-hidden="true">
      <ellipse class="h-shadow" cx="60" cy="134" rx="38" ry="5"/>
      <ellipse class="h-body" cx="60" cy="70" rx="38" ry="50"/>
      <g class="h-bow o-bow"><path d="M84 26 l-6 -16 l14 6 z M84 26 l16 -4 l-8 13 z"/><circle cx="84" cy="25" r="5"/></g>
      <g class="h-face">
        <circle class="h-blush" cx="40" cy="80" r="6"/><circle class="h-blush" cx="80" cy="80" r="6"/>
        <g class="h-eyes">
          <circle class="h-eye" cx="49" cy="62" r="9"/><circle class="h-eye" cx="71" cy="62" r="9"/>
          <circle class="h-pupil" cx="50" cy="63" r="4.5"/><circle class="h-pupil" cx="72" cy="63" r="4.5"/>
          <circle class="h-glint" cx="52" cy="60" r="1.6"/><circle class="h-glint" cx="74" cy="60" r="1.6"/>
        </g>
        <path class="h-smile" d="M51 80 Q60 88 69 80"/>
        <ellipse class="h-mouth" cx="60" cy="82" rx="6" ry="5"/>
      </g>
      <g class="h-feet"><ellipse cx="42" cy="124" rx="11" ry="6"/><ellipse cx="78" cy="124" rx="11" ry="6"/></g>
    </svg>`,
};

function Hero(letter, opts = {}) {
  const el = h('div', {
    class: `hero-char hero-${letter.toLowerCase()} ${opts.cls || ''}`,
    style: opts.size ? { width: opts.size + 'px' } : null,
    title: BOOK.direction === 'en-ru' ? `Letter ${letter}` : `Буква ${HERO_NAME[letter]}`,
    html: HERO_SVG[letter],
  });
  if (opts.clickable !== false) {
    el.addEventListener('click', () => {
      heroTalk(el, true);
      Speech.sayAsync(HERO_NAME[letter], 'ru', HERO_VOICE[letter]).then(() => heroTalk(el, false));
      el.classList.remove('jump');
      void el.offsetWidth;
      el.classList.add('jump');
    });
  }
  return el;
}

function heroTalk(el, on) {
  if (el) el.classList.toggle('talking', on);
}

// Диалог А и О: облачка с репликами, можно читать по ролям.
Ex.dialogue = (page, ctx) => {
  ctx.done();
  const lines = page.dialogue;
  let playing = false;
  const rows = lines.map((line) => {
    const hero = line.who ? Hero(line.who, { size: 74 }) : null;
    const bubble = h('div', { class: 'bubble' + (line.who ? '' : ' narrator') },
      line.who ? h('div', { class: 'bubble-who' }, HERO_NAME[line.who], line.note ? h('span', null, ` — ${line.note}`) : null) : null,
      h('div', { class: 'bubble-text' }, line.say),
      h('button', {
        class: 'listen', type: 'button', title: window.L ? L('Послушать', 'Listen') : 'Listen',
        onclick: async (e) => {
          e.stopPropagation();
          if (page.audioClips && page.audioClips.length) {
            if (!playing) playBtn.click();
            return;
          }
          await speakLine(line, row, hero);
        },
      }, '🔊'));
    const row = h('div', { class: `dlg-row ${line.who === 'A' ? 'right' : 'left'}${line.who ? '' : ' center'}` }, hero, bubble);
    return { row, hero, line };
  });

  async function speakLine(line, row, hero) {
    rows.forEach((r) => r.row.classList.remove('active'));
    row.classList.add('active');
    heroTalk(hero, true);
    const lang = BOOK.direction === 'en-ru' ? 'en' : 'ru';
    await Speech.sayAsync(line.say.replace(/[«»—]/g, ''), lang, HERO_VOICE[line.who]);
    heroTalk(hero, false);
    row.classList.remove('active');
  }

  const playBtn = h('button', {
    class: 'btn primary', type: 'button',
    onclick: async () => {
      if (playing) {
        playing = false;
        if (typeof ClipAudio !== 'undefined') ClipAudio.stop();
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        return;
      }
      playing = true;
      playBtn.textContent = BOOK.direction === 'en-ru' ? '⏹ Stop' : '⏹ Стоп';
      if (page.audioClips && page.audioClips.length && typeof ClipAudio !== 'undefined') {
        const durs = await Promise.all(page.audioClips.map((src) => new Promise((resolve) => {
          const probe = new Audio(src);
          probe.preload = 'metadata';
          probe.onloadedmetadata = () => resolve(probe.duration || 0);
          probe.onerror = () => resolve(0);
        })));
        const total = durs.reduce((sum, d) => sum + d, 0) || rows.length;
        const per = total / rows.length;
        const marks = rows.map((r, i) => setTimeout(() => {
          if (!playing) return;
          rows.forEach((x) => { x.row.classList.remove('active'); heroTalk(x.hero, false); });
          r.row.classList.add('active');
          heroTalk(r.hero, true);
          r.row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, i * per * 1000));
        for (const src of page.audioClips) {
          if (!playing || !document.body.contains(playBtn)) break;
          await ClipAudio.playThrough(src);
        }
        marks.forEach(clearTimeout);
        rows.forEach((x) => { x.row.classList.remove('active'); heroTalk(x.hero, false); });
      } else {
        for (const r of rows) {
          if (!playing || !document.body.contains(r.row)) break;
          r.row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          await speakLine(r.line, r.row, r.hero);
        }
      }
      playing = false;
      playBtn.textContent = BOOK.direction === 'en-ru' ? '▶ Read by roles' : '▶ Читать по ролям';
    },
  }, BOOK.direction === 'en-ru' ? '▶ Read by roles' : '▶ Читать по ролям');

  return h('div', { class: 'story' },
    page.image ? h('img', { class: 'story-img', src: img(page.image), alt: '' }) : null,
    h('div', { class: 'dialogue' }, rows.map((r) => r.row)),
    h('div', { class: 'story-actions' }, playBtn));
};

// Пропевка АОЭИУ: в начале каждого урока.
Ex.vowelChant = (ctx) => {
  const vowels = BOOK.chantVowels || [
    { en: 'A', ru: 'а', note: 523 }, { en: 'O', ru: 'о', note: 587 }, { en: 'E', ru: 'э', note: 659 },
    { en: 'I', ru: 'и', note: 698 }, { en: 'U', ru: 'у', note: 784 },
  ];
  const enRu = BOOK.direction === 'en-ru';
  const heroA = Hero('A', { size: 90, clickable: false });
  const heroO = Hero('O', { size: 90, clickable: false });
  let running = false;
  const cells = vowels.map((v) => h('button', {
    class: 'chant-cell', type: 'button',
    onclick: () => { if (!running) sing(v, cells[vowels.indexOf(v)]); },
  }, h('span', { class: 'chant-en' }, v.pair || v.en), h('span', { class: 'chant-ru' }, `[${v.sound || v.ru}]`)));

  function highlight(cell, on) {
    cell.classList.toggle('lit', on);
    heroTalk(heroA, on);
    heroTalk(heroO, on);
  }

  async function sing(v, cell) {
    highlight(cell, true);
    if (v.audio && typeof ClipAudio !== 'undefined') await ClipAudio.playThrough(v.audio);
    else if (typeof VowelAudio !== 'undefined') await VowelAudio.playLetter(v.en);
    else {
      Sfx.tone([v.note], 0.35, 'triangle');
      await Speech.sayAsync(v.ru, 'ru', { rate: 0.6, pitch: 1.3 });
    }
    highlight(cell, false);
  }

  const btn = h('button', {
    class: 'btn primary big', type: 'button',
    onclick: async () => {
      if (running) return;
      running = true;
      btn.disabled = true;
      if (BOOK.chantAudio && typeof ClipAudio !== 'undefined') {
        const lead = 1.25;
        const gap = 0.62;
        vowels.forEach((_, i) => {
          setTimeout(() => {
            if (!document.body.contains(btn)) return;
            cells.forEach((c, n) => { if (n !== i) highlight(c, false); });
            highlight(cells[i], true);
            setTimeout(() => highlight(cells[i], false), gap * 1000 - 40);
          }, (lead + i * gap) * 1000);
        });
        await ClipAudio.playThrough(BOOK.chantAudio);
      } else if (typeof VowelAudio !== 'undefined') {
        const step = VowelAudio.duration / vowels.length;
        await VowelAudio.playAll((i) => {
          if (!document.body.contains(btn)) return;
          highlight(cells[i], true);
          setTimeout(() => highlight(cells[i], false), Math.max(180, step * 1000 - 40));
        });
      } else {
        for (let i = 0; i < vowels.length; i++) {
          if (!document.body.contains(btn)) return;
          await sing(vowels[i], cells[i]);
          await new Promise((r) => setTimeout(r, 120));
        }
      }
      running = false;
      btn.disabled = false;
      btn.textContent = BOOK.direction === 'en-ru' ? '🎵 Once more!' : '🎵 Ещё раз!';
      ctx.done();
    },
  }, BOOK.direction === 'en-ru' ? '🎵 Let\'s sing!' : '🎵 Споём!');

  return h('div', { class: 'chant' },
    h('p', { class: 'task' }, enRu
      ? 'Vowel chant! Sing with A and O: Aа[a] — Oо[o] — Ээ[e] — Ыы[ɪ:] — Ии[ɪ] — Уу[u].'
      : 'Пропевка! Начинаем урок с песенки гласных. Нажми «Спoём!» и пой вместе с А и О: А — О — Э — И — У.'),
    h('div', { class: 'chant-stage' }, heroA, h('div', { class: 'chant-row' }, cells), heroO),
    h('div', { class: 'chant-actions' }, btn));
};

// ---------- Печать ----------

const Printer = {
  open(title, body, extraCss = '') {
    const w = window.open('', '_blank');
    if (!w) { toast(window.L ? L('Разреши всплывающие окна, чтобы распечатать', 'Allow pop-ups to print') : 'Allow pop-ups to print'); return; }
    const enRu = BOOK.direction === 'en-ru';
    const printLabel = enRu ? '🖨 Print' : '🖨 Печать';
    const foot = enRu ? 'ALFABETICA · STARTER (EN → RU)' : 'АЛФАБЭТИКА · по пособию Ю.О. Чумаковой';
    w.document.write(`<!DOCTYPE html><html lang="${enRu ? 'en' : 'ru'}"><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: Nunito, Arial, sans-serif; color: #263238; margin: 0; }
        h1 { font-size: 22px; margin: 0 0 4px; color: #2e7d32; }
        .sub { color: #78909c; font-size: 13px; margin-bottom: 14px; }
        .line { position: relative; height: 64px; border-top: 1.5px solid #9ccc65; border-bottom: 1.5px solid #9ccc65; margin: 0 0 18px; }
        .line::after { content: ''; position: absolute; left: 0; right: 0; top: 24px; border-top: 1.5px dashed #c5e1a5; }
        .guide { position: absolute; left: 8px; bottom: -2px; font-size: 54px; font-weight: 700; line-height: 1; letter-spacing: 6px; color: #d6dde2; white-space: nowrap; }
        .guide .v { color: #f6c7c5; }
        .foot { margin-top: 10px; font-size: 11px; color: #90a4ae; }
        .toolbar { margin: 0 0 12px; }
        .toolbar button { font-size: 16px; padding: 8px 16px; border-radius: 999px; border: 2px solid #9ccc65; background: #fff; cursor: pointer; }
        @media print { .toolbar { display: none; } }
        ${extraCss}
      </style></head><body>
      <div class="toolbar"><button onclick="print()">${printLabel}</button></div>
      ${body}
      <div class="foot">${foot}</div>
      <script>window.onload = () => setTimeout(() => print(), 400);<\/script>
      </body></html>`);
    w.document.close();
  },

  colorText(text) {
    return [...text].map((ch) => (/[AEIOUaeiou]/.test(ch) ? `<span class="v">${ch}</span>` : ch)).join('');
  },

  propis(title, lines) {
    const rows = lines.flatMap((line) => [
      `<div class="line"><span class="guide">${this.colorText(line)}</span></div>`,
      '<div class="line"></div>',
    ]).join('');
    const sub = BOOK.direction === 'en-ru'
      ? 'Trace the gray letters; on the blank line, write them yourself. Vowels can be red!'
      : 'Обведи серые буквы, а на пустой строчке напиши сам. Гласные можно писать красным!';
    this.open(title, `<h1>${title}</h1><div class="sub">${sub}</div>${rows}`);
  },

  wordGrid(title, cfg) {
    const words = cfg.words.map((w) => `<span class="w">${w}</span>`).join(' ');
    let grid;
    if (cfg.text) {
      grid = `<div class="snake">${[...cfg.text].map((c) => `<span>${c}</span>`).join('')}</div>`;
    } else {
      grid = `<table class="grid">${cfg.rows.map((r) => `<tr>${[...r].map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
    }
    const sub = BOOK.direction === 'en-ru'
      ? 'Find the words and color them with crayons.'
      : 'Найди слова и раскрась их цветными карандашами.';
    this.open(title, `<h1>${title}</h1><div class="sub">${sub}</div>
      <div class="words">${words}</div>${grid}`, `
      .words { margin-bottom: 14px; } .w { display: inline-block; border: 1.5px solid #cfd8dc; border-radius: 999px; padding: 3px 10px; margin: 3px; font-weight: 700; }
      .grid { border-collapse: collapse; } .grid td { width: 52px; height: 52px; border: 1.5px solid #90a4ae; text-align: center; font-size: 30px; font-weight: 700; }
      .snake { display: flex; flex-wrap: wrap; gap: 2px; } .snake span { width: 34px; height: 40px; border: 1.5px solid #90a4ae; display: inline-flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }`);
  },

  image(title, src) {
    const abs = new URL(src, location.href).href;
    const sub = BOOK.direction === 'en-ru'
      ? 'Cut along the outline, fold on the lines, and glue the cube.'
      : 'Вырежи по контуру, согни по линиям и склей кубик.';
    this.open(title, `<h1>${title}</h1><div class="sub">${sub}</div><img src="${abs}" style="width:100%;">`);
  },
};

function printBtn(label, onclick) {
  return h('button', { class: 'btn ghost small print-btn', type: 'button', onclick }, '🖨 ', label);
}
