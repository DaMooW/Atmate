/**
 * system message 拼装（techniqueStack §6 / §8.1）
 *
 * 拼装顺序：角色提示词 +（开启时）\n\n + 基础指令段
 * UI 不把它显示为独立消息；会话导出时按实际发送内容附注。
 */

import { getDirective, DIRECTIVE_VERSION } from './directive';
import type { Role } from './types';

export interface BuildSystemOptions {
  /** 是否启用基础指令（来自 uiPrefs.baseDirectiveEnabled） */
  baseDirectiveEnabled: boolean;
  /** 基础指令版本，默认当前版本 */
  directiveVersion?: string;
}

/**
 * 拼装 system message 文本。
 *
 * @param role 角色（含 systemPrompt）
 * @param options 拼装选项
 * @returns 拼装后的 system 文本
 */
export function buildSystemPrompt(role: Role, options: BuildSystemOptions): string {
  const parts: string[] = [role.systemPrompt.trim()];

  if (options.baseDirectiveEnabled) {
    const directive = getDirective(options.directiveVersion ?? DIRECTIVE_VERSION);
    parts.push(directive);
  }

  return parts.join('\n\n');
}

/**
 * 拼装为 OpenAI 兼容协议的 system message 对象。
 */
export function buildSystemMessage(role: Role, options: BuildSystemOptions) {
  return {
    role: 'system' as const,
    content: buildSystemPrompt(role, options),
  };
}
