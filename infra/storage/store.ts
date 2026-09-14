/**
 * Storage 同步层（techniqueStack §5 / ADR-006）
 *
 * 设计原则：storage.local 为唯一真相源。
 * - 启动时一次性装载所有 at:* 键到内存 store（zustand）
 * - 写操作：乐观更新 store + 写 storage.local
 * - chrome.storage.onChanged 回流：其他上下文的变更同步到当前 store
 * - 多上下文（sidepanel / background / viewer）一致性靠 onChanged 广播
 */

import { create } from 'zustand';
import { browser } from 'wxt/browser';
import { createInitialState } from '../../core/defaults';
import { createBuiltinRoles } from '../../core/builtinRoles';
import { migrateSchema, SCHEMA_VERSION } from '../../core/schema';
import type { ApiConfig, AppStorageState, Role, Session, UiPrefs } from '../../core/types';
import { ALL_STORAGE_KEYS, STORAGE_KEYS } from './keys';

// ── Store 接口 ────────────────────────────────────────────

interface StorageStore extends AppStorageState {
  /** 是否已完成初始装载 */
  initialized: boolean;
  /** 从 storage.local 装载所有键，调用一次 */
  init: () => Promise<void>;
  setApiConfigs: (configs: ApiConfig[]) => Promise<void>;
  setActiveApiConfigId: (id: string | null) => Promise<void>;
  setRoles: (roles: Role[]) => Promise<void>;
  setSessions: (sessions: Session[]) => Promise<void>;
  setUiPrefs: (prefs: Partial<UiPrefs>) => Promise<void>;
}

// ── 内部工具 ──────────────────────────────────────────────

/** 从 storage 读取原始数据并迁移到当前 schema */
async function loadFromStorage(): Promise<AppStorageState> {
  const raw = await browser.storage.local.get(ALL_STORAGE_KEYS);
  const state: Partial<AppStorageState> = {
    meta: raw[STORAGE_KEYS.meta] as AppStorageState['meta'] | undefined,
    apiConfigs: raw[STORAGE_KEYS.apiConfigs] as ApiConfig[] | undefined,
    activeApiConfigId: raw[STORAGE_KEYS.activeApiConfigId] as string | null | undefined,
    roles: raw[STORAGE_KEYS.roles] as Role[] | undefined,
    sessions: raw[STORAGE_KEYS.sessions] as Session[] | undefined,
    uiPrefs: raw[STORAGE_KEYS.uiPrefs] as UiPrefs | undefined,
  };
  const fromVersion = state.meta?.schemaVersion;
  return migrateSchema(state, fromVersion);
}

/** 写单个键到 storage.local */
async function writeKey(key: string, value: unknown): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

// ── Store 创建 ────────────────────────────────────────────

export const useStorageStore = create<StorageStore>((set, get) => {
  let onChangedListener: ((changes: object, areaName: string) => void) | null = null;

  /** 注册 onChanged 监听器（只注册一次） */
  function ensureOnChangedListener(): void {
    if (onChangedListener) return;
    onChangedListener = (changes: object, areaName: string) => {
      if (areaName !== 'local') return;
      const current = get();
      const patch: Partial<AppStorageState> = {};
      let changed = false;

      for (const [key, change] of Object.entries(
        changes as Record<string, { newValue?: unknown }>,
      )) {
        const newValue = change.newValue;
        if (newValue === undefined) continue;
        switch (key) {
          case STORAGE_KEYS.meta:
            if (current.meta !== newValue) {
              patch.meta = newValue as AppStorageState['meta'];
              changed = true;
            }
            break;
          case STORAGE_KEYS.apiConfigs:
            if (current.apiConfigs !== newValue) {
              patch.apiConfigs = newValue as ApiConfig[];
              changed = true;
            }
            break;
          case STORAGE_KEYS.activeApiConfigId:
            if (current.activeApiConfigId !== newValue) {
              patch.activeApiConfigId = newValue as string | null;
              changed = true;
            }
            break;
          case STORAGE_KEYS.roles:
            if (current.roles !== newValue) {
              patch.roles = newValue as Role[];
              changed = true;
            }
            break;
          case STORAGE_KEYS.sessions:
            if (current.sessions !== newValue) {
              patch.sessions = newValue as Session[];
              changed = true;
            }
            break;
          case STORAGE_KEYS.uiPrefs:
            if (current.uiPrefs !== newValue) {
              patch.uiPrefs = newValue as UiPrefs;
              changed = true;
            }
            break;
        }
      }
      if (changed) {
        set(patch);
      }
    };
    browser.storage.onChanged.addListener(onChangedListener);
  }

  return {
    // 初始状态（init 前用默认值占位）
    ...createInitialState(),
    initialized: false,

    init: async () => {
      if (get().initialized) return;
      ensureOnChangedListener();
      const state = await loadFromStorage();
      // 确保 meta.schemaVersion 是当前版本
      if (state.meta.schemaVersion !== SCHEMA_VERSION) {
        state.meta = { ...state.meta, schemaVersion: SCHEMA_VERSION };
        await writeKey(STORAGE_KEYS.meta, state.meta);
      }
      // 首次启动 seed 默认角色（T1.3 D2）
      if (state.roles.length === 0) {
        state.roles = createBuiltinRoles();
        await writeKey(STORAGE_KEYS.roles, state.roles);
      }
      set({ ...state, initialized: true });
    },

    setApiConfigs: async (configs) => {
      set({ apiConfigs: configs });
      await writeKey(STORAGE_KEYS.apiConfigs, configs);
    },

    setActiveApiConfigId: async (id) => {
      set({ activeApiConfigId: id });
      await writeKey(STORAGE_KEYS.activeApiConfigId, id);
    },

    setRoles: async (roles) => {
      set({ roles });
      await writeKey(STORAGE_KEYS.roles, roles);
    },

    setSessions: async (sessions) => {
      set({ sessions });
      await writeKey(STORAGE_KEYS.sessions, sessions);
    },

    setUiPrefs: async (prefs) => {
      const merged = { ...get().uiPrefs, ...prefs };
      set({ uiPrefs: merged });
      await writeKey(STORAGE_KEYS.uiPrefs, merged);
    },
  };
});
