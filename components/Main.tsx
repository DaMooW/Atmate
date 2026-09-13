import { Composer } from './chat/Composer';
import { MessageList } from './chat/MessageList';
import { TokenStatusBar } from './chat/TokenStatusBar';

/**
 * 主内容区（tech §4 App → Main)。
 * M0 占位；M1（T1.5–T1.6）填充消息流/输入区/状态条。
 */
export function Main() {
  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <MessageList />
      <TokenStatusBar />
      <Composer />
    </main>
  );
}
