import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import './Governance.css'
import bobuAvatar from '../assets/bobuthefarmer.webp'
import { APP_ENV, IS_MAINNET, IS_TESTNET } from '../config/environment'
import { hasToken, mintDevToken, submitProposal, type Address } from '../web3/proposalContractActions'
import {
  getProposalCountByState,
  getProposalsByState,
  readProposalDetails,
  readProposalBody,
  HubProposalState,
} from '../web3/governanceHubActions'
import { parseProposalMarkdown } from '../utils/proposalMarkdown'

type NavItem = {
  id: string
  label: string
  href: string
  icon: JSX.Element
  isActive?: boolean
}

type Proposal = {
  id: string
  title: string
  author: string
  votes: number
  quorum: number
  timeAgo: string
  hasVoted: boolean
  status: 'draft' | 'open' | 'active' | 'closed'
  snippet?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'governance',
    label: 'Governance',
    href: '#/s:bobu.eth',
    isActive: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"
        />
      </svg>
    )
  },
  {
    id: 'proposals',
    label: 'Proposals',
    href: '#/s:bobu.eth/proposals',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7z"
        />
    </svg>
    )
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    href: '#/s:bobu.eth/leaderboard',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 0 0-3.693-2.87M17 20H7M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 3.693-2.87M15 7a3 3 0 1 1-6 0a3 3 0 0 1 6 0m6 3a2 2 0 1 1-4 0a2 2 0 0 1 4 0M7 10a2 2 0 1 1-4 0a2 2 0 0 1 4 0"
        />
    </svg>
  )
  }
]

function formatTimeAgo(tsSeconds: number): string {
  const now = Date.now() / 1000
  const diff = Math.max(0, now - tsSeconds)
  const minutes = Math.floor(diff / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  if (years >= 1) return `${years}y ago`
  if (months >= 1) return `${months}mo ago`
  if (days >= 1) return `${days}d ago`
  if (hours >= 1) return `${hours}h ago`
  if (minutes >= 1) return `${minutes}m ago`
  return 'just now'
}

function SnapshotSidebar() {
  return (
    <aside className="snapshot-sidebar" aria-label="Navigation">
      <div className="snapshot-sidebar-inner">
        <nav className="snapshot-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`snapshot-sidebar-link${item.isActive ? ' is-active' : ''}`}
            >
              <span className="snapshot-sidebar-icon">{item.icon}</span>
              <span className="snapshot-sidebar-label">{item.label}</span>
            </a>
          ))}
        </nav>
          </div>
    </aside>
  )
}

function SnapshotHeader({
  canCreate,
  onCreate,
}: {
  canCreate: boolean
  onCreate: () => void
}) {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect, isPending: isDisconnecting } = useDisconnect()
  const preferred = connectors.find((c) => c.id === 'metaMask') ?? connectors[0]

  return (
    <header className="snapshot-header">
      <div className="snapshot-header-space">
        <img src={bobuAvatar} alt="Bobu avatar" className="snapshot-header-avatar" />
        <span className="snapshot-header-name">Bobu</span>
        </div>

      <form className="snapshot-header-search" role="search">
        <label className="snapshot-header-search-label">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="m21 21l-6-6m2-5a7 7 0 1 1-14 0a7 7 0 0 1 14 0"
            />
          </svg>
          <input
            type="search"
            placeholder="Search for a proposal"
            className="snapshot-header-search-input"
          />
        </label>
      </form>

      <div className="snapshot-header-actions">
        <button
          type="button"
          className="snapshot-header-button"
          disabled={!canCreate}
          title={canCreate ? 'Create a new proposal' : 'You need the Bobu token to create proposals'}
          onClick={() => {
            if (canCreate) onCreate()
          }}
        >
          <span style={{ marginRight: 6 }}>＋</span> New proposal
        </button>
        <button
          type="button"
          className="snapshot-header-button"
          disabled={isConnecting || isDisconnecting}
          onClick={() => {
            if (isConnected) {
              disconnect()
            } else {
              connect({ connector: preferred })
            }
          }}
        >
          {isConnected ? (
            <>
              <span className="snapshot-header-wallet-dot" />
              <span className="snapshot-header-wallet-address">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
              </span>
            </>
          ) : (
            <span>{isConnecting ? 'Connecting…' : 'Log in'}</span>
          )}
        </button>
        <button type="button" className="snapshot-header-button snapshot-header-button-icon" aria-label="Toggle theme">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M20.354 15.354A9 9 0 0 1 8.646 3.646A9.003 9.003 0 0 0 12 21a9 9 0 0 0 8.354-5.646"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}

function SpaceHero() {
  return (
    <section className="space-hero">
      <div className="space-hero-gradient" />
    </section>
  )
}

function SpaceSummary() {
  return (
    <section className="space-summary">
      <img src={bobuAvatar} alt="Bobu avatar" className="space-summary-avatar" />
      <div className="space-summary-body">
        <div className="space-summary-title">
          <h1>Bobu Proposal Forum</h1>
          <span className="space-summary-verified" aria-label="Verified space">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M6.267 3.455a3.07 3.07 0 0 0 1.745-.723a3.066 3.066 0 0 1 3.976 0a3.07 3.07 0 0 0 1.745.723a3.066 3.066 0 0 1 2.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 0 1 0 3.976a3.07 3.07 0 0 0-.723 1.745a3.066 3.066 0 0 1-2.812 2.812a3.07 3.07 0 0 0-1.745.723a3.066 3.066 0 0 1-3.976 0a3.07 3.07 0 0 0-1.745-.723a3.066 3.066 0 0 1-2.812-2.812a3.07 3.07 0 0 0-.723-1.745a3.066 3.066 0 0 1 0-3.976a3.07 3.07 0 0 0 .723-1.745a3.066 3.066 0 0 1 2.812-2.812m7.44 5.252a1 1 0 0 0-1.414-1.414L9 10.586L7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
        <div className="space-summary-stats">
          <span><strong>24</strong> proposals</span>
          <span className="space-summary-dot">·</span>
          <span><strong>5.9k</strong> votes</span>
          <span className="space-summary-dot">·</span>
          <span><strong>427</strong> followers</span>
        </div>
        <p className="space-summary-description">
          Current home of the Bobu governance community.
        </p>
      </div>
    </section>
  )
}

function DevFooter() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [hasAccessToken, setHasAccessToken] = useState<boolean | null>(null)

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  useEffect(() => {
    if (!isLocalhost || !isConnected || !address) {
      setHasAccessToken(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setChecking(true)
        const result = await hasToken(address as Address)
        if (!cancelled) {
          setHasAccessToken(Boolean(result))
        }
      } catch {
        if (!cancelled) {
          setHasAccessToken(null)
        }
      } finally {
        if (!cancelled) {
          setChecking(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, isConnected, isLocalhost])

  if (!isLocalhost) {
    return null
  }

  const handleMint = async () => {
    if (!address) {
      setStatus('Connect a wallet first.')
      return
    }
    if (!IS_TESTNET) {
      setStatus('Minting is only enabled on testnet.')
      return
    }

    try {
      setStatus('Sending mint transaction…')
      await mintDevToken(address as Address)
      setStatus('Mint transaction submitted. Once it confirms, refresh to re-check access.')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus(`Mint failed: ${message.slice(0, 140)}`)
    }
  }

  const envLabel = IS_MAINNET ? 'mainnet' : IS_TESTNET ? 'testnet (sepolia)' : APP_ENV

  return (
    <footer className="dev-footer" aria-label="Developer tools">
      <div className="dev-footer-inner">
        <div className="dev-footer-group">
          <span className="dev-footer-pill">Dev tools (localhost only)</span>
          <span className="dev-footer-label">
            Env: <strong>{envLabel}</strong>
          </span>
          {isConnected && (
            <span className="dev-footer-label">
              Token gate:{' '}
              {checking
                ? 'checking…'
                : hasAccessToken === null
                  ? 'unknown'
                  : hasAccessToken
                    ? 'you have the token'
                    : 'you do not have the token'}
            </span>
          )}
        </div>
        {IS_TESTNET && (
          <div className="dev-footer-actions">
            <button type="button" className="dev-footer-button" onClick={handleMint}>
              Mint test access token
            </button>
            {status && <span className="dev-footer-status">{status}</span>}
          </div>
        )}
      </div>
    </footer>
  )
}

function ProposalRow({
  id,
  title,
  author,
  votes,
  quorum,
  timeAgo,
  hasVoted,
  status,
  snippet,
  onScheduleClick,
}: Proposal & { onScheduleClick?: (id: string) => void }) {
  const shortAuthor = `${author.slice(0, 6)}...${author.slice(-4)}`

  return (
    <article className="proposal-row">
      <span className={`proposal-row-status proposal-row-status-${status}`} aria-hidden="true" />
      <div className="proposal-row-body">
        <a href={`#/proposal/${id}`} className="proposal-row-title">
          {title}
        </a>
        {snippet && <p className="proposal-row-snippet">{snippet}</p>}
        <div className="proposal-row-meta">
          <span>#{id.slice(0, 5)}</span>
          <span className="proposal-row-dot">·</span>
          <span>
            by{' '}
            <a href={`#/profile/${author}`} className="proposal-row-author">
              {shortAuthor} <span className="proposal-row-badge">admin</span>
            </a>
          </span>
          <span className="proposal-row-dot">·</span>
          <span>{votes} votes</span>
          <span className="proposal-row-dot">·</span>
          <span>{quorum}% quorum</span>
          <span className="proposal-row-dot">·</span>
          <span>{timeAgo}</span>
          {hasVoted && (
            <>
              <span className="proposal-row-dot">·</span>
              <span className="proposal-row-voted">You voted</span>
            </>
          )}
          {onScheduleClick && (
            <>
              <span className="proposal-row-dot">·</span>
              <button
                type="button"
                className="snapshot-header-button"
                onClick={() => onScheduleClick(id)}
                title="Set or update voting window"
              >
                Schedule
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export default function GovernancePage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loadingProposals, setLoadingProposals] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const PAGE_SIZE = 10
  const [countsByState, setCountsByState] = useState<Record<number, number>>({
    [HubProposalState.DRAFT]: 0,
    [HubProposalState.OPEN]: 0,
    [HubProposalState.ACTIVE]: 0,
    [HubProposalState.CLOSED]: 0,
  })
  const [selectedStates, setSelectedStates] = useState<Set<number>>(
    () => new Set<number>([HubProposalState.ACTIVE, HubProposalState.DRAFT])
  )
  const [showCreate, setShowCreate] = useState<boolean>(false)
  const [newProposal, setNewProposal] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { address, isConnected } = useAccount()
  const [hasAccessToken, setHasAccessToken] = useState<boolean>(false)
  const [checkingAccess, setCheckingAccess] = useState<boolean>(false)
  const [scheduleForId, setScheduleForId] = useState<string | null>(null)
  const [scheduleStart, setScheduleStart] = useState<string>('') // datetime-local value
  const [scheduleEnd, setScheduleEnd] = useState<string>('') // datetime-local value
  const [scheduleSubmitting, setScheduleSubmitting] = useState<boolean>(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('governance-light')
    return () => {
      document.body.classList.remove('governance-light')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!isConnected || !address) {
          setHasAccessToken(false)
          return
        }
        setCheckingAccess(true)
        const result = await hasToken(address as Address)
        if (!cancelled) {
          setHasAccessToken(Boolean(result))
        }
      } finally {
        if (!cancelled) setCheckingAccess(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address, isConnected])

  // Map GovernanceHub state to UI status
  const stateToStatus = (st: HubProposalState): Proposal['status'] => {
    if (st === HubProposalState.ACTIVE) return 'active'
    if (st === HubProposalState.OPEN) return 'open'
    if (st === HubProposalState.DRAFT) return 'draft'
    return 'closed'
  }

  const STATE_ORDER: HubProposalState[] = [
    HubProposalState.ACTIVE,
    HubProposalState.OPEN,
    HubProposalState.DRAFT,
    HubProposalState.CLOSED,
  ]

  const selectedStatesOrdered = STATE_ORDER.filter((s) => selectedStates.has(s))

  const totalSelectedCount = selectedStatesOrdered.reduce(
    (acc, s) => acc + (countsByState[s] ?? 0),
    0
  )
  const totalPages = Math.max(1, Math.ceil(totalSelectedCount / PAGE_SIZE))

  const refreshCounts = async () => {
    const [draft, open, active, closed] = await Promise.all([
      getProposalCountByState(HubProposalState.DRAFT),
      getProposalCountByState(HubProposalState.OPEN),
      getProposalCountByState(HubProposalState.ACTIVE),
      getProposalCountByState(HubProposalState.CLOSED),
    ])
    setCountsByState({
      [HubProposalState.DRAFT]: draft,
      [HubProposalState.OPEN]: open,
      [HubProposalState.ACTIVE]: active,
      [HubProposalState.CLOSED]: closed,
    })
  }

  const loadPage = async (pageNum: number) => {
        setLoadingProposals(true)
        setLoadError(null)
    try {
      const startIndex = (pageNum - 1) * PAGE_SIZE
      const endIndexExclusive = Math.min(totalSelectedCount, startIndex + PAGE_SIZE)

      const segments: Array<{
        state: HubProposalState
        localOffset: number
        count: number
      }> = []

      let cumulative = 0
      for (const st of selectedStatesOrdered) {
        const cnt = countsByState[st] ?? 0
        const segStart = cumulative
        const segEnd = cumulative + cnt
        cumulative += cnt
        const overlapStart = Math.max(startIndex, segStart)
        const overlapEnd = Math.min(endIndexExclusive, segEnd)
        if (overlapStart < overlapEnd) {
          const localOffset = overlapStart - segStart
          const localCount = overlapEnd - overlapStart
          segments.push({ state: st, localOffset, count: localCount })
        }
      }

      const addrChunks = await Promise.all(
        segments.map((seg) =>
          getProposalsByState({
            state: seg.state,
            offset: seg.localOffset,
            count: seg.count,
            reverse: true,
          }).then((addrs) => addrs.map((a) => ({ a, state: seg.state })))
        )
      )
      const addrFlat: Array<{ a: `0x${string}`; state: HubProposalState }> = addrChunks.flat()

      // Fetch proposal details and body for snippet in parallel
      const details = await Promise.all(
        addrFlat.map(({ a }) => readProposalDetails(a as `0x${string}`))
      )
      const bodies = await Promise.all(
        addrFlat.map(({ a }) => readProposalBody(a as `0x${string}`))
      )

      const mapped: Proposal[] = details.map((d, i) => {
        const st = addrFlat[i]?.state ?? HubProposalState.CLOSED
        const md = parseProposalMarkdown(bodies[i] || '')
        const plain = (md.body || bodies[i] || '')
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]+`/g, ' ')
            .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
            .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
            .replace(/^>+\s?/gm, '')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/[*_~`>#-]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          const snippet = plain.length > 500 ? `${plain.slice(0, 500)}…` : plain
          return {
          id: d.address,
          title: d.title || '(untitled)',
          author: d.author,
          votes: Number(d.votesFor + d.votesAgainst),
            quorum: 0,
          timeAgo: formatTimeAgo(d.createdAt),
            hasVoted: false,
          status: stateToStatus(st),
            snippet,
          }
        })

        setProposals(mapped)
      setCurrentPage(pageNum)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setLoadError(message)
      setProposals([])
    } finally {
      setLoadingProposals(false)
    }
  }

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshCounts()
        if (cancelled) return
        await loadPage(1)
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setLoadError(message)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload on filter change
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshCounts()
        if (cancelled) return
        await loadPage(1)
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setLoadError(message)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.from(selectedStates).join(',')])

  const handleSubmitProposal = async () => {
    if (!isConnected || !address) {
      setSubmitError('Connect your wallet first.')
      return
    }
    if (!hasAccessToken) {
      setSubmitError('You need the Bobu token to create a proposal.')
      return
    }
    const text = newProposal.trim()
    if (!text) {
      setSubmitError('Proposal text cannot be empty.')
      return
    }
    try {
      setSubmitting(true)
      setSubmitError(null)
      await submitProposal(text)
      setShowCreate(false)
      setNewProposal('')
      // Refresh counts and reload first page
      await refreshCounts()
      await loadPage(1)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleState = (st: HubProposalState) => {
    setSelectedStates((prev) => {
      const next = new Set(prev)
      if (next.has(st)) {
        next.delete(st)
      } else {
        next.add(st)
      }
      if (next.size === 0) {
        next.add(HubProposalState.ACTIVE)
      }
      return next
    })
  }

  return (
    <div className="governance-root">
      <div className="snapshot-layout">
        <SnapshotSidebar />
        <div className="snapshot-main">
          <SnapshotHeader
            canCreate={isConnected && hasAccessToken && !checkingAccess}
            onCreate={() => { window.location.hash = '#/new' }}
          />
          <div className="snapshot-content">
            {showCreate && (
              <section className="snapshot-section">
                <header className="snapshot-section-heading">Create proposal</header>
                <div className="proposal-row" style={{ display: 'block' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Details</label>
                  <textarea
                    value={newProposal}
                    onChange={(e) => setNewProposal(e.target.value)}
                    rows={6}
                    placeholder="Describe your proposal…"
                    style={{ width: '100%', padding: 8, font: 'inherit' }}
                  />
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="snapshot-header-button"
                      onClick={handleSubmitProposal}
                      disabled={submitting || !isConnected || !hasAccessToken}
                    >
                      {submitting ? 'Submitting…' : 'Submit proposal'}
                    </button>
                    <button
                      type="button"
                      className="snapshot-header-button snapshot-header-button-icon"
                      onClick={() => {
                        setShowCreate(false)
                        setSubmitError(null)
                      }}
                    >
                      Cancel
                    </button>
                    {submitError && <span style={{ color: 'crimson' }}>{submitError}</span>}
                    {!isConnected && <span>Connect a wallet to continue.</span>}
                    {isConnected && checkingAccess && <span>Checking token access…</span>}
                    {isConnected && !checkingAccess && !hasAccessToken && (
                      <span>You need the Bobu token to submit.</span>
                    )}
                  </div>
                </div>
              </section>
            )}
            <SpaceHero />
            <SpaceSummary />
            <section className="snapshot-section">
              <header className="snapshot-section-heading">Proposals</header>
              <div className="proposal-filters" role="group" aria-label="Filter proposals by type">
                <button
                  type="button"
                  className={`proposal-filter-button${selectedStates.has(HubProposalState.ACTIVE) ? ' is-selected' : ''}`}
                  onClick={() => toggleState(HubProposalState.ACTIVE)}
                >
                  Active ({countsByState[HubProposalState.ACTIVE] ?? 0})
                </button>
                <button
                  type="button"
                  className={`proposal-filter-button${selectedStates.has(HubProposalState.OPEN) ? ' is-selected' : ''}`}
                  onClick={() => toggleState(HubProposalState.OPEN)}
                >
                  Open ({countsByState[HubProposalState.OPEN] ?? 0})
                </button>
                <button
                  type="button"
                  className={`proposal-filter-button${selectedStates.has(HubProposalState.DRAFT) ? ' is-selected' : ''}`}
                  onClick={() => toggleState(HubProposalState.DRAFT)}
                >
                  Draft ({countsByState[HubProposalState.DRAFT] ?? 0})
                </button>
                <button
                  type="button"
                  className={`proposal-filter-button${selectedStates.has(HubProposalState.CLOSED) ? ' is-selected' : ''}`}
                  onClick={() => toggleState(HubProposalState.CLOSED)}
                >
                  Closed ({countsByState[HubProposalState.CLOSED] ?? 0})
                </button>
              </div>
              <div className="proposal-list">
                {loadingProposals && <div className="proposal-row">Loading proposals…</div>}
                {loadError && <div className="proposal-row">Failed to load: {loadError}</div>}
                {!loadingProposals && !loadError && proposals.length === 0 && (
                  <div className="proposal-row">No proposals yet.</div>
                )}
                {!loadingProposals &&
                  !loadError &&
                  proposals.map((proposal) => (
                    <ProposalRow
                      key={proposal.id}
                      {...proposal}
                      onScheduleClick={(id) => {
                        setScheduleForId(id)
                        // Default schedule values: now → +7d
                        const nowMs = Date.now()
                        const plus7 = nowMs + 7 * 24 * 60 * 60 * 1000
                        // Format to 'YYYY-MM-DDTHH:mm'
                        const toLocal = (ms: number) => {
                          const d = new Date(ms)
                          const pad = (n: number) => n.toString().padStart(2, '0')
                          const yyyy = d.getFullYear()
                          const mm = pad(d.getMonth() + 1)
                          const dd = pad(d.getDate())
                          const hh = pad(d.getHours())
                          const min = pad(d.getMinutes())
                          return `${yyyy}-${mm}-${dd}T${hh}:${min}`
                        }
                        setScheduleStart(toLocal(nowMs))
                        setScheduleEnd(toLocal(plus7))
                        setScheduleError(null)
                      }}
                    />
                  ))}
              </div>
              {scheduleForId && (
                <div className="proposal-row" style={{ display: 'block' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
                    Schedule voting window for #{scheduleForId.slice(0, 6)}…
                  </label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Start</div>
                      <input
                        type="datetime-local"
                        value={scheduleStart}
                        onChange={(e) => setScheduleStart(e.target.value)}
                        className="snapshot-input"
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>End</div>
                      <input
                        type="datetime-local"
                        value={scheduleEnd}
                        onChange={(e) => setScheduleEnd(e.target.value)}
                        className="snapshot-input"
                      />
                    </div>
                    <button
                      type="button"
                      className="snapshot-header-button"
                      disabled={scheduleSubmitting}
                      onClick={async () => {
                        if (!scheduleForId) return
                        try {
                          setScheduleSubmitting(true)
                          setScheduleError(null)
                          const toEpoch = (val: string) => {
                            if (!val) return 0
                            const ms = Date.parse(val)
                            return ms > 0 ? Math.floor(ms / 1000) : 0
                          }
                          const start = toEpoch(scheduleStart)
                          const end = toEpoch(scheduleEnd)
                          // Enforce either both zero or end > start
                          if (!((start === 0 && end === 0) || end > start)) {
                            setScheduleError('Invalid window: either clear both or set end > start.')
                            setScheduleSubmitting(false)
                            return
                          }
                          const { setVotingWindow, syncProposalState } = await import('../web3/governanceHubActions')
                          await setVotingWindow({ proposal: scheduleForId as `0x${string}`, voteStart: start, voteEnd: end })
                          // Ensure state reflects new window immediately
                          await syncProposalState(scheduleForId as `0x${string}`)
                          // Refresh list
                          await refreshCounts()
                          await loadPage(currentPage)
                          setScheduleForId(null)
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err)
                          setScheduleError(message)
                        } finally {
                          setScheduleSubmitting(false)
                        }
                      }}
                    >
                      {scheduleSubmitting ? 'Saving…' : 'Save window'}
                    </button>
                    <button
                      type="button"
                      className="snapshot-header-button snapshot-header-button-icon"
                      onClick={() => {
                        setScheduleForId(null)
                        setScheduleError(null)
                      }}
                    >
                      Cancel
                    </button>
                    {scheduleError && <span style={{ color: 'crimson' }}>{scheduleError}</span>}
                    <span style={{ color: '#6b7280', fontSize: 13 }}>
                      Tip: leave both empty to clear the window (stays in Draft).
                    </span>
                  </div>
                </div>
              )}
              <div className="proposal-pagination" aria-label="Pagination">
                <button
                  type="button"
                  className="proposal-pagination-button"
                  onClick={() => loadPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1 || loadingProposals}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`proposal-pagination-button${p === currentPage ? ' is-current' : ''}`}
                    onClick={() => loadPage(p)}
                    disabled={loadingProposals}
                    aria-current={p === currentPage ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="proposal-pagination-button"
                  onClick={() => loadPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages || loadingProposals}
                >
                  Next
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
      <DevFooter />
    </div>
  )
}
