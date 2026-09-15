import { useState } from 'react';
import { useStorageStore } from '../../infra/storage/store';
import { generateId } from '../../core/id';
import { createDefaultThinking } from '../../core/thinking';
import { getContextLimit } from '../../core/contextLimits';
import { getModelCapability } from '../../core/modelCapabilities';
import type { ApiConfig } from '../../core/types';
import { ApiConfigForm } from './ApiConfigForm';

/**
 * API 配置列表（spec M1 T1.2）。
 * 展示所有配置，支持新建/编辑/删除/切换激活。
 */
export function ApiConfigList() {
  const { apiConfigs, activeApiConfigId, setApiConfigs, setActiveApiConfigId } = useStorageStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    setCreating(true);
    setEditingId(null);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 API 配置？')) return;
    const updated = apiConfigs.filter((c) => c.id !== id);
    await setApiConfigs(updated);
    if (activeApiConfigId === id) {
      await setActiveApiConfigId(updated.length > 0 ? updated[0]!.id : null);
    }
  };

  const handleActivate = async (id: string) => {
    await setActiveApiConfigId(id);
  };

  const handleSave = async (config: ApiConfig) => {
    const exists = apiConfigs.some((c) => c.id === config.id);
    const updated = exists
      ? apiConfigs.map((c) => (c.id === config.id ? config : c))
      : [...apiConfigs, config];
    await setApiConfigs(updated);
    if (!activeApiConfigId) {
      await setActiveApiConfigId(config.id);
    }
    setCreating(false);
    setEditingId(null);
  };

  const handleCancel = () => {
    setCreating(false);
    setEditingId(null);
  };

  // 新建或编辑时显示表单
  if (creating || editingId) {
    const editingConfig = editingId ? apiConfigs.find((c) => c.id === editingId) : undefined;
    return (
      <ApiConfigForm
        initial={editingConfig}
        onSave={handleSave}
        onCancel={handleCancel}
        existingNames={apiConfigs.filter((c) => c.id !== editingId).map((c) => c.name)}
      />
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">API 配置</h2>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          新建配置
        </button>
      </div>

      {apiConfigs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-muted">暂无 API 配置</p>
          <p className="mt-1 text-xs text-text-muted">点击"新建配置"添加你的第一个 API 端点</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {apiConfigs.map((config) => (
            <li
              key={config.id}
              className={`rounded-xl border p-3 transition-shadow hover:shadow-sm ${
                activeApiConfigId === config.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{config.name}</span>
                    {activeApiConfigId === config.id && (
                      <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        当前使用
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-xs text-text-muted">
                    {config.modelId} · {config.baseUrl}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  {activeApiConfigId !== config.id && (
                    <button
                      onClick={() => handleActivate(config.id)}
                      className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-text"
                    >
                      启用
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(config.id)}
                    className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-text"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="rounded-md px-2 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 创建一个新的空白 ApiConfig（用于新建表单的初始值）。
 */
export function createEmptyApiConfig(): ApiConfig {
  return {
    id: generateId(),
    name: '',
    baseUrl: '',
    apiKey: '',
    modelId: '',
    contextLimit: 128000,
    thinking: createDefaultThinking('reasoning_effort'),
    collectUsage: true,
    collectUsageSupported: null,
    vision: false,
  };
}

/**
 * 根据 modelId 自动填充 contextLimit 和 thinking 配置（用于表单中 modelId 变化时）。
 */
export function autoFillFromModelId(modelId: string): {
  contextLimit?: number;
  thinking?: ApiConfig['thinking'];
} {
  const result: { contextLimit?: number; thinking?: ApiConfig['thinking'] } = {};
  const limit = getContextLimit(modelId);
  if (limit !== null) result.contextLimit = limit;
  const cap = getModelCapability(modelId);
  if (cap.thinkingType === 'none') {
    result.thinking = {
      ...createDefaultThinking('reasoning_effort'),
      enabled: false,
      level: 'off',
    };
  } else if (cap.thinkingType === 'reasoning_effort') {
    result.thinking = createDefaultThinking('reasoning_effort');
  } else if (cap.thinkingType === 'budget_tokens') {
    result.thinking = createDefaultThinking('budget_tokens');
  }
  return result;
}
