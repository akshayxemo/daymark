/**
 * Thin JSON client for the versioned REST API. Every response is either
 * `{ data }` or `{ error: { code, message, details } }` (see server/http).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level issues from validation errors, keyed by path. */
  get issues(): Record<string, string> {
    const details = this.details as { issues?: { path: string; message: string }[] } | null;
    const result: Record<string, string> = {};
    for (const issue of details?.issues ?? []) {
      if (!(issue.path in result)) result[issue.path] = issue.message;
    }
    return result;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const response = await fetch(withQuery(`/api/v1${path}`, query), {
    method,
    headers:
      body === undefined
        ? { Accept: 'application/json' }
        : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (response.status === 204) return undefined as T;
  let payload: { data?: T; error?: { code: string; message: string; details?: unknown } } | null =
    null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || !payload || payload.error) {
    const error = payload?.error;
    if (response.status === 401 && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // A full reload is intended: it discards all cached private data from the expired session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}`);
    }
    throw new ApiError(
      response.status,
      error?.code ?? 'request_failed',
      error?.message ?? `Request failed (${response.status}).`,
      error?.details ?? null,
    );
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string, query?: Query) => request<T>('DELETE', path, undefined, query),
};
