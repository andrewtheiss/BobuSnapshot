import ERC721 from './ERC721.json'
import ERC1155 from './ERC1155.json'
import ProposalContract from './ProposalContract.json'

export const ABIS = {
  ERC1155,
  ERC721,
  ProposalContract,
} as const

export type ERC1155Abi = typeof ERC1155
export type ERC721Abi = typeof ERC721
export type ProposalContractAbi = typeof ProposalContract


