import { createRoot } from 'react-dom/client';
import { App } from '~/components/App';
import { useStorageStore } from '~/infra/storage/store';
import '~/assets/style.css';

/**
 * Side Panel 入口。
 * 启动时先从 storage.local 装载数据，再渲染 UI。
 */
async function bootstrap() {
  await useStorageStore.getState().init();
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  createRoot(root).render(<App />);
}

void bootstrap();
