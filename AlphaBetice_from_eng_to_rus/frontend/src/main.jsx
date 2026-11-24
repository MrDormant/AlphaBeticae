import { createRoot } from 'react-dom/client';
import App from './App.jsx';

await window.Alfa.booted;
createRoot(document.getElementById('root')).render(<App />);
