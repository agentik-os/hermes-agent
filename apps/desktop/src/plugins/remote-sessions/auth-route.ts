import type { PluginProfileRoute } from '@hermes/plugin-sdk'

export function resolveCliAuthRoute(
  routes: readonly PluginProfileRoute[],
  connectionId: null | string,
  profile: null | string
): null | PluginProfileRoute {
  const expectedConnection = connectionId || 'local'
  const expectedProfile = profile || 'default'

  const matches = routes.filter(route => route.connectionId === expectedConnection && route.profile === expectedProfile)

  return matches.length === 1 ? matches[0] : null
}
