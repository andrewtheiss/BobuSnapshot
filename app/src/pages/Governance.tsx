import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import './Governance.css'
import bobuAvatar from '../assets/bobuthefarmer.webp'
import { APP_ENV, IS_MAINNET, IS_TESTNET } from '../config/environment'
import { hasToken, mintDevToken, type Address } from '../web3/proposalContractActions'

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
  status: 'active' | 'closed'
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

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: '2f5e8447c9561d2e515851c5fba73d234dbf399b1ad5b8d93a6348578e913163',
    title: 'Decide the next Bobu Committee',
    author: '0xA4c281209001fd1F354b980D75e28d81FB50C9e2',
    votes: 151,
    quorum: 48.4,
    timeAgo: '3mo ago',
    hasVoted: true,
    status: 'closed'
  },
  {
    id: '0dcd52bb91e7d4a2e4562893cd77aba18a97de3a5e69717c7bfb7456a6ce3d16',
    title: "Approve 'Bobu Merch & Marketing Fund'? (Community Proposal by the Bobu Committee)",
    author: '0xA4c281209001fd1F354b980D75e28d81FB50C9e2',
    votes: 89,
    quorum: 18.8,
    timeAgo: '7mo ago',
    hasVoted: false,
    status: 'closed'
  },
  {
    id: '7d5a25ec53a9c6ceb4a396553a20ed2beccb55c7c6904d8f994ba2e489c72bf1',
    title: "Approve 'Sake and a Dream'? (Community Proposal by @dgtlemissions)",
    author: '0xA4c281209001fd1F354b980D75e28d81FB50C9e2',
    votes: 116,
    quorum: 24.9,
    timeAgo: '7mo ago',
    hasVoted: true,
    status: 'closed'
  }
]

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

function SnapshotHeader() {
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

function ProposalRow({ id, title, author, votes, quorum, timeAgo, hasVoted, status }: Proposal) {
  const shortAuthor = `${author.slice(0, 6)}...${author.slice(-4)}`

  return (
    <article className="proposal-row">
      <span className={`proposal-row-status proposal-row-status-${status}`} aria-hidden="true" />
      <div className="proposal-row-body">
        <a href={`#/proposal/${id}`} className="proposal-row-title">
          {title}
        </a>
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
        </div>
      </div>
    </article>
  )
}

export default function GovernancePage() {
  useEffect(() => {
    document.body.classList.add('governance-light')
    return () => {
      document.body.classList.remove('governance-light')
    }
  }, [])

  return (
    <div className="governance-root">
      <div className="snapshot-layout">
        <SnapshotSidebar />
        <div className="snapshot-main">
          <SnapshotHeader />
          <div className="snapshot-content">
            <SpaceHero />
            <SpaceSummary />
            <section className="snapshot-section">
              <header className="snapshot-section-heading">Proposals</header>
              <div className="proposal-list">
                {MOCK_PROPOSALS.map((proposal) => (
                  <ProposalRow key={proposal.id} {...proposal} />
                ))}
              </div>
              <a href="#/proposals" className="proposal-see-more">
                See more
              </a>
            </section>
          </div>
        </div>
      </div>
      <DevFooter />
    </div>
  )
}
