import type { ElectronNetFetchRequest, ElectronNetFetchResult } from './electron-api';

function headersToRecord(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (h instanceof Headers) {
    h.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = v;
    return out;
  }
  for (const [k, v] of Object.entries(h)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}

function normalizeStringBody(body: BodyInit | null | undefined): string | null {
  if (body == null) return null;
  if (typeof body === 'string') return body;
  throw new TypeError('Request body must be a string for Electron net fetch');
}

/**
 * Same as `fetch` for this app, but in the packaged Electron app (`file://`)
 * HTTP calls run in the main process so third-party APIs are not blocked by CORS.
 */
export async function appFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const netFetch = typeof window !== 'undefined' ? window.electronAPI?.netFetch : undefined;
  if (!netFetch) {
    return fetch(input, init);
  }

  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();
  const bodyStr = init?.body != null ? normalizeStringBody(init.body) : null;

  const payload: ElectronNetFetchRequest = {
    url,
    method,
    headers: headersToRecord(init?.headers),
    body: bodyStr,
  };

  const result = (await netFetch(payload)) as ElectronNetFetchResult;
  const responseHeaders = new Headers();
  for (const [k, v] of Object.entries(result.headers)) {
    responseHeaders.set(k, v);
  }
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers: responseHeaders,
  });
}
