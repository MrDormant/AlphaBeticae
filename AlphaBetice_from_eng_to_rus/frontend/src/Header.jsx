export default function Header() {
  const soundOn = Store.data.sound !== false;
  const user = Auth.user;

  const toggleSound = () => {
    Store.data.sound = !Store.data.sound;
    Store.save();
  };

  const toggleLessons = (e) => {
    Store.data.unlockAll = e.target.checked;
    Store.save();
    Alfa.route();
  };

  const logout = () => {
    Auth.logout();
    location.hash = '#/';
    Alfa.route();
  };

  return (
    <header className="topbar">
      <a className="logo" href="#/">
        <span className="logo-ru">АЛФАБЭТИКА</span>
        <span className="logo-en">
          <span className="v">A</span>LF<span className="v">A</span>B<span className="v">E</span>T<span className="v">I</span>C<span className="v">A</span>
        </span>
        <span className="logo-sub">EN → RU · STARTER</span>
      </a>
      <div className="vowel-banner">
        <span>Aа[a]</span><span>Oо[o]</span><span>Ээ[e]</span><span>Ыы[ɪ:]</span><span>Ии[ɪ]</span><span>Уу[u]</span>
      </div>
      <label className="topbar-switch" title="For teachers and parents">
        <input id="unlock-all" type="checkbox" checked={!!Store.data.unlockAll} onChange={toggleLessons} />
        <span>All lessons</span>
      </label>
      <div className="topbar-right">
        <div id="user-box" className="user-box">
          {user ? (
            <>
              <a className="user-name" href="#/profile" title="Profile">👤 {user.login}</a>
              <button className="btn ghost small" type="button" onClick={logout}>Log out</button>
            </>
          ) : (
            <a className="btn ghost small auth-top" href="#/auth" title="Save progress on the server">Sign in</a>
          )}
        </div>
        <span className="stars-total" title="My stars">★ <span id="stars-count">{Store.stars()}</span></span>
        <button id="sound-toggle" className="icon-btn" type="button" title="Sound" onClick={toggleSound}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  );
}
