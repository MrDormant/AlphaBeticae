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
  if (typeof Fox !== 'undefined' && Fox.stopVoice) Fox.stopVoice();
  if (typeof ClipAudio !== 'undefined') ClipAudio.stop();
  if (typeof VowelAudio !== 'undefined') VowelAudio.stop();

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

  const playBtn = h('button', { class: 'poem-play', type: 'button' }, '▶ Слушать стих');
  const raw = poem.audio || '';
  const slash = raw.lastIndexOf('/');
  const src = slash >= 0 ? raw.slice(0, slash + 1) + encodeURIComponent(raw.slice(slash + 1)) : raw;
  const audio = new Audio();
  audio.preload = 'auto';
  PoemPlayer.audio = audio;
  let heardMs = 0;
  let playingSince = 0;
  let finished = false;

  const paint = () => {
    const t = audio.currentTime || 0;
    let active = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].t <= t + 0.05) active = i;
    }
    nodes.forEach((node, i) => node.classList.toggle('sung', i <= active));
  };

  const start = () => {
    if (PoemPlayer.audio !== audio) return;
    playBtn.classList.add('hide');
    video.play().catch(() => {});
    const go = () => {
      if (PoemPlayer.audio !== audio) return;
      audio.play().catch(() => playBtn.classList.remove('hide'));
    };
    if (audio.readyState >= 2) go();
    else audio.addEventListener('canplay', go, { once: true });
  };

  playBtn.onclick = () => {
    if (audio.paused) start();
    else {
      audio.pause();
      playBtn.classList.remove('hide');
      playBtn.textContent = '▶ Продолжить';
    }
  };

  audio.addEventListener('playing', () => {
    playingSince = Date.now();
    playBtn.classList.add('hide');
  });
  audio.addEventListener('pause', () => {
    if (playingSince) heardMs += Date.now() - playingSince;
    playingSince = 0;
  });
  audio.addEventListener('timeupdate', paint);
  audio.addEventListener('error', () => {
    playBtn.textContent = '▶ Слушать стих';
    playBtn.classList.remove('hide');
  });
  audio.addEventListener('ended', () => {
    if (playingSince) heardMs += Date.now() - playingSince;
    playingSince = 0;
    const pos = audio.currentTime || 0;
    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    nodes.forEach((node) => node.classList.add('sung'));
    playBtn.textContent = '▶ Ещё раз';
    playBtn.classList.remove('hide');
    try { audio.currentTime = 0; } catch (e) { /* ignore */ }
    if (!opts.closing || finished) return;
    if (heardMs < 800 && pos < 0.5 && dur < 1) return;
    finished = true;
    ctx.done();
    setTimeout(() => {
      if (PoemPlayer.audio === audio && typeof ctx.advance === 'function') ctx.advance();
    }, 700);
  });
  audio.addEventListener('play', () => playBtn.classList.add('hide'));
  audio.src = src;
  audio.load();

  const screen = h('div', { class: 'poem-screen' }, video, heading, caption, playBtn);
  start();
  return screen;
};
