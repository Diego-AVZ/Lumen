import './bootPath';
import { createRoot } from 'react-dom/client';
import '@fontsource/fraunces/latin-400-italic.css';
import '@fontsource/fraunces/latin-600-italic.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-600.css';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
