// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import handler, { isAuthorized } from '../../api/cron/tick.js'

const SECRET = 'test-cron-secret'

function mockRes() {
  const res = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

describe('isAuthorized', () => {
  it('rejects every request when no secret is configured', () => {
    expect(isAuthorized('Bearer ', undefined)).toBe(false)
    expect(isAuthorized('Bearer ', '')).toBe(false)
    expect(isAuthorized(undefined, undefined)).toBe(false)
  })

  it('accepts only the exact bearer token', () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true)
    expect(isAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false)
    expect(isAuthorized(`Bearer ${SECRET.slice(1)}`, SECRET)).toBe(false)
    expect(isAuthorized(SECRET, SECRET)).toBe(false)
    expect(isAuthorized(undefined, SECRET)).toBe(false)
  })
})

describe('cron tick handler auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = mockRes()
    await handler({ headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 for a missing or wrong token', async () => {
    vi.stubEnv('CRON_SECRET', SECRET)

    const missing = mockRes()
    await handler({ headers: {} }, missing)
    expect(missing.status).toHaveBeenCalledWith(401)

    const wrong = mockRes()
    await handler({ headers: { authorization: 'Bearer nope' } }, wrong)
    expect(wrong.status).toHaveBeenCalledWith(401)
  })

  it('lets a correctly authorized request through', async () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    // No Supabase env, so the handler takes its simulated-mode path.
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_URL', '')
    const res = mockRes()
    await handler({ headers: { authorization: `Bearer ${SECRET}` } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
