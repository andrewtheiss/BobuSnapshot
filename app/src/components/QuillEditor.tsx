import { useEffect, useRef } from 'react'
import Quill from 'quill'
import type { QuillOptions } from 'quill'
import 'quill/dist/quill.snow.css'

type Props = {
  html: string
  onChangeHtml: (next: string) => void
  readOnly?: boolean
}

export default function QuillEditor({ html, onChangeHtml, readOnly }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const quillRef = useRef<Quill | null>(null)
  const skipHtmlSyncRef = useRef(false)

  useEffect(() => {
    if (!editorRef.current) return
    const options: QuillOptions = {
      theme: 'snow',
      readOnly: Boolean(readOnly),
      modules: {
        toolbar: toolbarRef.current ?? true,
        history: { delay: 500, maxStack: 100, userOnly: true },
      },
      formats: [
        'header',
        'bold', 'italic', 'underline', 'strike', 'link',
        'blockquote', 'code-block',
        'list', 'align', 'color', 'background',
      ],
    }
    const q = new Quill(editorRef.current, options)
    quillRef.current = q
    if (html) {
      try {
        // Prefer clipboard API so Quill maintains a valid Delta and selection
        ;(q as any).clipboard?.dangerouslyPasteHTML?.(html)
      } catch {
        q.root.innerHTML = html
      }
    }
    // Use Quill's default toolbar bindings; selection is ensured below
    // Ensure there is always a valid selection before toolbar handlers run
    const ensureSelection = () => {
      const sel = q.getSelection()
      if (!sel) {
        const len = q.getLength()
        q.setSelection(Math.max(0, Math.min(1, len - 1)), 0)
      }
    }
    const toolbarEl = toolbarRef.current
    if (toolbarEl) {
      const onToolbarMouseDown = () => ensureSelection()
      toolbarEl.addEventListener('mousedown', onToolbarMouseDown, { capture: true })
      // Cleanup listeners on unmount
      ;(q as any).__toolbarCleanup = () => {
        toolbarEl.removeEventListener('mousedown', onToolbarMouseDown, { capture: true } as any)
      }
    }
    const handler = () => {
      skipHtmlSyncRef.current = true
      onChangeHtml(q.root.innerHTML)
    }
    q.on('text-change', handler)
    return () => {
      q.off('text-change', handler)
      // @ts-expect-error cleanup
      q?.destroy?.()
      // Detach toolbar listeners if present
      try {
        ;(q as any).__toolbarCleanup?.()
      } catch {
        // ignore
      }
      quillRef.current = null
    }
  }, [])

  useEffect(() => {
    const q = quillRef.current
    if (!q) return
    if (skipHtmlSyncRef.current) {
      // This update originated from Quill; don't overwrite it.
      skipHtmlSyncRef.current = false
      return
    }
    const next = (html || '').trim()
    const curr = q.root.innerHTML.trim()
    if (curr === next) return
    const sel = q.getSelection()
    try {
      ;(q as any).clipboard?.dangerouslyPasteHTML?.(next)
      if (sel) q.setSelection(sel.index, sel.length, 'silent')
    } catch {
      q.root.innerHTML = next
      if (sel) q.setSelection(sel.index, sel.length, 'silent')
    }
  }, [html])

  useEffect(() => {
    const q = quillRef.current
    if (!q) return
    q.enable(!readOnly)
  }, [readOnly])

  return (
    <div className="quill-wrapper">
      <div ref={toolbarRef}>
        <span className="ql-formats">
          <select className="ql-header" defaultValue="">
            <option value="1" />
            <option value="2" />
            <option value="3" />
            <option value="" />
          </select>
        </span>
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-strike" />
          <button className="ql-link" />
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
          <button className="ql-list" value="check" />
          <button className="ql-blockquote" />
          <button className="ql-code-block" />
        </span>
        <span className="ql-formats">
          <select className="ql-align" />
          <select className="ql-color" />
          <select className="ql-background" />
        </span>
        <span className="ql-formats">
          <button className="ql-clean" />
        </span>
      </div>
      <div ref={editorRef} />
      <style>{`
        .quill-wrapper .ql-toolbar.ql-snow {
          border: 1px solid #e5e7eb;
          border-radius: 12px 12px 0 0;
          background: #ffffff;
        }
        .quill-wrapper .ql-container.ql-snow {
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 12px 12px;
          background: #ffffff;
          min-height: 260px;
        }
        .quill-wrapper .ql-editor {
          min-height: 240px;
          color: #0f172a;
        }
      `}</style>
    </div>
  )
}



