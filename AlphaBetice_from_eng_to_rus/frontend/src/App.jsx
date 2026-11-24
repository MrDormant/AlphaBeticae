import { useEffect, useState } from 'react';
import Header from './Header.jsx';
import Home from './Home.jsx';
import LegacyStage from './LegacyStage.jsx';

function useHash() {
  const [hash, setHash] = useState(() => location.hash || '#/');
  const [snap, setSnap] = useState(0);
  useEffect(() => {
    const onHash = () => setHash(location.hash || '#/');
    const onProgress = () => setSnap((n) => n + 1);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('alfa-progress', onProgress);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('alfa-progress', onProgress);
    };
  }, []);
  return [hash, snap];
}

export default function App() {
  const [hash, snap] = useHash();
  const kind = hash.replace(/^#\/?/, '').split('/')[0];
  const home = !kind;

  useEffect(() => {
    if (window.Mascots) Mascots.updateVisibility(kind);
    if (window.Alfa) Alfa.header();
  }, [kind, snap]);

  return (
    <>
      <Header snap={snap} />
      <main>
        <div className="rise-in" key={hash}>
          {home ? <Home snap={snap} /> : <LegacyStage hash={hash} />}
        </div>
      </main>
    </>
  );
}
