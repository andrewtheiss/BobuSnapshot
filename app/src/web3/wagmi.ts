import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'
import { ACTIVE_ENV } from '../config/environment'

export const wagmiConfig = createConfig({
  // Prefer Sepolia first on testnet/localhost for default behavior
  chains: ACTIVE_ENV === 'testnet' ? [sepolia, mainnet] : [mainnet, sepolia],
  connectors: [metaMask()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
})

