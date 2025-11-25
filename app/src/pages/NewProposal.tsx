import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import QuillEditor from '../components/QuillEditor'
import { composeProposalMarkdown } from '../utils/proposalMarkdown'
import { htmlToMarkdown } from '../utils/proposalMarkdown'
import { createProposalOnHub } from '../web3/governanceHubActions'
import bobuAvatar from '../assets/bobuthefarmer.webp'

export default function NewProposal() {
  const [title, setTitle] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address, isConnected } = useAccount()
  const textRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    document.body.classList.add('governance-light')
    return () => {
      document.body.classList.remove('governance-light')
    }
  }, [])

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setError('Connect your wallet first.')
      return
    }
    const trimmedTitle = title.trim()
    const trimmedBodyHtml = bodyHtml.trim()
    if (!trimmedTitle) {
      setError('Title cannot be empty.')
      return
    }
    if (!trimmedBodyHtml) {
      setError('Body cannot be empty.')
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const bodyMarkdown = htmlToMarkdown(trimmedBodyHtml)
      const fullMarkdown = composeProposalMarkdown(trimmedTitle, address, bodyMarkdown)
      // Create as DRAFT by default (0,0); you can schedule on the main page
      await createProposalOnHub(trimmedTitle, fullMarkdown, 0, 0)
      // Success: redirect back to governance
      window.location.hash = '#/s:bobu.eth'
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const lower = message.toLowerCase()
      if (lower.includes('denied') || lower.includes('rejected')) {
        setError('Transaction cancelled by user.')
      } else if (lower.includes('insufficient funds')) {
        setError('Insufficient funds to pay gas. Please top up and try again.')
      } else {
        setError(`Submission failed: ${message.split('\n')[0].slice(0, 160)}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const togglePreview = () => setShowPreview((v) => !v)

  return (
    <div className="governance-root">
      <div className="snapshot-layout">
        <aside className="snapshot-sidebar" aria-label="Navigation">
          <div className="snapshot-sidebar-inner">
            <nav className="snapshot-sidebar-nav">
              <a href="#/s:bobu.eth" className="snapshot-sidebar-link">
                <span className="snapshot-sidebar-icon">
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
                </span>
                <span className="snapshot-sidebar-label">Back to Governance</span>
              </a>
            </nav>
          </div>
        </aside>
        <div className="snapshot-main">
          <header className="snapshot-header">
            <div className="snapshot-header-space">
              <img src={bobuAvatar} alt="Bobu avatar" className="snapshot-header-avatar" />
              <span className="snapshot-header-name">Bobu</span>
            </div>
            <div className="snapshot-header-actions"></div>
          </header>
          <div className="snapshot-content">
            <section className="snapshot-section">
              <header className="snapshot-section-heading">New Proposal</header>
              <div className="proposal-row" style={{ display: 'block' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="snapshot-input"
                  placeholder="Enter proposal title..."
                  maxLength={128}
                  style={{ width: '100%', marginBottom: 16 }}
                />
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Proposal:</label>
                <QuillEditor html={bodyHtml} onChangeHtml={setBodyHtml} readOnly={showPreview} />
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="snapshot-header-button"
                    onClick={handleSubmit}
                    disabled={
                      submitting || !isConnected || !title.trim() || !bodyHtml.trim()
                    }
                  >
                    {submitting ? 'Submitting…' : 'Submit proposal'}
                  </button>
                  <button
                    type="button"
                    className="snapshot-header-button"
                    onClick={togglePreview}
                  >
                    {showPreview ? 'Edit' : 'Preview'}
                  </button>
                  {error && <span style={{ color: 'crimson' }}>{error}</span>}
                  {!isConnected && <span>Connect a wallet to submit.</span>}
                  {isConnected && (
                    <span style={{ fontSize: 14, color: '#6b7280' }}>
                      Submitting as {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
