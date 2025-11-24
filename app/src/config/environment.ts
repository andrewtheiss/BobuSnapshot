export type AppEnvironment = 'testnet' | 'mainnet'

// Controls whether the app talks to sepolia ("testnet") or Ethereum mainnet ("mainnet").
// Set via Vite env: VITE_APP_ENV=testnet or VITE_APP_ENV=mainnet
export const APP_ENV: AppEnvironment =
  (import.meta.env.VITE_APP_ENV as AppEnvironment | undefined) ?? 'testnet'

export const IS_TESTNET = APP_ENV === 'testnet'
export const IS_MAINNET = APP_ENV === 'mainnet'

// When running on localhost, force testnet (sepolia) behavior regardless of APP_ENV.
export const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

export const ACTIVE_ENV: AppEnvironment = IS_LOCALHOST ? 'testnet' : APP_ENV

// Chain ids for active environment
import { mainnet, sepolia } from 'wagmi/chains'
export const ACTIVE_CHAIN_ID: number = ACTIVE_ENV === 'testnet' ? sepolia.id : mainnet.id


