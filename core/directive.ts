/**
 * 基础指令（Base Directive，FR-1.6 / techniqueStack §8.1）
 *
 * 文案外置在 prompts/directive-v1.md，通过 Vite ?raw 导入为版本化常量。
 * 改文案须升版本（directive-v2.md），历史会话按当时版本存储的副本渲染。
 */

import directiveV1 from '../prompts/directive-v1.md?raw';

/** 当前使用的基础指令版本 */
export const DIRECTIVE_VERSION = 'v1';

/** 基础指令文本（v1） */
export const DIRECTIVE_V1 = directiveV1.trim();

/**
 * 获取指定版本的基础指令文本。
 * 目前仅 v1，未来升版时在此扩展。
 */
export function getDirective(version: string = DIRECTIVE_VERSION): string {
  switch (version) {
    case 'v1':
      return DIRECTIVE_V1;
    default:
      throw new Error(`未知基础指令版本: ${version}`);
  }
}
