/**
 * Storage schema 版本与迁移（techniqueStack §5）
 * 当前版本 SCHEMA_VERSION = 1（M1）。
 * M4 起升 v2：消息内容 parts 化（ChatMessage.content 从 string 变为 StoredPart[]）。
 */

import type { AppStorageState, UiPrefs } from './types';

export const SCHEMA_VERSION = 1;

/** 迁移用的输入状态类型：顶层字段可选，uiPrefs 也可部分缺失 */
type MigrationInput = Omit<Partial<AppStorageState>, 'uiPrefs'> & {
  uiPrefs?: Partial<UiPrefs>;
};

/**
 * 迁移存储状态到目标版本。
 * 当前只有 v1，未知版本抛错而非静默处理。
 *
 * @param state 从 storage 读取的原始状态（可能缺字段）
 * @param fromVersion 读取到的 schemaVersion
 * @param toVersion 目标版本，默认 SCHEMA_VERSION
 * @returns 迁移后的完整状态
 * @throws 当 fromVersion 高于 toVersion（数据来自更新版本）或版本未知时
 */
export function migrateSchema(
  state: MigrationInput,
  fromVersion: number | undefined,
  toVersion: number = SCHEMA_VERSION,
): AppStorageState {
  if (fromVersion !== undefined && fromVersion > toVersion) {
    throw new Error(
      `migrateSchema: 数据版本 v${fromVersion} 高于当前支持的 v${toVersion}，请更新扩展`,
    );
  }

  // v0（无版本号，全新安装或旧数据）→ v1：补全默认字段
  // 当前 v1 是首个版本，迁移逻辑就是确保所有字段存在
  // 未来 v1→v2 在此处追加迁移函数

  return ensureV1Fields(state);
}

/**
 * 确保状态包含 v1 schema 的所有字段，缺失的补默认值。
 * 这是 v1 的"幂等补全"，也是未来迁移的终点。
 */
function ensureV1Fields(state: MigrationInput): AppStorageState {
  return {
    meta: state.meta ?? { schemaVersion: SCHEMA_VERSION },
    apiConfigs: state.apiConfigs ?? [],
    activeApiConfigId: state.activeApiConfigId ?? null,
    roles: state.roles ?? [],
    sessions: state.sessions ?? [],
    uiPrefs: {
      baseDirectiveEnabled: state.uiPrefs?.baseDirectiveEnabled ?? true,
      defaultContextScope: state.uiPrefs?.defaultContextScope ?? 'selection',
      locale: state.uiPrefs?.locale ?? 'zh-CN',
    },
  };
}
