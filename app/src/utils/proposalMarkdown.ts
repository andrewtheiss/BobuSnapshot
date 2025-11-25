export function composeProposalMarkdown(title: string, author: string, body: string): string {
  return `# ${title}
Author: ${author}

${body}`
}

export function parseProposalMarkdown(markdown: string): { title: string; author: string; body: string } {
  const lines = markdown.split('\n')
  let title = ''
  let author = ''
  let bodyStart = 0

  // Parse title from first line (expecting # Title)
  if (lines.length > 0 && lines[0].startsWith('# ')) {
    title = lines[0].slice(2).trim()
    bodyStart = 1
  }

  // Parse author from second line (expecting Author: 0x...)
  if (lines.length > 1 && lines[1].startsWith('Author: ')) {
    author = lines[1].slice(8).trim()
    bodyStart = 2
  }

  // Rest is body
  const body = lines.slice(bodyStart).join('\n').trim()

  return { title, author, body }
}

export function tinyMarkdownToHtml(markdown: string): string {
  if (!markdown) return ''

  // Simple markdown to HTML converter for preview
  let html = markdown

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.*?)_/g, '<em>$1</em>')

  // Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/^```([\s\S]*?)```$/gm, '<pre><code>$1</code></pre>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Lists
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>')
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'

  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')

  return html
}

export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  // Simple HTML to markdown converter
  let md = html

  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')

  // Bold
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')

  // Italic
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

  // Code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1\n')
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '$1\n')
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1')

  // Paragraphs
  md = md.replace(/<\/?p[^>]*>/gi, '')

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1')

  // Clean up extra newlines
  md = md.replace(/\n{3,}/g, '\n\n').trim()

  return md
}
