import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../../css/style.css';

const root = document.getElementById('root');

if (!root) {
    throw new Error('APEX root element is missing.');
}

createRoot(root).render(<App />);
