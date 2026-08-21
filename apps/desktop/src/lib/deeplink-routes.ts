import type { PluginInstallLegacyHint } from '@/store/plugin-install-request'

export interface DeepLinkPayload {
  kind: string
  name: string
  params: Record<string, string>
}

export type DeepLinkAction =
  | { type: 'plugin-install'; repo: string; enable: boolean; force: boolean; legacyHint: PluginInstallLegacyHint }
  | { type: 'composer-blueprint'; name: string; params: Record<string, string> }
  | { type: 'gateway-pair'; url: string; label: string; authMode: 'oauth' }
  | { type: 'ignore' }

function truthyParam(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined || value === '') {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()

  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

export function resolveDeepLinkAction(payload: DeepLinkPayload | null | undefined): DeepLinkAction {
  if (!payload?.kind) {
    return { type: 'ignore' }
  }

  if (payload.kind === 'blueprint' && payload.name) {
    return { type: 'composer-blueprint', name: payload.name, params: payload.params || {} }
  }

  if (payload.kind === 'gateway' && payload.name === 'add') {
    const rawUrl = (payload.params?.url || '').trim().replace(/\/+$/, '')
    const label = (payload.params?.label || '').trim().replace(/\s+/g, ' ')

    try {
      const parsed = new URL(rawUrl)
      const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname.toLowerCase())

      if (
        !label ||
        label.length > 80 ||
        payload.params?.auth !== 'oauth' ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback))
      ) {
        return { type: 'ignore' }
      }

      return { type: 'gateway-pair', url: rawUrl, label, authMode: 'oauth' }
    } catch {
      return { type: 'ignore' }
    }
  }

  const repo = (payload.params?.repo || payload.params?.identifier || payload.name || '').trim()

  if (payload.kind === 'plugin' && payload.name === 'install' && repo) {
    return {
      type: 'plugin-install',
      repo,
      enable: truthyParam(payload.params?.enable, true),
      force: truthyParam(payload.params?.force, false),
      legacyHint: null
    }
  }

  if (payload.kind === 'plugin-agent' && repo) {
    return {
      type: 'plugin-install',
      repo,
      enable: truthyParam(payload.params?.enable, true),
      force: truthyParam(payload.params?.force, false),
      legacyHint: 'agent'
    }
  }

  if (payload.kind === 'plugin-desktop' && repo) {
    return {
      type: 'plugin-install',
      repo,
      enable: truthyParam(payload.params?.enable, true),
      force: truthyParam(payload.params?.force, false),
      legacyHint: 'desktop'
    }
  }

  return { type: 'ignore' }
}
