import { useState } from 'react';
import { generateId } from '../../core/id';
import type { Role } from '../../core/types';

/**
 * 角色新建/编辑表单（spec M1 T1.3）。
 */
interface Props {
  initial?: Role;
  onSave: (role: Role) => void;
  onCancel: () => void;
}

export function RoleForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setError('角色名称不能为空');
      return;
    }
    if (!systemPrompt.trim()) {
      setError('系统提示词不能为空');
      return;
    }
    onSave({
      id: initial?.id ?? generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      systemPrompt: systemPrompt.trim(),
      builtin: initial?.builtin ?? false,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">{initial ? '编辑角色' : '新建角色'}</h2>
        <button onClick={onCancel} className="text-sm text-text-muted hover:text-text">
          返回列表
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：翻译官"
            className="input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">描述（可选）</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="一句话说明这个角色的用途"
            className="input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">系统提示词</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="定义 AI 的身份、行为准则和输出格式..."
            className="input h-64 resize-none font-mono text-xs leading-relaxed"
          />
          <p className="mt-1 text-xs text-text-muted">
            该提示词会在每次请求时作为 system message 发送给模型
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

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
