import { readContract, writeContract } from 'wagmi/actions'
import { ACTIVE_CONTRACTS } from '../config/contracts'
import { wagmiConfig } from './wagmi'
import { ABIS } from '../abis'

export type Address = `0x${string}`

const proposalConfig = ACTIVE_CONTRACTS.proposalContract

// --------
// Reads
// --------

export async function hasToken(user: Address) {
  return readContract(wagmiConfig, {
    address: proposalConfig.address,
    abi: proposalConfig.abi,
    functionName: 'hasToken',
    args: [user],
  })
}

export async function getProposal(user: Address) {
  return readContract(wagmiConfig, {
    address: proposalConfig.address,
    abi: proposalConfig.abi,
    functionName: 'getProposal',
    args: [user],
  })
}

// --------
// Writes
// --------

export async function submitProposal(proposal: string) {
  return writeContract(wagmiConfig, {
    address: proposalConfig.address,
    abi: proposalConfig.abi,
    functionName: 'submitProposal',
    args: [proposal],
  })
}

export async function updateTokenRequirement(tokenContract: Address, tokenId: bigint) {
  return writeContract(wagmiConfig, {
    address: proposalConfig.address,
    abi: proposalConfig.abi,
    functionName: 'updateTokenRequirement',
    args: [tokenContract, tokenId],
  })
}

export async function getTokenRequirement() {
  const [tokenContract, tokenId] = await Promise.all([
    readContract(wagmiConfig, {
      address: proposalConfig.address,
      abi: proposalConfig.abi,
      functionName: 'tokenContract',
      args: [],
    }),
    readContract(wagmiConfig, {
      address: proposalConfig.address,
      abi: proposalConfig.abi,
      functionName: 'tokenId',
      args: [],
    }),
  ])

  return {
    tokenContract: tokenContract as Address,
    tokenId: BigInt(tokenId as bigint),
  }
}

export async function mintDevToken(to: Address) {
  const { tokenContract, tokenId } = await getTokenRequirement()

  return writeContract(wagmiConfig, {
    address: tokenContract,
    abi: ABIS.ERC1155,
    functionName: 'mint',
    args: [to, tokenId, 1n, '0x'],
  })
}


