import { getPublicClient, readContract, writeContract } from 'wagmi/actions'
import { ACTIVE_CONTRACTS } from '../config/contracts'
import { wagmiConfig } from './wagmi'
import { ABIS } from '../abis'
import { ACTIVE_CHAIN_ID } from '../config/environment'
import { parseAbiItem } from 'viem'

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
    chainId: ACTIVE_CHAIN_ID,
  })
}

export async function getProposal(user: Address) {
  return readContract(wagmiConfig, {
    address: proposalConfig.address,
    abi: proposalConfig.abi,
    functionName: 'getProposal',
    args: [user],
    chainId: ACTIVE_CHAIN_ID,
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
    chainId: ACTIVE_CHAIN_ID,
  })
}

export async function updateTokenRequirement(tokenContract: Address, tokenId: bigint) {
  return writeContract(wagmiConfig, {
    address: proposalConfig.address,
    abi: proposalConfig.abi,
    functionName: 'updateTokenRequirement',
    args: [tokenContract, tokenId],
    chainId: ACTIVE_CHAIN_ID,
  })
}

export async function getTokenRequirement() {
  const [tokenContract, tokenId] = await Promise.all([
    readContract(wagmiConfig, {
      address: proposalConfig.address,
      abi: proposalConfig.abi,
      functionName: 'tokenContract',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
    }),
    readContract(wagmiConfig, {
      address: proposalConfig.address,
      abi: proposalConfig.abi,
      functionName: 'tokenId',
      args: [],
      chainId: ACTIVE_CHAIN_ID,
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
    chainId: ACTIVE_CHAIN_ID,
  })
}

// --------
// Listing proposals via logs (no on-chain index)
// --------
export type ChainProposal = {
  id: string
  author: Address
  proposal: string
  blockNumber: bigint
  timestamp: number
}

export type ProposalPage = {
  items: ChainProposal[]
  fromBlock: bigint
  toBlock: bigint
  prevCursor: bigint | null
}

export async function listProposals(opts?: {
  fromBlock?: bigint
  toBlock?: bigint
  lookbackBlocks?: number
  maxChunks?: number
}): Promise<ChainProposal[]> {
  const publicClient = getPublicClient(wagmiConfig, { chainId: ACTIVE_CHAIN_ID })
  const latest = opts?.toBlock ?? (await publicClient.getBlockNumber())
  const lookbackBlocks = opts?.lookbackBlocks ?? 50_000 // default: last 50k blocks
  const startBlock = opts?.fromBlock ?? (latest > BigInt(lookbackBlocks) ? latest - BigInt(lookbackBlocks) : 0n)
  const maxChunks = opts?.maxChunks ?? 200

  const event = parseAbiItem('event ProposalSubmitted(address indexed user, string proposal)')

  const logsAll: Array<ReturnType<typeof Object>> = []

  // Provider limits: "Maximum allowed number of requested blocks is 1000"
  // Chunk by block range; adaptively shrink chunk size if provider complains
  let chunkSize = 1000n
  let from = startBlock
  let chunksTried = 0

  while (from <= latest && chunksTried < maxChunks) {
    const to = from + chunkSize - 1n > latest ? latest : from + chunkSize - 1n
    try {
      // eslint-disable-next-line no-await-in-loop
      const logs = await publicClient.getLogs({
        address: proposalConfig.address,
        event,
        fromBlock: from,
        toBlock: to,
      })
      logsAll.push(...logs)
      // advance window
      from = to + 1n
      chunksTried += 1
      // cautiously grow chunk size a bit if small
      if (chunkSize < 1000n) {
        chunkSize = chunkSize * 2n
        if (chunkSize > 1000n) chunkSize = 1000n
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // If response too big or exceeds limits, reduce chunk size and retry smaller window
      if (
        msg.includes('Maximum allowed number of requested blocks is') ||
        msg.includes('Log response size exceeded') ||
        msg.includes('exceeds defined limit')
      ) {
        // shrink window
        chunkSize = chunkSize > 1n ? chunkSize / 2n : 1n
        // If chunk size is at minimum and still failing, break to avoid infinite loop
        if (chunkSize === 1n) break
        continue
      }
      // Unknown error: rethrow
      throw err
    }
  }

  // Fetch block timestamps
  const uniqueBlocks = Array.from(
    new Set(logsAll.map((l: any) => l.blockNumber as bigint).filter((b): b is bigint => !!b))
  )
  const blockMap = new Map<bigint, number>()
  const blocks = await Promise.all(
    uniqueBlocks.map((bn) => publicClient.getBlock({ blockNumber: bn }).then((b) => ({ bn, ts: Number(b.timestamp) })))
  )
  for (const { bn, ts } of blocks) {
    blockMap.set(bn, ts)
  }

  return logsAll
    .map((log: any) => {
      const author = (log.args?.user ?? log.topics?.[1]) as Address
      const text = (log.args?.proposal ?? '') as string
      const id = log.transactionHash ?? `${proposalConfig.address}-${log.blockNumber}-${log.logIndex}`
      const blockNumber = log.blockNumber ?? 0n
      const timestamp = blockMap.get(blockNumber) ?? Math.floor(Date.now() / 1000)
      return { id, author, proposal: text, blockNumber, timestamp }
    })
    .sort((a, b) => Number(b.blockNumber - a.blockNumber)) // newest first
}

export async function listProposalsPage(opts?: {
  endBlock?: bigint
  pageSizeBlocks?: number
}): Promise<ProposalPage> {
  const publicClient = getPublicClient(wagmiConfig, { chainId: ACTIVE_CHAIN_ID })
  const latest = opts?.endBlock ?? (await publicClient.getBlockNumber())
  const size = Math.max(1, Math.floor((opts?.pageSizeBlocks ?? 10))) // default 10 blocks
  const toBlock = latest
  const fromBlock = toBlock > BigInt(size - 1) ? toBlock - BigInt(size - 1) : 0n

  const event = parseAbiItem('event ProposalSubmitted(address indexed user, string proposal)')
  const logs = await publicClient.getLogs({
    address: proposalConfig.address,
    event,
    fromBlock,
    toBlock,
  })

  const uniqueBlocks = Array.from(new Set(logs.map((l) => l.blockNumber!).filter((b): b is bigint => !!b)))
  const blockMap = new Map<bigint, number>()
  const blocks = await Promise.all(
    uniqueBlocks.map((bn) => publicClient.getBlock({ blockNumber: bn }).then((b) => ({ bn, ts: Number(b.timestamp) })))
  )
  for (const { bn, ts } of blocks) {
    blockMap.set(bn, ts)
  }

  const items: ChainProposal[] = logs
    .map((log) => {
      const author = (log.args?.user ?? log.topics?.[1]) as Address
      const text = (log.args?.proposal ?? '') as string
      const id = log.transactionHash ?? `${proposalConfig.address}-${log.blockNumber}-${log.logIndex}`
      const blockNumber = log.blockNumber ?? 0n
      const timestamp = blockMap.get(blockNumber) ?? Math.floor(Date.now() / 1000)
      return { id, author, proposal: text, blockNumber, timestamp }
    })
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))

  const prevCursor = fromBlock > 0n ? fromBlock - 1n : null
  return { items, fromBlock, toBlock, prevCursor }
}


