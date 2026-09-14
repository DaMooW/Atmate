/**
 * 默认角色定义（spec M1 D2 / D11）
 *
 * prompt 文本外置在 prompts/roles/*.md，通过 Vite ?raw 导入，
 * 不内嵌在代码中。首次启动时 seed 到 storage，之后与用户自建角色同等可编辑/删除。
 */

import atmatePrompt from '../prompts/roles/atmate.md?raw';
import translatorPrompt from '../prompts/roles/translator.md?raw';
import summarizerPrompt from '../prompts/roles/summarizer.md?raw';
import codeReviewerPrompt from '../prompts/roles/code-reviewer.md?raw';
import academicExplainerPrompt from '../prompts/roles/academic-explainer.md?raw';
import type { Role } from './types';

export interface BuiltinRoleDef {
  /** 稳定 ID，seed 时使用；恢复默认时用此 ID 判断是否已存在 */
  id: string;
  name: string;
  description: string;
  /** 从 ?raw 导入的 prompt 文本 */
  systemPrompt: string;
}

/** 默认角色定义列表（顺序即展示顺序） */
export const BUILTIN_ROLES: BuiltinRoleDef[] = [
  {
    id: 'builtin-atmate',
    name: '在伴 Atmate',
    description: '产品默认助手：介绍在伴的能力，处理闲聊与一般性问答',
    systemPrompt: atmatePrompt,
  },
  {
    id: 'builtin-translator',
    name: '翻译官',
    description: '专精翻译，保留格式与术语一致性',
    systemPrompt: translatorPrompt,
  },
  {
    id: 'builtin-summarizer',
    name: '摘要助手',
    description: '提取核心论点与关键信息，结构化输出',
    systemPrompt: summarizerPrompt,
  },
  {
    id: 'builtin-code-reviewer',
    name: '代码审查员',
    description: '从正确性/性能/可读性/安全四维度审查',
    systemPrompt: codeReviewerPrompt,
  },
  {
    id: 'builtin-academic-explainer',
    name: '学术解说员',
    description: '将学术内容转化为通俗解释，指出论证薄弱环节',
    systemPrompt: academicExplainerPrompt,
  },
];

/** 空对话直接发送时使用的默认角色（spec M1 验收修订 D-3） */
export const DEFAULT_ROLE_ID = 'builtin-atmate';

/**
 * 将默认角色定义转换为 Role 实体（用于 seed）。
 * builtin: true 仅作元数据标记，不阻止编辑/删除。
 */
export function createBuiltinRoles(): Role[] {
  return BUILTIN_ROLES.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    systemPrompt: def.systemPrompt,
    builtin: true,
  }));
}

/**
 * 检查哪些默认角色不在现有列表中（用于"恢复默认"功能）。
 * 按 ID 匹配，不按名称匹配（用户可能重命名了默认角色）。
 */
export function getMissingBuiltinRoles(existingRoles: Role[]): BuiltinRoleDef[] {
  const existingIds = new Set(existingRoles.map((r) => r.id));
  return BUILTIN_ROLES.filter((def) => !existingIds.has(def.id));
}
