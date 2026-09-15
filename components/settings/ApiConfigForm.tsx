import { useState, useCallback } from 'react';
import { validateApiConfigForm, type ValidationError } from '../../core/validation';
import { getModelCapability } from '../../core/modelCapabilities';
import { createDefaultThinking } from '../../core/thinking';
import { testConnection, type ConnectionTestResult } from '../../infra/llm/connectionTest';
import { createEmptyApiConfig, autoFillFromModelId } from './ApiConfigList';
import type { ApiConfig, ThinkingLevel } from '../../core/types';

/**
 * API 配置新建/编辑表单（spec M1 T1.2）。
 * 包含字段校验、思维强度三映射、contextLimit 预填、连接测试。
 */
interface Props {
  initial?: ApiConfig;
  onSave: (config: ApiConfig) => void;
  onCancel: () => void;
  existingNames: string[];
}

export function ApiConfigForm({ initial, onSave, onCancel, existingNames }: Props) {
  const [form, setForm] = useState<ApiConfig>(initial ?? createEmptyApiConfig());
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const update = useCallback(<K extends keyof ApiConfig>(key: K, value: ApiConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  }, []);

  /** modelId 变化时自动填充 contextLimit 和 thinking */
  const handleModelIdChange = (value: string) => {
    const auto = autoFillFromModelId(value);
    setForm((prev) => ({
      ...prev,
      modelId: value,
      contextLimit: auto.contextLimit ?? prev.contextLimit,
      thinking: auto.thinking ?? prev.thinking,
    }));
    setTestResult(null);
  };

  /** 思维强度开关切换 */
  const handleThinkingEnabledChange = (enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      thinking: {
        ...prev.thinking,
        enabled,
        level: enabled ? prev.thinking.level : 'off',
      },
    }));
  };

  /** 思维强度档位切换 */
  const handleThinkingLevelChange = (level: ThinkingLevel) => {
    setForm((prev) => ({ ...prev, thinking: { ...prev.thinking, level } }));
  };

  /** 思维强度映射类型切换 */
  const handleMappingChange = (mapping: 'reasoning_effort' | 'budget_tokens' | 'custom') => {
    setForm((prev) => ({
      ...prev,
      thinking: createDefaultThinking(mapping),
    }));
  };

  /** 连接测试 */
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(form);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  /** 保存 */
  const handleSave = () => {
    const errs = validateApiConfigForm(
      {
        name: form.name,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey,
        modelId: form.modelId,
        contextLimit: form.contextLimit,
        thinkingMapping: form.thinking.config.mapping,
        customTemplate: form.thinking.config.customTemplate,
      },
      existingNames,
    );
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    onSave(form);
  };

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;
  const cap = getModelCapability(form.modelId);
  /** 不支持思维链的模型：强制禁用，不允许手动覆盖（M1 验收修订 D-2） */
  const thinkingDisabled = cap.thinkingType === 'none';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">{initial ? '编辑配置' : '新建配置'}</h2>
        <button onClick={onCancel} className="text-sm text-text-muted hover:text-text">
          返回列表
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* 名称 */}
        <Field label="名称" error={getError('name')}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="例如：DeepSeek"
            className="input"
          />
        </Field>

        {/* Base URL */}
        <Field label="Base URL" error={getError('baseUrl')}>
          <input
            type="text"
            value={form.baseUrl}
            onChange={(e) => update('baseUrl', e.target.value)}
            placeholder="https://api.deepseek.com/v1"
            className="input"
          />
        </Field>

        {/* API Key */}
        <Field label="API Key" error={getError('apiKey')}>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => update('apiKey', e.target.value)}
              placeholder="sk-..."
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="rounded-md border border-border px-2 text-xs text-text-muted hover:bg-surface-2"
            >
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
          <p className="mt-1 text-xs text-text-muted">仅存储在本机 chrome.storage.local，不上传</p>
        </Field>

        {/* 模型 ID */}
        <Field label="模型 ID" error={getError('modelId')}>
          <input
            type="text"
            value={form.modelId}
            onChange={(e) => handleModelIdChange(e.target.value)}
            placeholder="deepseek-chat"
            className="input"
          />
          {thinkingDisabled && form.modelId && (
            <p className="mt-1 text-xs text-text-muted">该模型不支持思维链，思维强度已禁用</p>
          )}
        </Field>

        {/* 上下文上限 */}
        <Field label="上下文上限（token）" error={getError('contextLimit')}>
          <input
            type="number"
            value={form.contextLimit}
            onChange={(e) => update('contextLimit', Number(e.target.value))}
            className="input"
            min={1}
          />
        </Field>

        {/* 思维强度 */}
        <div className="rounded-xl border border-border p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">思维强度</span>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                disabled={thinkingDisabled}
                checked={form.thinking.enabled && !thinkingDisabled}
                onChange={(e) => handleThinkingEnabledChange(e.target.checked)}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              />
              启用
            </label>
          </div>

          {form.thinking.enabled && (
            <div className="space-y-3">
              {/* 映射类型 */}
              <div>
                <label className="mb-1 block text-xs text-text-muted">映射方式</label>
                <select
                  value={form.thinking.config.mapping}
                  onChange={(e) =>
                    handleMappingChange(
                      e.target.value as 'reasoning_effort' | 'budget_tokens' | 'custom',
                    )
                  }
                  className="input"
                >
                  <option value="reasoning_effort">reasoning_effort</option>
                  <option value="budget_tokens">budget_tokens</option>
                  <option value="custom">自定义 JSON</option>
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  {form.thinking.config.mapping === 'reasoning_effort' &&
                    '适用于 DeepSeek / OpenAI o 系列等支持 reasoning_effort 字段的模型'}
                  {form.thinking.config.mapping === 'budget_tokens' &&
                    '适用于支持 thinking.budget_tokens 字段的模型'}
                  {form.thinking.config.mapping === 'custom' &&
                    '使用自定义 JSON 模板，通过 {{level}} 占位符插入档位值'}
                </p>
              </div>

              {/* 档位选择 */}
              <div>
                <label className="mb-1 block text-xs text-text-muted">档位</label>
                <div className="flex gap-2">
                  {(['light', 'medium', 'deep'] as const).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => handleThinkingLevelChange(lv)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                        form.thinking.level === lv
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-text-muted hover:bg-surface-2'
                      }`}
                    >
                      {lv === 'light' ? '轻' : lv === 'medium' ? '中' : '深'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 各档位值配置 */}
              <div className="space-y-2">
                {(['light', 'medium', 'deep'] as const).map((lv) => (
                  <div key={lv} className="flex items-center gap-2">
                    <span className="w-8 text-xs text-text-muted">
                      {lv === 'light' ? '轻' : lv === 'medium' ? '中' : '深'}
                    </span>
                    <input
                      type={form.thinking.config.mapping === 'budget_tokens' ? 'number' : 'text'}
                      value={String(form.thinking.config.values[lv] ?? '')}
                      onChange={(e) => {
                        const val =
                          form.thinking.config.mapping === 'budget_tokens'
                            ? Number(e.target.value)
                            : e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          thinking: {
                            ...prev.thinking,
                            config: {
                              ...prev.thinking.config,
                              values: { ...prev.thinking.config.values, [lv]: val },
                            },
                          },
                        }));
                      }}
                      className="input flex-1"
                      placeholder={
                        form.thinking.config.mapping === 'reasoning_effort'
                          ? lv === 'light'
                            ? 'low'
                            : lv === 'medium'
                              ? 'medium'
                              : 'high'
                          : lv === 'light'
                            ? '2000'
                            : lv === 'medium'
                              ? '4000'
                              : '8000'
                      }
                    />
                  </div>
                ))}
              </div>

              {/* 自定义模板 */}
              {form.thinking.config.mapping === 'custom' && (
                <div>
                  <label className="mb-1 block text-xs text-text-muted">
                    JSON 模板（使用 {'{{level}}'} 占位）
                  </label>
                  <textarea
                    value={form.thinking.config.customTemplate ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        thinking: {
                          ...prev.thinking,
                          config: { ...prev.thinking.config, customTemplate: e.target.value },
                        },
                      }))
                    }
                    className="input h-20 font-mono text-xs"
                    placeholder='{"reasoning_effort":"{{level}}"}'
                  />
                  {getError('customTemplate') && (
                    <p className="mt-1 text-xs text-danger">{getError('customTemplate')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* collectUsage */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <span className="text-sm font-medium">请求用量统计</span>
            <p className="text-xs text-text-muted">
              带 stream_options.include_usage，端点不支持时自动降级
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.collectUsage}
            onChange={(e) => update('collectUsage', e.target.checked)}
          />
        </div>

        {/* 连接测试 */}
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">连接测试</span>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-50"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>
          {testResult && (
            <p className={`mt-2 text-xs ${testResult.ok ? 'text-success' : 'text-danger'}`}>
              {testResult.ok ? '✓ ' : '✗ '}
              {testResult.message}
            </p>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex shrink-0 gap-2 border-t border-border bg-surface px-4 py-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border py-2 text-sm text-text-muted hover:bg-surface-2"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          保存
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
