import { tinyMarkdownToHtml } from '../utils/proposalMarkdown'

type Props = {
  markdown: string
  className?: string
}

export default function MarkdownPreview({ markdown, className }: Props) {
  const html = tinyMarkdownToHtml(markdown)

  return (
    <div
      className={`markdown-preview ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        lineHeight: 1.6,
        color: '#0f172a',
      }}
    />
  )
}
