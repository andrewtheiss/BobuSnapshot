import { ABIS } from '../abis'
import { ACTIVE_ENV } from './environment'

type Env = 'testnet' | 'mainnet'

type ProposalContractConfig = {
  address: `0x${string}`
  abi: typeof ABIS.ProposalContract
}

type GovernanceHubConfig = {
  address: `0x${string}`
  abi: typeof ABIS.GovernanceHub
}

type ContractsByEnv = Record<
  Env,
  {
    proposalContract: ProposalContractConfig
    governanceHub: GovernanceHubConfig
  }
>

// NOTE:
// - "testnet" is sepolia
// - "mainnet" is Ethereum mainnet
// Update these addresses after each deployment.
const CONTRACTS_BY_ENV: ContractsByEnv = {
  testnet: {
    proposalContract: {
      // TODO: replace with your actual sepolia ProposalContract deployment address
      address: '0x975553Df55A54c8c365100Abd7c58102cF874F32',
      abi: ABIS.ProposalContract,
    },
    governanceHub: {
      // TODO: replace with your actual sepolia GovernanceHub deployment address
      address: '0xB38895eFAB98086fD3dc09b34E4cA15862c9dD8b',
      abi: ABIS.GovernanceHub,
    },
  },
  mainnet: {
    proposalContract: {
      // TODO: replace with your actual mainnet ProposalContract deployment address
      address: '0x0000000000000000000000000000000000000000',
      abi: ABIS.ProposalContract,
    },
    governanceHub: {
      // TODO: replace with your actual mainnet GovernanceHub deployment address
      address: '0x0000000000000000000000000000000000000000',
      abi: ABIS.GovernanceHub,
    },
  },
}

export const ACTIVE_CONTRACTS = CONTRACTS_BY_ENV[ACTIVE_ENV]


