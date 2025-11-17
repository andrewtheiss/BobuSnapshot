import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { isAddress } from 'viem'
import { ACTIVE_CONTRACTS } from '../config/contracts'

type ProposalContractAddressContextValue = {
  proposalContractAddress: `0x${string}` | ''
  setProposalContractAddress: (addr: `0x${string}` | '') => void
}

const ProposalContractAddressContext = createContext<ProposalContractAddressContextValue | undefined>(undefined)

// Default address is selected from the env-aware contracts config
const DEFAULT_ADDR = ACTIVE_CONTRACTS.proposalContract.address

export function ProposalContractAddressProvider({ children }: { children: ReactNode }) {
  const [proposalContractAddress, setProposalContractAddress] =
    useState<`0x${string}` | ''>(DEFAULT_ADDR)

  useEffect(() => {
    const saved = localStorage.getItem('proposalContractAddress')
    if (saved && isAddress(saved)) {
      setProposalContractAddress(saved as `0x${string}`)
    }
  }, [])

  useEffect(() => {
    if (proposalContractAddress && isAddress(proposalContractAddress)) {
      localStorage.setItem('proposalContractAddress', proposalContractAddress)
    }
  }, [proposalContractAddress])

  const value = useMemo<ProposalContractAddressContextValue>(() => ({ proposalContractAddress, setProposalContractAddress }), [proposalContractAddress])
  return <ProposalContractAddressContext.Provider value={value}>{children}</ProposalContractAddressContext.Provider>
}

export function useProposalContractAddress() {
  const ctx = useContext(ProposalContractAddressContext)
  if (!ctx) throw new Error('useProposalContractAddress must be used within ProposalContractAddressProvider')
  return ctx
}
