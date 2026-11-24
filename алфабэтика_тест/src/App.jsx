import { useEffect, useLayoutEffect, useRef, useState } from 'react';

function parseHash(hash) {
  const [, kind, id] = hash.replace(/^#/, '').split('/');
  return { kind: kind || '', id: id || '' };
}

function Stars({ count }) {
  const prev = useRef(count);
  const [bump, setBump] = useState(false);
  const [flies, setFlies] = useState([]);

  useEffect(() => {
    if (count <= prev.current) {
      prev.current = count;
      return undefined;
    }
    prev.current = count;
    const stamp = Date.now();
    setBump(true);
    setFlies([0, 1, 2].map((i) => ({ id: `${stamp}-${i}`, i })));
    const bumpTimer = setTimeout(() => setBump(false), 450);
    const flyTimer = setTimeout(() => setFlies([]), 800);
    return () => {
      clearTimeout(bumpTimer);
      clearTimeout(flyTimer);
    };
  }, [count]);

  return (
    <span className={bump ? 'stars-total bump' : 'stars-total'} title="Мои звёзды">
      ★ <span id="stars-count">{count}</span>
      {flies.map((fly) => (
        <span key={fly.id} className="star-fly" style={{ '--i': fly.i }}>★</span>
      ))}
    </span>
  );
}

function Header() {
  const store = window.Store;
  const auth = window.Auth;
  const data = store?.data;
  if (!data) {
    return (
      <header className="topbar">
        <a className="logo" href="#/">
          <span className="logo-ru">АЛФАБЭТИКА</span>
          <span className="logo-en"><span className="v">A</span>LF<span className="v">A</span>B<span className="v">E</span>T<span className="v">I</span>C<span className="v">A</span></span>
        </a>
      </header>
    );
  }

  const stars = store.stars();
  const user = auth?.user;

  const toggleSound = () => {
    store.data.sound = !store.data.sound;
    store.save();
  };

  const toggleUnlock = (event) => {
    store.data.unlockAll = event.target.checked;
    store.save();
    window.dispatchEvent(new CustomEvent('alfabetica-route'));
  };

  const logout = () => {
    auth.logout();
    if (location.hash !== '#/') location.hash = '#/';
    else window.dispatchEvent(new CustomEvent('alfabetica-route'));
  };

  return (
    <header className="topbar">
      <a className="logo" href="#/">
        <span className="logo-ru">АЛФАБЭТИКА</span>
        <span className="logo-en">
          <span className="v">A</span>LF<span className="v">A</span>B<span className="v">E</span>T<span className="v">I</span>C<span className="v">A</span>
        </span>
      </a>
      <div className="vowel-banner">
        <span><b>A</b>[а]</span>
        <span><b>O</b>[о]</span>
        <span><b>E</b>[э]</span>
        <span><b>I</b>[и]</span>
        <span><b>U</b>[у]</span>
      </div>
      <label className="topbar-switch" title="Для учителя и родителей">
        <input id="unlock-all" type="checkbox" checked={!!data.unlockAll} onChange={toggleUnlock} />
        <span>Все уроки</span>
      </label>
      <div className="topbar-right">
        <div id="user-box" className="user-box">
          {user ? (
            <>
              <a className="user-name" href="#/profile" title="Личный кабинет">👤 {user.login}</a>
              <button className="btn ghost small" type="button" onClick={logout}>Выйти</button>
            </>
          ) : (
            <a className="btn ghost small auth-top" href="#/auth" title="Сохранить прогресс на сервере">Войти</a>
          )}
        </div>
        <Stars count={stars} />
        <button
          id="sound-toggle"
          className={data.sound ? 'icon-btn' : 'icon-btn off'}
          type="button"
          title="Звук"
          onClick={toggleSound}
        >
          {data.sound ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [nav, setNav] = useState(0);
  const [hash, setHash] = useState(() => location.hash);
  const [dataRev, setDataRev] = useState(0);

  useEffect(() => {
    let cancel = false;
    const onRoute = () => {
      setHash(location.hash);
      setNav((n) => n + 1);
    };
    const onStore = () => setDataRev((n) => n + 1);
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('alfabetica-route', onRoute);
    window.addEventListener('alfabetica-store', onStore);
    window.Alfa.init().then(() => {
      if (!cancel) setReady(true);
    });
    return () => {
      cancel = true;
      window.removeEventListener('hashchange', onRoute);
      window.removeEventListener('alfabetica-route', onRoute);
      window.removeEventListener('alfabetica-store', onStore);
    };
  }, []);

  const { kind, id } = parseHash(hash);
  const screenKey = `${kind}:${id}:${nav}`;

  useLayoutEffect(() => {
    if (!ready) return;
    window.Alfa.show();
  }, [ready, screenKey]);

  return (
    <>
      <Header />
      <main>
        {ready ? <div id="alfa-host" key={screenKey} /> : <div className="boot">Открываем Алфабэтику…</div>}
      </main>
    </>
  );
}
