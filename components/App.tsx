import { Main } from './Main';
import { Sidebar } from './Sidebar';

/**
 * Side Panel 根组件（tech §4）。
 * M0 为空壳层级占位；Sidebar 的会话列表/设置入口、Main 的对话流均在 M1 填充。
 */
export function App() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <Main />
    </div>
  );
}
