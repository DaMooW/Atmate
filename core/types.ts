/**
 * 域模型类型定义（techniqueStack §5）
 * M1 schemaVersion = 1；M4 起升 v2（消息内容 parts 化）。
 */

// ── 思维强度 ──────────────────────────────────────────────

export type ThinkingLevel = 'off' | 'light' | 'medium' | 'deep';

export interface ThinkingConfig {
  /** 映射方式：reasoning_effort / budget_tokens / custom 模板插值 */
  mapping: 'reasoning_effort' | 'budget_tokens' | 'custom';
  /** 各档位对应的值（reasoning_effort 为字符串，budget_tokens 为数字，custom 为模板片段） */
  values: Record<Exclude<ThinkingLevel, 'off'>, string | number>;
  /** 仅 mapping='custom' 时使用，支持 {{level}} 变量插值 */
  customTemplate?: string;
}

export interface Thinking {
  enabled: boolean;
  level: ThinkingLevel;
  config: ThinkingConfig;
}

// ── API 配置 ──────────────────────────────────────────────

export interface ApiConfig {
  id: string;
  name: string;
  /** 形如 https://api.x.com/v1 */
  baseUrl: string;
  /** 存储层明文、UI 层脱敏、日志永不落盘（NFR-2） */
  apiKey: string;
  modelId: string;
  /** token；按 modelId 命中预填表则自动填，可改 */
  contextLimit: number;
  thinking: Thinking;
  /** 是否带 stream_options.include_usage；失败自动降级重试一次（tech §6） */
  collectUsage: boolean;
  /** collectUsage 探测结果缓存：端点是否支持 include_usage；null=未探测 */
  collectUsageSupported: boolean | null;
  /** 附加请求体 JSON（M5 加分项，M1 预留字段） */
  extraBody?: object;
  /** 温度（M5 加分项，M1 预留字段） */
  temperature?: number;
  /** 该模型是否支持图片输入，默认 false（FR-4.6，M4 才用） */
  vision: boolean;
}

// ── 角色 ──────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  systemPrompt: string;
  icon?: string;
  description?: string;
  /** 是否来自默认 seed；仅作元数据标记，不阻止编辑/删除（spec M1 D2 修订） */
  builtin: boolean;
}

// ── 消息 ──────────────────────────────────────────────────

export type MsgSourceType = 'page' | 'pdf' | 'manual';

export interface MsgSource {
  type: MsgSourceType;
  title?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  /** M1 为纯文本 string；M4 起可分段 StoredPart[]（含图引用） */
  content: string;
  /** 旁路采集的思维链（M1 采集但不展示，M5 折叠展示） */
  reasoning?: string;
  source?: MsgSource;
  /** 精确模式时存在（API 返回 usage） */
  usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  createdAt: number;
}

// ── 会话 ──────────────────────────────────────────────────

export interface Session {
  id: string;
  roleId: string;
  /** 默认取首条用户消息前 20 字 */
  title: string;
  messages: ChatMessage[];
  /** 会话累计 token（精确+估算混合，tech §7） */
  cumulativeTokens: number;
  createdAt: number;
  updatedAt: number;
}

// ── UI 偏好 ───────────────────────────────────────────────

export type ContextScope = 'selection' | 'containing-paragraph' | 'nearby' | 'page' | 'pdf-full';
export type Locale = 'zh-CN' | 'en-US';
/** PDF 打开方式（M3 T3.2）：每次询问 / 始终扩展查看页 / 始终原生查看器 */
export type PdfOpenMode = 'ask' | 'viewer' | 'native';

export interface UiPrefs {
  /** 基础指令开关（FR-1.6），默认 true */
  baseDirectiveEnabled: boolean;
  /** 默认上下文供给档位（FR-2.5，M2 起用） */
  defaultContextScope: ContextScope;
  /** 界面语言（M6 起提供切换，M1 默认 zh-CN） */
  locale: Locale;
  /** PDF 打开方式（M3 T3.2），默认 'ask' */
  pdfOpenMode: PdfOpenMode;
}

// ── 存储元信息 ────────────────────────────────────────────

export interface StorageMeta {
  schemaVersion: number;
}

// ── 完整存储状态 ──────────────────────────────────────────

export interface AppStorageState {
  meta: StorageMeta;
  apiConfigs: ApiConfig[];
  activeApiConfigId: string | null;
  roles: Role[];
  sessions: Session[];
  uiPrefs: UiPrefs;
}
