import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'
import { APP_ENV } from '../config/environment'

// Choose a single active chain based on environment:
// - testnet -> sepolia
// - mainnet -> Ethereum mainnet
const activeChain = APP_ENV === 'testnet' ? sepolia : mainnet

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [metaMask()],
  transports: {
    [activeChain.id]: http(),
  },
  ssr: false,
})

