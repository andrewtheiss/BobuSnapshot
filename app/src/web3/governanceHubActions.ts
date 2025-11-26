import { readContract, writeContract } from 'wagmi/actions'
import { ACTIVE_CONTRACTS } from '../config/contracts'
import { wagmiConfig } from './wagmi'
import { ABIS } from '../abis'
import { ACTIVE_CHAIN_ID } from '../config/environment'

export type Address = `0x${string}`

export enum HubProposalState {
  DRAFT = 0,
  OPEN = 1,
  ACTIVE = 2,
  CLOSED = 3,
}

const hubConfig = ACTIVE_CONTRACTS.governanceHub

function isZeroAddress(addr: string): boolean {
  return /^0x0{40}$/i.test(addr)
}

function ensureHubConfigured() {
  if (!hubConfig?.address || isZeroAddress(hubConfig.address)) {
    throw new Error(
      'GovernanceHub address is not configured. Set app/src/config/contracts.ts → CONTRACTS_BY_ENV[env].governanceHub.address'
    )
  }
}

export async function getProposalCountByState(state: HubProposalState): Promise<number> {
  ensureHubConfigured()
  const result = await readContract(wagmiConfig, {
    address: hubConfig.address,
    abi: hubConfig.abi,
    functionName: 'getProposalCountByState',
    args: [BigInt(state)],
    chainId: ACTIVE_CHAIN_ID,
  })
  return Number(result as bigint)
}

export async function getProposalsByState(opts: {
  state: HubProposalState
  offset: number
  count: number
  reverse?: boolean
}): Promise<Address[]> {
  ensureHubConfigured()
  const { state, offset, count, reverse = true } = opts
  const result = (await readContract(wagmiConfig, {
    address: hubConfig.address,
    abi: hubConfig.abi,
    functionName: 'getProposals',
    args: [BigInt(state), BigInt(offset), BigInt(count), reverse],
    chainId: ACTIVE_CHAIN_ID,
  })) as readonly Address[]
  return Array.from(result)
}

export type ProposalDetails = {
  address: Address
  title: string
  author: Address
  createdAt: number
  voteStart: number
  voteEnd: number
  votesFor: bigint
  votesAgainst: bigint
}

export async function readProposalDetails(addr: Address): Promise<ProposalDetails> {
  const [title, author, createdAt, voteStart, voteEnd, votesFor, votesAgainst] = await Promise.all([
    readContract(wagmiConfig, {
      address: addr,
      abi: ABIS.ProposalTemplate,
      functionName: 'title',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: addr,
      abi: ABIS.ProposalTemplate,
      functionName: 'author',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: addr,
      abi: ABIS.ProposalTemplate,
      functionName: 'createdAt',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: addr,
      abi: ABIS.ProposalTemplate,
      functionName: 'voteStart',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: addr,
      abi: ABIS.ProposalTemplate,
      functionName: 'voteEnd',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: addr,
      abi: ABIS.ProposalTemplate,
      functionName: 'votesFor',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: addr,
      abi: ABIS.ProposalTemplate,
      functionName: 'votesAgainst',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
  ])

  return {
    address: addr,
    title: String(title),
    author: author as Address,
    createdAt: Number(createdAt as bigint),
    voteStart: Number(voteStart as bigint),
    voteEnd: Number(voteEnd as bigint),
    votesFor: BigInt(votesFor as bigint),
    votesAgainst: BigInt(votesAgainst as bigint),
  }
}

export async function readProposalBody(addr: Address): Promise<string> {
  const body = await readContract(wagmiConfig, {
    address: addr,
    abi: ABIS.ProposalTemplate,
    functionName: 'body',
    args: [],
    chainId: ACTIVE_CHAIN_ID,
  })
  return String(body)
}

export async function setVotingWindow(opts: {
  proposal: Address
  voteStart: number
  voteEnd: number
}) {
  ensureHubConfigured()
  const { proposal, voteStart, voteEnd } = opts
  return writeContract(wagmiConfig, {
    address: ACTIVE_CONTRACTS.governanceHub.address,
    abi: ABIS.GovernanceHub,
    functionName: 'setVotingWindow',
    args: [proposal, BigInt(voteStart), BigInt(voteEnd)],
    chainId: ACTIVE_CHAIN_ID,
  })
}

export async function syncProposalState(proposal: Address) {
  ensureHubConfigured()
  return writeContract(wagmiConfig, {
    address: ACTIVE_CONTRACTS.governanceHub.address,
    abi: ABIS.GovernanceHub,
    functionName: 'syncProposalState',
    args: [proposal],
    chainId: ACTIVE_CHAIN_ID,
  })
}

export async function setActiveByCreatorOrAdmin(proposal: Address, active: boolean) {
  ensureHubConfigured()
  return writeContract(wagmiConfig, {
    address: ACTIVE_CONTRACTS.governanceHub.address,
    abi: ABIS.GovernanceHub,
    functionName: 'setActiveByCreatorOrAdmin',
    args: [proposal, active],
    chainId: ACTIVE_CHAIN_ID,
  })
}

export async function createProposalOnHub(title: string, body: string, voteStart: number, voteEnd: number) {
  ensureHubConfigured()
  return writeContract(wagmiConfig, {
    address: ACTIVE_CONTRACTS.governanceHub.address,
    abi: ABIS.GovernanceHub,
    functionName: 'createProposal',
    args: [title, body, BigInt(voteStart), BigInt(voteEnd)],
    chainId: ACTIVE_CHAIN_ID,
  })
}

// --------------------------
// Comments
// --------------------------
export async function hubHasToken(user: Address) {
  ensureHubConfigured()
  return readContract(wagmiConfig, {
    address: ACTIVE_CONTRACTS.governanceHub.address,
    abi: ABIS.GovernanceHub,
    functionName: 'hasToken',
    args: [user],
    chainId: ACTIVE_CHAIN_ID,
  })
}

export async function isCommentsGated(): Promise<boolean> {
  ensureHubConfigured()
  const result = await readContract(wagmiConfig, {
    address: ACTIVE_CONTRACTS.governanceHub.address,
    abi: ABIS.GovernanceHub,
    functionName: 'gateComments',
    args: [],
    chainId: ACTIVE_CHAIN_ID,
  })
  return Boolean(result)
}

export type CommentAddressPage = {
  items: Address[]
  from: number
  count: number
  hasMore: boolean
}

export async function listCommentAddresses(opts: {
  proposal: Address
  offset?: number
  count?: number
  reverse?: boolean
}): Promise<CommentAddressPage> {
  const proposal = opts.proposal
  const offset = Math.max(0, opts.offset ?? 0)
  const count = Math.max(1, Math.min(100, opts.count ?? 20)) // PAGE_LIMIT is 100 on chain
  const reverse = opts.reverse ?? true
  const result = (await readContract(wagmiConfig, {
    address: proposal,
    abi: ABIS.ProposalTemplate,
    functionName: 'getComments',
    args: [BigInt(offset), BigInt(count), reverse],
    chainId: ACTIVE_CHAIN_ID,
  })) as readonly Address[]
  return {
    items: Array.from(result),
    from: offset,
    count: result.length,
    hasMore: result.length === count,
  }
}

export type CommentDetail = {
  address: Address
  author: Address
  content: string
  createdAt: number
  deleted: boolean
  sentiment: number
}

export async function readCommentDetail(comment: Address): Promise<CommentDetail> {
  const [author, content, createdAt, deleted, sentiment] = await Promise.all([
    readContract(wagmiConfig, {
      address: comment,
      abi: ABIS.CommentTemplate,
      functionName: 'author',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: comment,
      abi: ABIS.CommentTemplate,
      functionName: 'content',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: comment,
      abi: ABIS.CommentTemplate,
      functionName: 'createdAt',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: comment,
      abi: ABIS.CommentTemplate,
      functionName: 'deleted',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: comment,
      abi: ABIS.CommentTemplate,
      functionName: 'sentiment',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
  ])
  return {
    address: comment,
    author: author as Address,
    content: String(content),
    createdAt: Number(createdAt as bigint),
    deleted: Boolean(deleted),
    sentiment: Number(sentiment as bigint),
  }
}

export async function addComment(opts: { proposal: Address; content: string; sentiment?: number }) {
  ensureHubConfigured()
  const { proposal, content, sentiment = 3 } = opts
  return writeContract(wagmiConfig, {
    address: ACTIVE_CONTRACTS.governanceHub.address,
    abi: ABIS.GovernanceHub,
    functionName: 'addComment',
    args: [proposal, content, BigInt(sentiment)],
    chainId: ACTIVE_CHAIN_ID,
  })
}


