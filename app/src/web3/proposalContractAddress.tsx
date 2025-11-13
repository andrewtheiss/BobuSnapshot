import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { isAddress } from 'viem'

type ProposalContractAddressContextValue = {
  proposalContractAddress: `0x${string}` | ''
  setProposalContractAddress: (addr: `0x${string}` | '') => void
}

const ProposalContractAddressContext = createContext<ProposalContractAddressContextValue | undefined>(undefined)

const DEFAULT_ADDR = '0x1234567890123456789012345678901234567890' as `0x${string}` // Placeholder - needs actual address

export function ProposalContractAddressProvider({ children }: { children: ReactNode }) {
  const [proposalContractAddress, setProposalContractAddress] = useState<`0x${string}` | ''>('')

  useEffect(() => {
    const saved = localStorage.getItem('proposalContractAddress')
    if (saved && isAddress(saved)) {
      setProposalContractAddress(saved as `0x${string}`)
    } else {
      setProposalContractAddress(DEFAULT_ADDR)
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
