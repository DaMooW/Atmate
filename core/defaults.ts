/**
 * 初始状态与默认值生成（techniqueStack §5）
 * 无数据时生成默认 uiPrefs、空 apiConfigs/roles/sessions。
 * 默认角色的 seed 在 T1.3 实现（prompt 外置到 prompts/roles/*.md）。
 */

import { SCHEMA_VERSION } from './schema';
import type { AppStorageState, UiPrefs } from './types';

/** 默认 UI 偏好 */
export const DEFAULT_UI_PREFS: UiPrefs = {
  baseDirectiveEnabled: true,
  defaultContextScope: 'selection',
  locale: 'zh-CN',
};

/**
 * 生成全新安装的初始状态。
 * roles 为空数组——默认角色的 seed 在 storage 初始化流程中
 * （T1.3 从 prompts/roles/*.md 读取后写入），此处不内嵌 prompt。
 */
export function createInitialState(): AppStorageState {
  return {
    meta: { schemaVersion: SCHEMA_VERSION },
    apiConfigs: [],
    activeApiConfigId: null,
    roles: [],
    sessions: [],
    uiPrefs: { ...DEFAULT_UI_PREFS },
  };
}
