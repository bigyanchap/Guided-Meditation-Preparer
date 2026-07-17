/** TTS key shapes that can also be used for IASTify when the LLM field is left empty. */
const PROVIDERS_SHARING_LLM: ReadonlySet<string> = new Set(['openai', 'huggingface', 'google']);

/**
 * IASTify key: explicit LLM key wins; otherwise, if the user only filled a compatible
 * TTS key (and paid TTS is on), use that for IASTify too.
 */
export function resolveIastifyApiKey(
  llmKey: string,
  ttsKey: string,
  ttsProvider: string,
  paidTts: boolean,
): string {
  if (llmKey.trim()) return llmKey.trim();
  if (!paidTts) return '';
  const t = ttsKey.trim();
  if (!t) return '';
  if (PROVIDERS_SHARING_LLM.has(ttsProvider)) return t;
  return '';
}
