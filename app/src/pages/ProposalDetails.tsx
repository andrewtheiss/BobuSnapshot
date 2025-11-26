import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import './Governance.css'
import bobuAvatar from '../assets/bobuthefarmer.webp'
import {
  readProposalDetails,
  readProposalBody,
  listCommentAddresses,
  readCommentDetail,
  addComment,
  hubHasToken,
  isCommentsGated,
  setActiveByCreatorOrAdmin,
  syncProposalState,
  type Address,
} from '../web3/governanceHubActions'
import MarkdownPreview from '../components/MarkdownPreview'
import { parseProposalMarkdown } from '../utils/proposalMarkdown'

function formatTime(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000)
  return d.toLocaleString()
}

export default function ProposalDetailsPage() {
  const [proposalAddr, setProposalAddr] = useState<`0x${string}` | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState<`0x${string}` | null>(null)
  const [createdAt, setCreatedAt] = useState<number>(0)
  const [voteStart, setVoteStart] = useState<number>(0)
  const [voteEnd, setVoteEnd] = useState<number>(0)
  const [bodyMd, setBodyMd] = useState<string>('')
  const [comments, setComments] = useState<
    Array<{ address: Address; author: Address; createdAt: number; content: string; sentiment: number }>
  >([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [commentOffset, setCommentOffset] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)

  const [newComment, setNewComment] = useState('')
  const [newSentiment, setNewSentiment] = useState<number>(3)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentNotice, setCommentNotice] = useState<string | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [canComment, setCanComment] = useState<boolean | null>(null)
  const { address, isConnected } = useAccount()

  useEffect(() => {
    document.body.classList.add('governance-light')
    return () => {
      document.body.classList.remove('governance-light')
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash || ''
    const m = hash.match(/#\/proposal\/(0x[0-9a-fA-F]{40})/)
    setProposalAddr((m?.[1] as `0x${string}`) ?? null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!proposalAddr) return
      try {
        setLoading(true)
        setError(null)
        const [details, body] = await Promise.all([
          readProposalDetails(proposalAddr),
          readProposalBody(proposalAddr),
        ])
        if (cancelled) return
        setAuthor(details.author)
        setCreatedAt(details.createdAt)
        setVoteStart(details.voteStart)
        setVoteEnd(details.voteEnd)
        // Prefer on-chain title, but if empty fallback to parsed markdown title
        const parsed = parseProposalMarkdown(body || '')
        setTitle(details.title || parsed.title || '(untitled)')
        setBodyMd(body || '')
        // reset comments
        setComments([])
        setCommentOffset(0)
        setHasMoreComments(true)
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [proposalAddr])

  const loadMoreComments = async () => {
    if (!proposalAddr || !hasMoreComments || loadingMore) return
    try {
      setLoadingMore(true)
      const page = await listCommentAddresses({ proposal: proposalAddr, offset: commentOffset, count: 20, reverse: true })
      const details = await Promise.all(page.items.map((c) => readCommentDetail(c)))
      const filtered = details.filter((d) => !d.deleted)
      const mapped = filtered.map((d) => ({
        address: d.address,
        author: d.author,
        createdAt: d.createdAt,
        content: d.content,
        sentiment: d.sentiment,
      }))
      setComments((prev) => prev.concat(mapped))
      setCommentOffset(commentOffset + page.count)
      setHasMoreComments(page.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    // auto-load first page of comments
    loadMoreComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalAddr])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!address || !isConnected) {
          setCanComment(null)
          return
        }
        const gated = await isCommentsGated()
        if (!gated) {
          if (!cancelled) setCanComment(true)
          return
        }
        const hasTok = await hubHasToken(address as Address)
        if (!cancelled) setCanComment(Boolean(hasTok))
      } catch {
        if (!cancelled) setCanComment(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address, isConnected])

  const detailsMeta = useMemo(() => {
    return [
      author ? `by ${author.slice(0, 6)}...${author.slice(-4)}` : '',
      createdAt ? `created ${formatTime(createdAt)}` : '',
      voteStart && voteEnd
        ? `voting ${formatTime(voteStart)} → ${formatTime(voteEnd)}`
        : 'no voting window',
    ]
      .filter(Boolean)
      .join(' · ')
  }, [author, createdAt, voteStart, voteEnd])

  return (
    <div className="governance-root">
      <div className="snapshot-layout">
        <div className="snapshot-main" style={{ width: '100%' }}>
          <header className="snapshot-header">
            <div className="snapshot-header-space">
              <img src={bobuAvatar} alt="Bobu avatar" className="snapshot-header-avatar" />
              <span className="snapshot-header-name">Bobu</span>
            </div>
            <div className="snapshot-header-actions">
              <a href="#/s:bobu.eth" className="snapshot-header-button">Back</a>
            </div>
          </header>
          <div className="snapshot-content">
            <section className="snapshot-section">
              <header className="snapshot-section-heading">Proposal</header>
              <div className="proposal-row" style={{ display: 'block' }}>
                {loading && <div>Loading…</div>}
                {error && <div style={{ color: 'crimson' }}>{error}</div>}
                {!loading && !error && (
                  <>
                    <h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2>
                    <div style={{ color: '#6b7280', marginTop: 6, fontSize: 14 }}>{detailsMeta}</div>
                    {isConnected && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                        <button
                          type="button"
                          className="snapshot-header-button"
                          onClick={async () => {
                            if (!proposalAddr) return
                            try {
                              await setActiveByCreatorOrAdmin(proposalAddr, true)
                              await syncProposalState(proposalAddr)
                              window.location.reload()
                            } catch (err) {
                              const message = err instanceof Error ? err.message : String(err)
                              alert(
                                message.toLowerCase().includes('admin') || message.toLowerCase().includes('author')
                                  ? 'Only the author or an admin can mark active.'
                                  : message
                              )
                            }
                          }}
                        >
                          Set Active
                        </button>
                        <button
                          type="button"
                          className="snapshot-header-button"
                          onClick={async () => {
                            if (!proposalAddr) return
                            try {
                              await setActiveByCreatorOrAdmin(proposalAddr, false)
                              await syncProposalState(proposalAddr)
                              window.location.reload()
                            } catch (err) {
                              const message = err instanceof Error ? err.message : String(err)
                              alert(
                                message.toLowerCase().includes('admin') || message.toLowerCase().includes('author')
                                  ? 'Only the author or an admin can close the proposal.'
                                  : message
                              )
                            }
                          }}
                        >
                          Close Proposal
                        </button>
                        <button
                          type="button"
                          className="snapshot-header-button"
                          onClick={async () => {
                            if (!proposalAddr) return
                            try {
                              await syncProposalState(proposalAddr)
                              window.location.reload()
                            } catch (err) {
                              const message = err instanceof Error ? err.message : String(err)
                              alert(message)
                            }
                          }}
                        >
                          Sync Status
                        </button>
                      </div>
                    )}
                    <div style={{ marginTop: 16 }}>
                      <MarkdownPreview markdown={bodyMd} />
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="snapshot-section">
              <header className="snapshot-section-heading">Comments</header>
              <div className="proposal-row" style={{ display: 'block' }}>
                {comments.length === 0 && <div>No comments yet.</div>}
                {comments.map((c) => (
                  <article key={c.address} style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 14 }}>
                      <span>by {`${c.author.slice(0, 6)}...${c.author.slice(-4)}`}</span>
                      <span className="proposal-row-dot">·</span>
                      <span>{formatTime(c.createdAt)}</span>
                      {!!c.sentiment && (
                        <>
                          <span className="proposal-row-dot">·</span>
                          <span>sentiment {c.sentiment}</span>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <MarkdownPreview markdown={c.content} />
                    </div>
                  </article>
                ))}
                {hasMoreComments && (
                  <button
                    type="button"
                    className="snapshot-header-button"
                    style={{ marginTop: 12 }}
                    onClick={loadMoreComments}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            </section>

            <section className="snapshot-section">
              <header className="snapshot-section-heading">Add a comment</header>
              <div className="proposal-row" style={{ display: 'block' }}>
                {!isConnected && <div>Connect a wallet to comment.</div>}
                {isConnected && canComment === false && <div>You need the Bobu token to comment.</div>}
                {isConnected && (canComment === true || canComment === null) && (
                  <>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Content</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="snapshot-input"
                      rows={6}
                      placeholder="Write your comment…"
                      style={{ width: '100%', font: 'inherit' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <label style={{ fontSize: 13, color: '#6b7280' }}>
                        Sentiment:{' '}
                        <select
                          className="snapshot-input"
                          value={newSentiment}
                          onChange={(e) => setNewSentiment(Number(e.target.value))}
                          style={{ padding: '6px 10px' }}
                        >
                          <option value={1}>Positive</option>
                          <option value={2}>Negative</option>
                          <option value={3}>Neutral</option>
                          <option value={4}>Inquiry</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className="snapshot-header-button"
                        onClick={async () => {
                          if (!proposalAddr) return
                          const content = newComment.trim()
                          if (!content) {
                            setCommentError('Comment cannot be empty.')
                            return
                          }
                          try {
                            setCommentSubmitting(true)
                            setCommentError(null)
                            await addComment({ proposal: proposalAddr, content, sentiment: newSentiment })
                            setNewComment('')
                            setNewSentiment(3)
                            setCommentNotice('Comment submitted. Reloading…')
                            setTimeout(() => window.location.reload(), 900)
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err)
                            const lower = message.toLowerCase()
                            if (lower.includes('token required')) {
                              setCommentError('You need the Bobu token to comment.')
                              setCommentNotice('Not allowed. Reloading…')
                              setTimeout(() => window.location.reload(), 1200)
                            } else if (lower.includes('denied') || lower.includes('rejected')) {
                              setCommentError('Transaction cancelled by user.')
                              setCommentNotice('Cancelled. Reloading…')
                              setTimeout(() => window.location.reload(), 1100)
                            } else {
                              setCommentError(`Failed to submit: ${message.split('\n')[0].slice(0, 160)}`)
                              setCommentNotice('Failed. Reloading…')
                              setTimeout(() => window.location.reload(), 1500)
                            }
                          } finally {
                            setCommentSubmitting(false)
                          }
                        }}
                        disabled={commentSubmitting}
                      >
                        {commentSubmitting ? 'Submitting…' : 'Submit comment'}
                      </button>
                      {commentError && <span style={{ color: 'crimson' }}>{commentError}</span>}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      {(commentSubmitting || commentNotice) && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-overlay-inner">
            <span className="loading-spinner" aria-hidden="true" />
            <span>{commentNotice || 'Submitting comment…'}</span>
          </div>
        </div>
      )}
    </div>
  )
}


