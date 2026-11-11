export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly details: Record<string, unknown>

  constructor(
    status: number,
    code?: string,
    message?: string,
    details: Record<string, unknown> = {},
  ) {
    super(message || `Сервер ответил с ошибкой HTTP ${status}.`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface JsonRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function acceptsJson(contentType: string | null): boolean {
  const mediaType = contentType?.split(';', 1)[0]?.trim().toLowerCase()
  return (
    mediaType === 'application/json' ||
    Boolean(mediaType?.startsWith('application/') && mediaType.endsWith('+json'))
  )
}

export async function requestJson(path = '', options: JsonRequestOptions = {}): Promise<unknown> {
  const url = path ? `${apiBaseUrl}/${path.replace(/^\/+/, '')}` : apiBaseUrl
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })

  if (!acceptsJson(response.headers.get('content-type'))) {
    if (!response.ok) throw new ApiError(response.status)
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'Ожидался JSON-ответ API. Проверьте адрес сервера.',
    )
  }

  let data: unknown
  try {
    data = await response.json()
  } catch (error) {
    // Preserve fetch/body-stream network and abort errors so writes can be reconciled before retrying.
    if (!(error instanceof SyntaxError)) throw error
    if (!response.ok) throw new ApiError(response.status)
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'API вернул некорректный JSON.')
  }

  if (!response.ok) {
    const envelope = isRecord(data) && isRecord(data.error) ? data.error : null
    throw new ApiError(
      response.status,
      typeof envelope?.code === 'string' ? envelope.code : undefined,
      typeof envelope?.message === 'string' ? envelope.message : undefined,
      isRecord(envelope?.details) ? envelope.details : {},
    )
  }

  return data
}

export function getJson(path = '', signal?: AbortSignal): Promise<unknown> {
  return requestJson(path, { signal })
}
