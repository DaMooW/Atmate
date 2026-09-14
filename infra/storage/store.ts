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
  rememberLocalWrite(key, value);
  await browser.storage.local.set({ [key]: value });
}

// ── 本地写入回声抑制（specs/20260914-m1-fix-storage-echo / ADR-010） ──────
/**
 * `storage.local.set` 是异步的：本上下文写完后，onChanged 会把同一次写入广播回来，
 * 而且回声常常滞后于后续写入（实测 200 次快速写入里 199 次回声到达时，存储中已是更新的值）。
 * 若把回声当作外部变更无条件套用，内存状态会被拉回旧快照——流式输出每块都写一次盘，
 * 后续增量便叠加在旧内容上，中间那段内容永久丢失（M1 验收实测丢掉约六成正文）。
 *
 * 做法：写入前登记该值的指纹；onChanged 命中已登记的指纹即视为自身回声并忽略，
 * 未命中才是其他上下文（background / viewer）的真实变更，照常回流。
 */
const LOCAL_ECHO_LIMIT = 512;
const pendingLocalEchoes = new Map<string, string[]>();

/**
 * 稳定序列化：对象键递归排序后再 stringify。
 * storage 会把写入值重新序列化，回声里的键序（字母序）与写入时不同，
 * 直接 JSON.stringify 会导致指纹对不上（实测 325 次写入 0 命中），必须规范键序。
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value)) ?? '';
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) sorted[key] = sortKeysDeep(source[key]);
    return sorted;
  }
  return value;
}

/** 值指纹：稳定序列化 + FNV-1a 32 位（附长度，降低碰撞影响） */
function fingerprint(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16)}:${text.length}`;
}

/** 登记一次本地写入（每写一次，最终会有且只有一个回声） */
function rememberLocalWrite(key: string, value: unknown): void {
  let list = pendingLocalEchoes.get(key);
  if (!list) {
    list = [];
    pendingLocalEchoes.set(key, list);
  }
  list.push(fingerprint(value));
  // 上限保护：只可能因回声丢失而堆积，丢最旧的即可
  if (list.length > LOCAL_ECHO_LIMIT) list.shift();
}

/** 命中本地写入指纹则出队并返回 true（调用方应忽略该变更） */
function consumeLocalEcho(key: string, value: unknown): boolean {
  const list = pendingLocalEchoes.get(key);
  if (!list || list.length === 0) return false;
  const index = list.indexOf(fingerprint(value));
  if (index === -1) {
    return false;
  }
  // 每次回声只确认一次写入；不依赖到达顺序
  list.splice(index, 1);
  if (list.length === 0) pendingLocalEchoes.delete(key);
  return true;
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
        // 自身写入的回声不回流（见文件上方注释）
        if (consumeLocalEcho(key, newValue)) continue;
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
