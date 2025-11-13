import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './web3/wagmi'
import { ProposalContractAddressProvider } from './web3/proposalContractAddress'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ProposalContractAddressProvider>
          <App />
        </ProposalContractAddressProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
