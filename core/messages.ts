/**
 * 扩展内部消息类型定义（M2 T2.5）。
 *
 * 消息流：
 * - content script → background: AT_SELECTION_SEND（划词后发送选区）
 * - content script → background: AT_FLOAT_BUTTON_CLICK（浮动按钮点击）
 * - background → content script: SelectionSendResponse（分流结果：已投递 / 显示浮动按钮）
 * - background → sidepanel: AT_SELECTION_DELIVER（最终投递，创建素材卡片）
 * - sidepanel → background: AT_PANEL_READY（sidepanel 初始化完成，触发暂存消息转发）
 *
 * sidepanel 状态检测：
 * - sidepanel → background: chrome.runtime.connect({ name: 'at-sidepanel' })（long-lived port）
 * - background 通过 port.onConnect / port.onDisconnect 维护 panelOpen 状态
 */

/** 素材来源类型 */
export type MaterialSource = 'float-button' | 'context-menu' | 'auto-fill' | 'pdf-viewer';

/** PDF 元数据（M3 T3.4，随 viewer 页划词的 payload 携带） */
export interface PdfMeta {
  /** 文件名（从 URL 解析，decodeURIComponent） */
  fileName: string;
  /** 当前页码（1-based） */
  pageNumber: number;
  /** 总页数 */
  totalPages: number;
  /** 当前页是否为扫描件（无文字层） */
  isScanned?: boolean;
}

/** 上下文供给档位 */
export type ContextScope = 'selection' | 'nearby' | 'page';

/** 上下文数据（随选区消息一并传输） */
export interface ContextData {
  /** 纯选区文本（不可编辑，用于 prompt 标记） */
  selection: string;
  /** 包含选中文本的整段（containing-paragraph 档，D20） */
  containingParagraph?: string;
  /** 前一段落（nearby 档） */
  beforeParagraph?: string;
  /** 后一段落（nearby 档） */
  afterParagraph?: string;
  /** 整页正文（page 档） */
  fullPage?: string;
  /** readability 提取失败标记（page 档） */
  readabilityFailed?: boolean;
  /** 附 PDF 全文（pdf-full 档，M3 T3.6） */
  pdfFull?: string;
  /** PDF 全文截断标记（pdf-full 档） */
  pdfFullTruncated?: boolean;
  /** PDF 全文截取起始页（pdf-full 档） */
  pdfFullStartPage?: number;
  /** PDF 全文截取结束页（pdf-full 档） */
  pdfFullEndPage?: number;
  /** PDF 无文字层标记（扫描件，pdf-full 档） */
  pdfNoTextLayer?: boolean;
}

/** 选区消息 payload（content script → background） */
export interface SelectionSendPayload {
  /** 选中文本 */
  text: string;
  /** 网页标题 */
  title: string;
  /** 网页 URL */
  url: string;
  /** 来源 */
  source: MaterialSource;
  /** 上下文数据（T2.6 实现后填充，当前可选） */
  contextData?: ContextData;
  /** PDF 元数据（M3 T3.4，仅 viewer 页划词时携带） */
  pdfMeta?: PdfMeta;
}

/** content script → background: 划词后发送选区 */
export interface SelectionSendMessage {
  type: 'AT_SELECTION_SEND';
  payload: SelectionSendPayload;
}

/** background → content script: 分流结果回复 */
export interface SelectionSendResponse {
  /** true: 已直接转发给 sidepanel（侧边栏已打开）；false: 未投递 */
  delivered: boolean;
  /** true: content script 应显示浮动按钮（侧边栏未打开） */
  showFloatButton?: boolean;
}

/** content script → background: 浮动按钮点击 */
export interface FloatButtonClickMessage {
  type: 'AT_FLOAT_BUTTON_CLICK';
}

/** background → sidepanel: 最终投递，创建素材卡片 */
export interface SelectionDeliverMessage {
  type: 'AT_SELECTION_DELIVER';
  payload: SelectionSendPayload;
}

/** sidepanel → background: 初始化完成 */
export interface PanelReadyMessage {
  type: 'AT_PANEL_READY';
}

/** 所有消息类型的联合 */
export type ExtensionMessage =
  SelectionSendMessage | FloatButtonClickMessage | SelectionDeliverMessage | PanelReadyMessage;

/** sidepanel long-lived port 名称 */
export const SIDEPANEL_PORT_NAME = 'at-sidepanel';
