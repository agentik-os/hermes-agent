import { atom } from 'nanostores'

export interface GatewayPairRequest {
  authMode: 'oauth'
  label: string
  url: string
}

export const $gatewayPairRequest = atom<GatewayPairRequest | null>(null)

export function requestGatewayPair(request: GatewayPairRequest): void {
  $gatewayPairRequest.set(request)
}

export function clearGatewayPairRequest(): void {
  $gatewayPairRequest.set(null)
}
