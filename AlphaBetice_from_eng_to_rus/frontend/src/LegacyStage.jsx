import { useEffect, useRef } from 'react';

export default function LegacyStage({ hash }) {
  const ref = useRef(null);
  useEffect(() => {
    Alfa.attach(ref.current);
    try {
      Alfa.route();
    } catch (err) {
      console.error(err);
    }
    return () => Alfa.attach(null);
  }, [hash]);
  return <div id="legacy-stage" ref={ref} />;
}
