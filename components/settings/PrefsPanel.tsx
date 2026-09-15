import { useStorageStore } from '../../infra/storage/store';
import { DIRECTIVE_V1 } from '../../core/directive';
import type { PdfOpenMode } from '../../core/types';

/**
 * 偏好设置面板（spec M1 T1.9，M3 T3.2 扩展）。
 * 基础指令开关（FR-1.6），默认开，下一次发送生效，不追溯。
 * PDF 打开方式（M3）：每次询问 / 始终扩展查看页 / 始终原生查看器。
 */
export function PrefsPanel() {
  const { uiPrefs, setUiPrefs } = useStorageStore();

  const handleToggleBaseDirective = () => {
    setUiPrefs({ baseDirectiveEnabled: !uiPrefs.baseDirectiveEnabled });
  };

  const handlePdfOpenMode = (mode: PdfOpenMode) => {
    setUiPrefs({ pdfOpenMode: mode });
  };

  const pdfOpenOptions: Array<{ value: PdfOpenMode; label: string; desc: string }> = [
    { value: 'ask', label: '每次询问', desc: '打开 PDF 时弹出选择窗' },
    { value: 'viewer', label: '始终扩展查看页', desc: '直接用在伴 PDF 查看器打开，支持划词' },
    { value: 'native', label: '始终 Chrome 原生', desc: '用 Chrome 内置查看器，不支持划词' },
  ];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-base font-semibold">偏好设置</h2>
      </div>

      {/* 基础指令 */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium">全局基础指令</h3>
            <p className="mt-1 text-xs text-text-muted">
              开启后，每个请求的 system
              在角色提示词之后追加一段统一指令，包含：信息完备性判断、缺失信息清单、不得编造。
            </p>
          </div>
          <label className="relative ml-4 inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={uiPrefs.baseDirectiveEnabled}
              onChange={handleToggleBaseDirective}
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-surface-2 transition-colors peer-checked:bg-primary" />
            <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </label>
        </div>

        {uiPrefs.baseDirectiveEnabled && (
          <div className="mt-3 rounded bg-surface-2 p-3">
            <p className="mb-1 text-xs font-medium text-text-muted">当前指令内容（v1）：</p>
            <pre className="max-h-40 overflow-y-auto text-xs whitespace-pre-wrap text-text-muted">
              {DIRECTIVE_V1}
            </pre>
          </div>
        )}

        <p className="mt-2 text-xs text-text-muted">
          开关变更后下一次发送生效，不影响已发送的请求。
        </p>
      </div>

      {/* PDF 打开方式（M3 T3.2） */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium">PDF 打开方式</h3>
        <p className="mt-1 text-xs text-text-muted">
          Chrome 原生 PDF 查看器不支持划词，扩展查看页基于 pdf.js 渲染，可正常划词。
        </p>
        <div className="mt-3 space-y-2">
          {pdfOpenOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                uiPrefs.pdfOpenMode === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="pdfOpenMode"
                value={opt.value}
                checked={uiPrefs.pdfOpenMode === opt.value}
                onChange={() => handlePdfOpenMode(opt.value)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-text-muted">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 预留：其他偏好设置（M5+） */}
      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-xs text-text-muted">
          更多偏好设置（界面语言、默认上下文范围等）将在后续版本中提供。
        </p>
      </div>
    </div>
  );
}
