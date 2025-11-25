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
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Convert Quill code blocks: ql-code-block-container -> ``` multiline ```
  const codeContainers = Array.from(doc.querySelectorAll('div.ql-code-block-container'))
  for (const container of codeContainers) {
    const lines = Array.from(container.querySelectorAll('div.ql-code-block')).map((el) => el.textContent ?? '')
    const md = `\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`
    const replacement = doc.createElement('pre')
    replacement.textContent = md
    container.replaceWith(replacement)
  }

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const inner = () => Array.from(el.childNodes).map(walk).join('')
    switch (tag) {
      case 'h1':
        return `# ${inner()}\n\n`
      case 'h2':
        return `## ${inner()}\n\n`
      case 'h3':
        return `### ${inner()}\n\n`
      case 'strong':
      case 'b':
        return `**${inner()}**`
      case 'em':
      case 'i':
        return `*${inner()}*`
      case 'u':
        return inner()
      case 'code': {
        // Inline code
        const text = el.textContent ?? ''
        return '`' + text.replace(/`/g, '\\`') + '`'
      }
      case 'pre': {
        const text = el.textContent ?? ''
        // If already wrapped as markdown block (from container conversion), return as-is
        if (text.trim().startsWith('```')) return text + '\n'
        return `\n\`\`\`\n${text}\n\`\`\`\n`
      }
      case 'blockquote':
        return inner()
          .split('\n')
          .map((l) => (l.trim() ? `> ${l}` : ''))
          .join('\n') + '\n\n'
      case 'a': {
        const href = el.getAttribute('href') ?? ''
        const text = inner().trim() || href
        return `[${text}](${href})`
      }
      case 'ul': {
        const items = Array.from(el.children)
          .filter((c) => c.tagName.toLowerCase() === 'li')
          .map((li) => `- ${walk(li)}`)
          .join('\n')
        return items + '\n\n'
      }
      case 'ol': {
        const items = Array.from(el.children)
          .filter((c) => c.tagName.toLowerCase() === 'li')
          .map((li, i) => `${i + 1}. ${walk(li)}`)
          .join('\n')
        return items + '\n\n'
      }
      case 'li':
        return inner()
      case 'br':
        return '\n'
      case 'p':
        return inner().trim() ? inner() + '\n\n' : '\n'
      default:
        return inner()
    }
  }

  const out = walk(doc.body)
  return out.replace(/\n{3,}/g, '\n\n').trim()
}
