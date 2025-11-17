export type AppEnvironment = 'testnet' | 'mainnet'

// Controls whether the app talks to sepolia ("testnet") or Ethereum mainnet ("mainnet").
// Set via Vite env: VITE_APP_ENV=testnet or VITE_APP_ENV=mainnet
export const APP_ENV: AppEnvironment =
  (import.meta.env.VITE_APP_ENV as AppEnvironment | undefined) ?? 'testnet'

export const IS_TESTNET = APP_ENV === 'testnet'
export const IS_MAINNET = APP_ENV === 'mainnet'


