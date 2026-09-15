import { useState } from 'react';
import { useStorageStore } from '../../infra/storage/store';
import { generateId } from '../../core/id';
import { getMissingBuiltinRoles } from '../../core/builtinRoles';
import type { Role } from '../../core/types';
import { RoleForm } from './RoleForm';

/**
 * 角色列表（spec M1 T1.3）。
 * 默认角色 seed 后与用户自建角色同等可编辑/删除，提供"恢复默认角色"入口。
 */
export function RoleList() {
  const { roles, setRoles } = useStorageStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const missingBuiltins = getMissingBuiltinRoles(roles);

  const handleCreate = () => {
    setCreating(true);
    setEditingId(null);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此角色？引用该角色的会话会保留但显示"角色已删除"。')) return;
    await setRoles(roles.filter((r) => r.id !== id));
  };

  const handleDuplicate = async (role: Role) => {
    const newRole: Role = {
      ...role,
      id: generateId(),
      name: `${role.name} 副本`,
      builtin: false,
    };
    await setRoles([...roles, newRole]);
  };

  const handleRestoreDefaults = async () => {
    const toRestore = missingBuiltins.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      systemPrompt: def.systemPrompt,
      builtin: true,
    }));
    await setRoles([...roles, ...toRestore]);
  };

  const handleSave = async (role: Role) => {
    const exists = roles.some((r) => r.id === role.id);
    const updated = exists ? roles.map((r) => (r.id === role.id ? role : r)) : [...roles, role];
    await setRoles(updated);
    setCreating(false);
    setEditingId(null);
  };

  const handleCancel = () => {
    setCreating(false);
    setEditingId(null);
  };

  if (creating || editingId) {
    const editingRole = editingId ? roles.find((r) => r.id === editingId) : undefined;
    return <RoleForm initial={editingRole} onSave={handleSave} onCancel={handleCancel} />;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">角色</h2>
        <div className="flex gap-2">
          {missingBuiltins.length > 0 && (
            <button
              onClick={handleRestoreDefaults}
              className="rounded border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-2"
              title={`恢复 ${missingBuiltins.length} 个默认角色`}
            >
              恢复默认角色
            </button>
          )}
          <button
            onClick={handleCreate}
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            新建角色
          </button>
        </div>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-muted">暂无角色</p>
          <p className="mt-1 text-xs text-text-muted">点击"新建角色"或"恢复默认角色"</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {roles.map((role) => (
            <li
              key={role.id}
              className="rounded-xl border border-border bg-surface p-3 transition-shadow hover:shadow-sm"
            >
              {/* 顶部行：名称 + 标签 + 操作按钮 */}
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{role.name}</span>
                {role.builtin && (
                  <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-muted">
                    默认
                  </span>
                )}
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => handleDuplicate(role)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
                    title="复制"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(role.id)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
                    title="编辑"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                    title="删除"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* 描述 */}
              {role.description && (
                <div className="mt-1.5 text-xs text-text-muted">{role.description}</div>
              )}
              {/* 系统提示词预览 */}
              <div className="mt-1.5 line-clamp-2 text-xs text-text-muted/80">
                {role.systemPrompt.slice(0, 100)}
                {role.systemPrompt.length > 100 ? '…' : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
