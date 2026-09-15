/**
 * SSE 流式解析器（techniqueStack §6）
 *
 * 逐行扫描 data:；[DONE] 结束；delta.content 累积正文；
 * delta.reasoning_content（DeepSeek 系）与 delta.reasoning（OpenRouter 系）采集进 reasoning 旁路。
 */

export interface SSECallbacks {
  /** 正文增量 */
  onContent?: (delta: string) => void;
  /** 思维链增量（旁路采集，M1 不展示） */
  onReasoning?: (delta: string) => void;
  /** usage 数据（流式末尾的 usage chunk） */
  onUsage?: (usage: { prompt: number; completion: number; total: number }) => void;
  /** 流正常结束 */
  onDone?: () => void;
  /** 解析错误 */
  onError?: (error: Error) => void;
}

export interface SSEParseResult {
  /** 累积的完整正文 */
  content: string;
  /** 累积的完整思维链 */
  reasoning: string;
  /** usage 数据（如有） */
  usage?: { prompt: number; completion: number; total: number };
  /** 是否正常结束（收到 [DONE]） */
  done: boolean;
}

/**
 * 从 ReadableStream 解析 SSE 流。
 *
 * @param stream fetch 返回的 response.body
 * @param callbacks 事件回调
 * @returns 解析结果（累积的完整内容）
 */
export async function parseSSE(
  stream: ReadableStream<Uint8Array>,
  callbacks: SSECallbacks = {},
): Promise<SSEParseResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let reasoning = '';
  let usage: SSEParseResult['usage'];
  let done = false;

  try {
    while (true) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行处理（SSE 事件以 \n\n 分隔事件，每行以 data: 开头）
      const lines = buffer.split('\n');
      // 最后一行可能不完整，保留到 buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue; // 空行分隔事件
        if (!trimmed.startsWith('data:')) continue; // 忽略非 data 行（如 event: / id: / retry:）

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          done = true;
          callbacks.onDone?.();
          continue;
        }

        try {
          const data = JSON.parse(dataStr);
          processChunk(
            data,
            callbacks,
            (delta) => {
              content += delta;
            },
            (delta) => {
              reasoning += delta;
            },
            (u) => {
              usage = u;
            },
          );
        } catch {
          // 畸形 JSON 不中断流，记录错误
          callbacks.onError?.(new Error(`SSE 解析失败: ${dataStr.slice(0, 100)}`));
        }
      }
    }

    // 处理 buffer 中剩余的最后一行
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          done = true;
          callbacks.onDone?.();
        } else {
          try {
            const data = JSON.parse(dataStr);
            processChunk(
              data,
              callbacks,
              (delta) => {
                content += delta;
              },
              (delta) => {
                reasoning += delta;
              },
              (u) => {
                usage = u;
              },
            );
          } catch {
            // 忽略末尾畸形行
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content, reasoning, usage, done };
}

/**
 * 处理单个 SSE chunk。
 */
function processChunk(
  data: Record<string, unknown>,
  callbacks: SSECallbacks,
  appendContent: (delta: string) => void,
  appendReasoning: (delta: string) => void,
  setUsage: (u: { prompt: number; completion: number; total: number }) => void,
): void {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (choices && choices.length > 0) {
    const delta = choices[0]!.delta as Record<string, unknown> | undefined;
    if (delta) {
      // 正文
      if (typeof delta.content === 'string' && delta.content) {
        callbacks.onContent?.(delta.content);
        appendContent(delta.content);
      }
      // 思维链：DeepSeek 系用 reasoning_content，OpenRouter 系用 reasoning
      if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
        callbacks.onReasoning?.(delta.reasoning_content);
        appendReasoning(delta.reasoning_content);
      }
      if (typeof delta.reasoning === 'string' && delta.reasoning) {
        callbacks.onReasoning?.(delta.reasoning);
        appendReasoning(delta.reasoning);
      }
    }
  }

  // usage（流式末尾的 usage chunk，通常 choices 为空）
  const usageData = data.usage as Record<string, unknown> | undefined;
  if (usageData) {
    const u = {
      prompt: Number(usageData.prompt_tokens ?? 0),
      completion: Number(usageData.completion_tokens ?? 0),
      total: Number(usageData.total_tokens ?? 0),
    };
    callbacks.onUsage?.(u);
    setUsage(u);
  }
}
