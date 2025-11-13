import ERC721 from './ERC721.json'
import ProposalContract from './ProposalContract.json'

export const ABIS = {
  ERC721,
  ProposalContract,
} as const

export type ERC721Abi = typeof ERC721
export type ProposalContractAbi = typeof ProposalContract


