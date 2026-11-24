import { useEffect, useRef } from 'react';

const VOWELS = new Set([
  'A', 'E', 'I', 'O', 'U', 'Y', 'a', 'e', 'i', 'o', 'u', 'y',
  'А', 'О', 'Э', 'И', 'У', 'Ы', 'а', 'о', 'э', 'и', 'у', 'ы', 'Е', 'е', 'Ё', 'ё',
]);

function Colored({ text }) {
  return (
    <span className="colorized">
      {[...String(text)].map((ch, i) => (
        /[A-Za-zА-Яа-яЁё]/.test(ch)
          ? <span key={i} className={VOWELS.has(ch) ? 'v' : 'c'}>{ch}</span>
          : ch
      ))}
    </span>
  );
}

function Fox() {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.play().catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      className="hero-img"
      src={'video/' + encodeURIComponent('лис главная страница.mp4')}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
}

export default function Home() {
  const teaserRef = useRef(null);
  const name = Store.data.name || (Auth.user && Auth.user.login);
  const learned = BOOK.lessons
    .filter((l) => Store.data.done['l' + l.id])
    .flatMap((l) => l.letters.flatMap((x) => [x.en, x.ru]));
  const course = Alfa.course;
  const nextIndex = course.findIndex((c) => !Store.data.done[c.id]);
  const next = nextIndex >= 0 ? course[nextIndex] : null;

  useEffect(() => {
    if (teaserRef.current) teaserRef.current.replaceChildren(Alfa.teaser());
  }, []);

  const reset = () => {
    if (confirm(L('Сбросить весь прогресс и звёзды?', 'Reset all progress and stars?'))) Store.reset();
  };

  return (
    <>
      <section className="hero-block">
        <div className="hero-text">
          <h1>{name ? `Hello, ${name}!` : 'Hello!'}</h1>
          <p>Letters A and O build a team to help English speakers learn Cyrillic and start reading Russian. Open lessons, sing vowels, play games, collect stars!</p>
          {next ? (
            <a className="btn primary big" href={`#/${next.kind}/${next.id}`}>
              {Store.stars() ? 'Continue ▶' : 'Start lesson 1 ▶'}
            </a>
          ) : (
            <div className="all-done">🏆 Starter complete!</div>
          )}
        </div>
        <Fox />
      </section>

      <div ref={teaserRef} />

      <section className="team-block">
        <div className="team-title">My letter team</div>
        {learned.length ? (
          <div className="strip">
            {learned.map((ch, i) => <span key={i} className="strip-l"><Colored text={ch} /></span>)}
          </div>
        ) : (
          <p className="muted">Finish lesson 1 — Aа, Oо, Ээ, Ыы, Ии and Уу join your team.</p>
        )}
      </section>

      <section className="games">
        <a className="game-card" href="#/cubes">
          <span className="gc-icon">🎲</span>
          <b>Syllable cubes</b>
          <span>Spin cubes and build words</span>
        </a>
        <a className="game-card" href="#/alphabet">
          <span className="gc-icon">🔤</span>
          <b>Russian alphabet</b>
          <span>Letters from the book</span>
        </a>
        <a className="game-card" href="#/profile">
          <span className="gc-icon">🏅</span>
          <b>Profile</b>
          <span>Stars and progress</span>
        </a>
      </section>

      <section className="map-section">
        <div className="lesson-list row">
          {course.map((item, index) => {
            const unlocked = Alfa.unlocked(index);
            const stars = Store.data.done[item.id] || 0;
            const badge = item.kind === 'lesson'
              ? (item.ref.badge || item.ref.letters.map((x) => x.en + (x.en.length === 1 ? x.en.toLowerCase() : '')).join(' '))
              : item.kind === 'reading' ? '📖' : '🏆';
            const label = item.kind === 'lesson' ? `Lesson ${item.ref.id}` : item.kind === 'reading' ? 'Reading' : 'Final';
            return (
              <a
                key={item.id}
                className={'lesson-card' + (unlocked ? '' : ' locked') + (stars ? ' done' : '')}
                href={unlocked ? `#/${item.kind}/${item.id}` : '#/'}
                onClick={unlocked ? undefined : (e) => {
                  e.preventDefault();
                  toast(L('🔒 Сначала пройди предыдущий урок', '🔒 Complete the previous lesson first'));
                }}
              >
                <div className="lc-badge">{item.kind === 'lesson' ? <Colored text={badge} /> : badge}</div>
                <div className="lc-body">
                  <div className="lc-num">{label}</div>
                  <div className="lc-title">{item.ref.title}</div>
                </div>
                <div className="lc-stars">
                  {unlocked ? [1, 2, 3].map((n) => <span key={n} className={n <= stars ? 'on' : ''}>★</span>) : '🔒'}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="settings">
        <button className="btn ghost small" type="button" onClick={reset}>Reset progress</button>
      </section>
      <footer className="credits">
        Based on «ALFABETICA · FROM ENGLISH TO RUSSIAN · STARTER» by Y.O. Chumakova, Meenakshi Arun Kumar, Kataria Yash Vijay. Art by Russian schoolchildren.
      </footer>
    </>
  );
}
