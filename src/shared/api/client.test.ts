import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getJson, requestJson } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('jSON API client', () => {
  it('sends JSON and the caller AbortSignal without retrying a write', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: 2 }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal

    await expect(
      requestJson('/schedules/example/cells', {
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
      signal,
    })
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

    await expect(getJson('schedules/example/calendar')).rejects.toMatchObject({
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
