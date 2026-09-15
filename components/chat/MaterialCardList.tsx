import type { MaterialCard as MaterialCardType, MaterialTarget } from './materialTypes';
import { MaterialCard } from './MaterialCard';

/**
 * 素材卡片列表（M2 T2.4，D3/D7/D18/D19）。
 *
 * 功能：
 * - 显示多张素材卡片（支持多卡片积累）
 * - 顶部常显"将发送至：<会话名>" + 一键转新会话（D7）
 * - 全部移除（D18/D19：卡片默认已采用，移除后不参与发送）
 */

interface Props {
  cards: MaterialCardType[];
  /** 素材落点（当前激活会话或新建） */
  target: MaterialTarget;
  /** 切换到新会话 */
  onSwitchToNewSession: () => void;
  /** 移除单张卡片 */
  onRemove: (cardId: string) => void;
  /** 更新卡片字段 */
  onUpdate: (cardId: string, updates: Partial<MaterialCardType>) => void;
  /** 全部移除 */
  onRemoveAll: () => void;
}

export function MaterialCardList({
  cards,
  target,
  onSwitchToNewSession,
  onRemove,
  onUpdate,
  onRemoveAll,
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
          <button onClick={onRemoveAll} className="text-xs text-text-muted hover:text-danger">
            全部移除
          </button>
        )}
      </div>

      {/* 卡片列表 */}
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <MaterialCard key={card.id} card={card} onRemove={onRemove} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}
