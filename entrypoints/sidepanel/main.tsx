import { createRoot } from 'react-dom/client';
import { App } from '~/components/App';
import '~/assets/style.css';

document.getElementById('root')!.innerHTML = '';
createRoot(document.getElementById('root')!).render(<App />);
