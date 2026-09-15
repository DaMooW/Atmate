/**
 * 素材卡片类型定义（M2 T2.4，D3/D7/D18/D19）。
 *
 * 素材卡片是划词内容进入对话前的暂存态：
 * - 用户可以编辑原文、补充说明、切换上下文档位
 * - 创建后默认已采用（D18），发送时自动组装进 prompt（D19）
 * - "移除"则不参与本次发送
 * - 支持多卡片积累
 */

import type { ContextScope } from '~/core/types';
import type { MaterialSource, ContextData } from '~/core/messages';

/** 单张素材卡片 */
export interface MaterialCard {
  /** 卡片唯一 ID */
  id: string;
  /** 选中的文本（可编辑） */
  text: string;
  /** 页面标题 */
  title: string;
  /** 页面 URL */
  url: string;
  /** 素材来源（浮动按钮 / 右键菜单 / 自动填充） */
  source: MaterialSource;
  /** 上下文档位（默认 containing-paragraph，D20） */
  contextScope: ContextScope;
  /** 上下文数据（T2.6 实现后填充） */
  contextData?: ContextData;
  /** 用户补充说明 */
  userNote: string;
  /** 是否已采用（D18：创建后默认 true；发送时已采用的卡片会自动组装进 prompt） */
  adopted: boolean;
  /** 创建时间 */
  createdAt: number;
}

/** 素材落点（D7） */
export interface MaterialTarget {
  /** 目标会话 ID；null 表示新建会话 */
  sessionId: string | null;
  /** 目标会话名称（用于显示） */
  sessionName: string;
}
