const PoemPlayer = {
  audio: null,
  stop() {
    const audio = this.audio;
    this.audio = null;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  },
};

Ex.poem = (poem, ctx, opts = {}) => {
  if (!opts.closing) ctx.done();
  PoemPlayer.stop();

  const words = poem.words || [];
  const nodes = words.map((word) => h('span', { class: 'poem-word' }, word.w));
  const lines = [];
  let line = h('span', { class: 'poem-line' });
  words.forEach((word, i) => {
    if (word.br && line.childNodes.length) {
      lines.push(line);
      line = h('span', { class: 'poem-line' });
    }
    line.append(nodes[i], ' ');
  });
  if (line.childNodes.length) lines.push(line);

  const heading = h(
    'div',
    { class: 'poem-heading' },
    'Стихотворение Лисы Лисичкиной. Слушай и повторяй',
  );
  const caption = h('div', { class: 'poem-caption' }, lines);
  const video = h('video', {
    class: 'poem-video',
    src: poem.video,
    autoplay: true,
    loop: true,
    muted: true,
    playsinline: true,
  });
  video.muted = true;

  const playBtn = h('button', { class: 'poem-play', type: 'button' }, '▶ Listen');
  const audio = new Audio(poem.audio);
  PoemPlayer.audio = audio;

  const paint = () => {
    const t = audio.currentTime || 0;
    let active = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].t <= t + 0.05) active = i;
    }
    nodes.forEach((node, i) => node.classList.toggle('sung', i <= active));
  };

  const start = () => {
    playBtn.classList.add('hide');
    video.play().catch(() => {});
    audio.play().catch(() => playBtn.classList.remove('hide'));
  };

  playBtn.onclick = () => {
    if (audio.paused) start();
    else {
      audio.pause();
      playBtn.classList.remove('hide');
      playBtn.textContent = '▶ Continue';
    }
  };

  audio.addEventListener('timeupdate', paint);
  audio.addEventListener('ended', () => {
    nodes.forEach((node) => node.classList.add('sung'));
    playBtn.textContent = '▶ Again';
    playBtn.classList.remove('hide');
    audio.currentTime = 0;
    if (!opts.closing) return;
    ctx.done();
    setTimeout(() => {
      if (PoemPlayer.audio === audio && typeof ctx.advance === 'function') ctx.advance();
    }, 700);
  });
  audio.addEventListener('play', () => playBtn.classList.add('hide'));

  const screen = h('div', { class: 'poem-screen' }, video, heading, caption, playBtn);
  requestAnimationFrame(start);
  return screen;
};
