import type { MaterialCard as MaterialCardType, MaterialTarget } from './materialTypes';
import { MaterialCard } from './MaterialCard';

/**
 * 素材卡片列表（M2 T2.4，D3/D7）。
 *
 * 功能：
 * - 显示多张素材卡片（支持多卡片积累）
 * - 顶部常显"将发送至：<会话名>" + 一键转新会话（D7）
 * - 全部采用 / 全部丢弃
 */

interface Props {
  cards: MaterialCardType[];
  /** 素材落点（当前激活会话或新建） */
  target: MaterialTarget;
  /** 切换到新会话 */
  onSwitchToNewSession: () => void;
  /** 采用单张卡片 */
  onAdopt: (card: MaterialCardType) => void;
  /** 丢弃单张卡片 */
  onDiscard: (cardId: string) => void;
  /** 更新卡片字段 */
  onUpdate: (cardId: string, updates: Partial<MaterialCardType>) => void;
  /** 全部采用 */
  onAdoptAll: () => void;
  /** 全部丢弃 */
  onDiscardAll: () => void;
}

export function MaterialCardList({
  cards,
  target,
  onSwitchToNewSession,
  onAdopt,
  onDiscard,
  onUpdate,
  onAdoptAll,
  onDiscardAll,
}: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="bg-surface-secondary/50 border-b border-border px-4 py-3">
      {/* 落点提示（D7） */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <span>将发送至：</span>
          <span className="font-medium text-text">{target.sessionName}</span>
          {target.sessionId && (
            <button onClick={onSwitchToNewSession} className="ml-1 text-primary hover:underline">
              转新会话
            </button>
          )}
        </div>
        {cards.length > 1 && (
          <div className="flex gap-2">
            <button onClick={onAdoptAll} className="text-xs text-primary hover:underline">
              全部采用
            </button>
            <button onClick={onDiscardAll} className="text-xs text-text-muted hover:text-danger">
              全部丢弃
            </button>
          </div>
        )}
      </div>

      {/* 卡片列表 */}
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <MaterialCard
            key={card.id}
            card={card}
            onAdopt={onAdopt}
            onDiscard={onDiscard}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}
