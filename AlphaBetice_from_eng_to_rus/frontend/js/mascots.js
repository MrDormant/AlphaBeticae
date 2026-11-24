// «Скрепка-помощник» (иногда стучит), как старый Clippy.
const Mascots = {
  root: null,
  bubble: null,
  clip: null,
  timer: null,
  phrases: [
    'Knock-knock! Ready for a lesson?',
    'A and O help you read Cyrillic!',
    'Vowels are red — remember!',
    'Tap Start lesson 1 — I am here!',
  ],

  clipMascot() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'clip-svg');
    svg.setAttribute('viewBox', '0 0 32 72');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M16 2C9 2 4 7 4 14v22c0 9 7 16 16 16 5 0 9-2 12-5-2 3-6 5-10 5-7 0-12-5-12-12V18c0-5 4-9 9-9s9 4 9 9v20c0 3-2 5-5 5s-5-2-5-5V24');
    path.setAttribute('fill', '#ffca28');
    path.setAttribute('stroke', '#f9a825');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return h('div', { class: 'mascot clip', title: typeof BOOK !== 'undefined' && BOOK.direction === 'en-ru' ? 'Helper paperclip' : 'Помощник-скрепка' },
      svg,
      h('span', { class: 'eyes clip-eyes' },
        h('span', { class: 'eye' }),
        h('span', { class: 'eye' })));
  },

  mount() {
    if (this.root) return;
    this.bubble = h('div', { class: 'mascot-bubble' });
    this.clip = this.clipMascot();
    this.root = h('aside', { class: 'mascots', id: 'mascots', 'aria-hidden': 'true' },
      h('div', { class: 'mascots-rail' },
        h('div', { class: 'mascot-side mascot-side-right' },
          h('div', { class: 'clip-wrap' },
            this.bubble,
            this.clip))));
    document.body.append(this.root);

    this.clip.addEventListener('click', () => this.knock(true));

    this.scheduleKnock();
  },

  knock(manual = false) {
    if (!this.clip || !this.root.classList.contains('visible')) return;
    this.clip.classList.remove('knocking');
    void this.clip.offsetWidth;
    this.clip.classList.add('knocking');
    const phrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];
    this.bubble.textContent = phrase;
    this.bubble.classList.add('show');
    if (manual && Store.data.sound) Speech.say('Тук тук!', 'ru');
    clearTimeout(this._bubbleT);
    this._bubbleT = setTimeout(() => this.bubble.classList.remove('show'), manual ? 4500 : 3200);
  },

  scheduleKnock() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.knock(false);
      this.scheduleKnock();
    }, 22000 + Math.random() * 28000);
  },

  updateVisibility(kind) {
    if (!this.root) return;
    const show = !kind || kind === 'auth' || kind === 'profile' || kind === 'cubes' || kind === 'alphabet';
    this.root.classList.toggle('visible', show);
    this.root.setAttribute('aria-hidden', show ? 'false' : 'true');
  },
};
