import { createConfig, http } from 'wagmi'
import { arbitrum, sepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [sepolia, arbitrum],
  connectors: [metaMask()],
  transports: {
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: false,
})


