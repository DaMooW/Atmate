/**
 * chrome.storage.local 键名常量（techniqueStack §5）
 * 统一 at: 前缀（Atmate 缩写，沿用旧名免迁移）。
 */

export const STORAGE_KEYS = {
  meta: 'at:meta',
  apiConfigs: 'at:apiConfigs',
  activeApiConfigId: 'at:activeApiConfigId',
  roles: 'at:roles',
  sessions: 'at:sessions',
  uiPrefs: 'at:uiPrefs',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** 所有需要一次性装载的键 */
export const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);
