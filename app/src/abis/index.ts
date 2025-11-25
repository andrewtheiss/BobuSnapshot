import ERC721 from './ERC721.json'
import ERC1155 from './ERC1155.json'
import ProposalContract from './ProposalContract.json'
import GovernanceHub from './GovernanceHub.json'
import ProposalTemplate from './ProposalTemplate.json'

export const ABIS = {
  ERC1155,
  ERC721,
  ProposalContract,
  GovernanceHub,
  ProposalTemplate,
} as const

export type ERC1155Abi = typeof ERC1155
export type ERC721Abi = typeof ERC721
export type ProposalContractAbi = typeof ProposalContract
export type GovernanceHubAbi = typeof GovernanceHub
export type ProposalTemplateAbi = typeof ProposalTemplate


