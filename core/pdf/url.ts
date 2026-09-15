/**
 * PDF URL 解析与判断纯函数（M3 T3.1/T3.2，L1 可单测）。
 *
 * 职责：
 * - 判断 URL 是否为 PDF（扩展名 / Content-Type 辅助由调用方完成）
 * - 从 URL 提取文件名
 * - 解析 viewer.html 的查询参数
 */

/**
 * 判断 URL 是否指向 PDF 文件（基于扩展名）。
 * 不依赖网络请求，Content-Type 检测由 background 调用方完成。
 *
 * @param url - 任意 URL 字符串
 * @returns true 如果 URL 路径以 .pdf 结尾（忽略 query/hash，大小写不敏感）
 */
export function isPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // 去掉 query 和 hash 后取路径的最后一段
    const path = parsed.pathname.toLowerCase();
    return path.endsWith('.pdf');
  } catch {
    // 无效 URL 直接返回 false
    return false;
  }
}

/**
 * 从 URL 提取文件名（最后一段路径，decodeURIComponent）。
 *
 * @param url - PDF URL（http/https/file://）
 * @returns 文件名；解析失败时返回 'unknown.pdf'
 */
export function extractFileName(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/');
    const last = segments[segments.length - 1];
    if (!last) return 'unknown.pdf';
    return decodeURIComponent(last);
  } catch {
    return 'unknown.pdf';
  }
}

/**
 * 解析 viewer.html 的查询参数，获取要加载的 PDF URL。
 *
 * viewer.html?file=<encoded_pdf_url>
 *
 * @param search - window.location.search（含开头的 ?）
 * @returns 解码后的 PDF URL；无 file 参数时返回 null
 */
export function parseViewerUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  const file = params.get('file');
  if (!file) return null;
  try {
    // 验证是合法 URL
    new URL(file);
    return file;
  } catch {
    return null;
  }
}

/**
 * 判断是否为 file:// 协议 URL。
 */
export function isFileUrl(url: string): boolean {
  return url.startsWith('file://');
}
