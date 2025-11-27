import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import QuillEditor from '../components/QuillEditor'
import MarkdownPreview from '../components/MarkdownPreview'
import { composeProposalMarkdown } from '../utils/proposalMarkdown'
import { htmlToMarkdown } from '../utils/proposalMarkdown'
import { createProposalOnHub } from '../web3/governanceHubActions'
import bobuAvatar from '../assets/bobuthefarmer.webp'

export default function NewProposal() {
  const [title, setTitle] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { address, isConnected } = useAccount()

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
      setSubmitNotice('Submitted. Reloading…')
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const lower = message.toLowerCase()
      if (lower.includes('denied') || lower.includes('rejected')) {
        setError('Transaction cancelled by user.')
        setSubmitNotice('Cancelled. Reloading…')
        setTimeout(() => window.location.reload(), 1100)
      } else if (lower.includes('insufficient funds')) {
        setError('Insufficient funds to pay gas. Please top up and try again.')
        setSubmitNotice('Failed. Reloading…')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setError(`Submission failed: ${message.split('\n')[0].slice(0, 160)}`)
        setSubmitNotice('Failed. Reloading…')
        setTimeout(() => window.location.reload(), 1500)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const togglePreview = () => setShowPreview((v) => !v)

  return (
    <>
    <div className="governance-root">
      <div className="snapshot-layout">
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
                {!showPreview ? (
                  <QuillEditor html={bodyHtml} onChangeHtml={setBodyHtml} readOnly={false} />
                ) : (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
                    <MarkdownPreview markdown={htmlToMarkdown(bodyHtml || '')} />
                  </div>
                )}
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
    {(submitting || submitNotice) && (
      <div className="loading-overlay" role="status" aria-live="polite">
        <div className="loading-overlay-inner">
          <span className="loading-spinner" aria-hidden="true" />
          <span>{submitNotice || 'Submitting transaction…'}</span>
        </div>
      </div>
    )}
    </>
  )
}
