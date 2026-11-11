import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequestTimeoutMs, ApiTimeoutError, getJson, requestJson } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function waitForAbort(signal: AbortSignal): Promise<Response> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason)
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
}

describe('jSON API client', () => {
  it.each([
    ['/api', 'v1/status', '/api/v1/status'],
    ['https://api.example.com/api///', '/v2/status', 'https://api.example.com/api/v2/status'],
    ['https://api.example.com/api/', '', 'https://api.example.com/api'],
  ])('uses the request version independently of the base URL %s', async (base, path, expected) => {
    vi.stubEnv('VITE_API_BASE_URL', base)
    vi.resetModules()
    const { requestJson: request } = await import('./client')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await request(path)

    expect(fetchMock).toHaveBeenCalledWith(expected, expect.objectContaining({ method: 'GET' }))
  })

  it('sends JSON with a cancellable deadline signal without retrying a write', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: 2 }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal

    await expect(
      requestJson('/v1/schedules/example/cells', {
        method: 'PATCH',
        body: { expectedVersion: 1 },
        signal,
      }),
    ).resolves.toEqual({ version: 2 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/schedules/example/cells', {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedVersion: 1 }),
      signal: expect.any(AbortSignal),
    })
  })

  it.each(['GET', 'PATCH', 'POST'] as const)(
    'aborts a stalled %s after the deadline without retrying it',
    async (method) => {
      vi.useFakeTimers()
      let signal!: AbortSignal
      const fetchMock = vi.fn((_url: string, options: RequestInit) => {
        signal = options.signal!
        return waitForAbort(signal)
      })
      vi.stubGlobal('fetch', fetchMock)
      const rejection = expect(requestJson('stalled', { method })).rejects.toBeInstanceOf(
        ApiTimeoutError,
      )

      await vi.advanceTimersByTimeAsync(apiRequestTimeoutMs - 1)
      expect(signal.aborted).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await rejection
      expect(signal.aborted).toBe(true)
      expect(signal.reason.message).toContain('Сервер слишком долго отвечает')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('keeps the deadline active while reading an unfinished JSON body', async () => {
    vi.useFakeTimers()
    let signal!: AbortSignal
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: RequestInit) => {
        signal = options.signal!
        const body = new ReadableStream({
          start(stream) {
            stream.enqueue(new TextEncoder().encode('{"status":'))
            signal.addEventListener('abort', () => stream.error(signal.reason), { once: true })
          },
        })
        return Promise.resolve(
          new Response(body, { headers: { 'Content-Type': 'application/json' } }),
        )
      }),
    )
    const rejection = expect(getJson('stream')).rejects.toBeInstanceOf(ApiTimeoutError)

    await vi.advanceTimersByTimeAsync(apiRequestTimeoutMs)
    await rejection
    expect(signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([false, true])(
    'preserves caller cancellation and releases resources (already aborted: %s)',
    async (alreadyAborted) => {
      vi.useFakeTimers()
      const controller = new AbortController()
      const reason = new DOMException('Range changed', 'AbortError')
      const remove = vi.spyOn(controller.signal, 'removeEventListener')
      let signal!: AbortSignal
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, options: RequestInit) => {
          signal = options.signal!
          return waitForAbort(signal)
        }),
      )
      if (alreadyAborted) controller.abort(reason)
      const rejection = expect(getJson('calendar', controller.signal)).rejects.toBe(reason)
      if (!alreadyAborted) controller.abort(reason)

      await rejection
      expect(signal.aborted).toBe(true)
      expect(signal.reason).toBe(reason)
      expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('removes the deadline and caller listener after a successful response', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    let signal!: AbortSignal
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: RequestInit) => {
        signal = options.signal!
        return Promise.resolve(
          new Response('{}', { headers: { 'Content-Type': 'application/json' } }),
        )
      }),
    )

    await expect(getJson('calendar', controller.signal)).resolves.toEqual({})
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
    controller.abort()
    await vi.advanceTimersByTimeAsync(apiRequestTimeoutMs)
    expect(signal.aborted).toBe(false)
  })

  it('preserves the backend error code, message and cell/version details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'SCHEDULE_VERSION_CONFLICT',
              message: 'График изменён.',
              details: { expectedVersion: 1, currentVersion: 2 },
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
        ),
      ),
    )

    await expect(getJson('v1/schedules/example/calendar')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'SCHEDULE_VERSION_CONFLICT',
      message: 'График изменён.',
      details: { expectedVersion: 1, currentVersion: 2 },
    })
    expect(new ApiError(503).status).toBe(503)
  })

  it('keeps the HTTP status when an error response is HTML or malformed JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<h1>Proxy unavailable</h1>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('{bad', { status: 503, headers: { 'Content-Type': 'application/json' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getJson()).rejects.toMatchObject({ status: 502 })
    await expect(getJson()).rejects.toMatchObject({ status: 503 })
  })

  it.each([
    ['text/html', '<html>Unexpected app page</html>'],
    ['application/json', '{bad'],
  ])('rejects a malformed successful %s response', async (contentType, body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(body, { headers: { 'Content-Type': contentType } })),
    )
    await expect(getJson()).rejects.toMatchObject({ status: 200, code: 'INVALID_RESPONSE' })
  })

  it('leaves network and cancellation errors intact so a write is not blindly retried', async () => {
    const networkError = new TypeError('connection lost')
    const abortError = new DOMException('Cancelled', 'AbortError')
    const fetchMock = vi.fn().mockRejectedValueOnce(networkError).mockRejectedValueOnce(abortError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestJson('cells', { method: 'PATCH', body: {} })).rejects.toBe(networkError)
    await expect(getJson()).rejects.toBe(abortError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
