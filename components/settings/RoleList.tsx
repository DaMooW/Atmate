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
        <ul className="space-y-2">
          {roles.map((role) => (
            <li key={role.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.name}</span>
                    {role.builtin && (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-muted">
                        默认
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <div className="mt-0.5 text-xs text-text-muted">{role.description}</div>
                  )}
                  <div className="mt-1 line-clamp-2 text-xs text-text-muted">
                    {role.systemPrompt.slice(0, 80)}...
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleDuplicate(role)}
                    className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-text"
                  >
                    复制
                  </button>
                  <button
                    onClick={() => handleEdit(role.id)}
                    className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-text"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10"
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
