import { describe, expect, it } from 'vitest'

import { resolveCliAuthRoute } from './auth-route'

const routes = [
  { connectionId: 'local', mode: 'local' as const, profile: 'default', targetProfile: 'default' },
  { connectionId: 'station-vps', mode: 'remote' as const, profile: 'work', targetProfile: 'backend-work' }
]

describe('resolveCliAuthRoute', () => {
  it('pins by connection and visible route profile while preserving the backend target profile', () => {
    expect(resolveCliAuthRoute(routes, 'station-vps', 'work')).toEqual(routes[1])
  })

  it('fails closed when the route is ambiguous or missing', () => {
    expect(resolveCliAuthRoute(routes, 'station-vps', 'default')).toBeNull()
    expect(resolveCliAuthRoute([...routes, { ...routes[1] }], 'station-vps', 'work')).toBeNull()
  })
})
