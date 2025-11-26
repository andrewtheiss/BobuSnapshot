import { useEffect, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

type Props = {
  markdown: string
  onChangeMarkdown: (next: string) => void
}

export default function RichTextEditor({ markdown, onChangeMarkdown }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const crepeRef = useRef<Crepe | null>(null)

  useEffect(() => {
    let destroyed = false
    if (!rootRef.current) return
    // Destroy any existing instance before creating a new one
    if (crepeRef.current) {
      try {
        crepeRef.current.destroy()
      } catch {
        // ignore
      }
      crepeRef.current = null
    }
    const instance = new Crepe({
      root: rootRef.current,
      defaultValue: markdown || '',
      // Disable optional features; use empty object to avoid type issues without the package types
      features: {} as any,
    })
    instance
      .create()
      .then(() => {
        if (destroyed) return
        crepeRef.current = instance
        // Initial sync to ensure parent has consistent markdown
        const mdNow = (instance as any).editor?.getMarkdown?.() ?? markdown ?? ''
        onChangeMarkdown(mdNow)
        // Listen for changes
        const editor: any = (instance as any).editor
        if (editor && typeof editor.on === 'function') {
          editor.on('change', () => {
            const md = editor.getMarkdown()
            onChangeMarkdown(md)
          })
        }
      })
      .catch(() => {
        // no-op
      })
    return () => {
      destroyed = true
      try {
        instance.destroy()
      } catch {
        // ignore
      }
      crepeRef.current = null
    }
  }, [markdown])

  return (
    <div className="rte-root">
      <div ref={rootRef} className="crepe-container" />
      <style>{`
        .rte-root {
          display: grid;
          gap: 8px;
        }
        .crepe-container {
          min-height: 220px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background-color: #ffffff;
          color: #0f172a;
          overflow: hidden;
        }
        /* Milkdown outline theme tweaks to blend with snapshot light */
        .crepe-container .milkdown {
          background-color: #ffffff;
        }
        .crepe-container .crepe-editor {
          background-color: #ffffff;
        }
        .crepe-container .crepe-toolbar {
          background-color: #ffffff;
          border-bottom: 1px solid #f1f5f9;
        }
        .crepe-container .crepe-content {
          background-color: #ffffff;
          padding: 8px 12px;
        }
        .crepe-container .crepe-content h1,
        .crepe-container .crepe-content h2,
        .crepe-container .crepe-content h3 {
          margin: 0.2em 0;
        }
      `}</style>
    </div>
  )
}
