import { useEffect, useRef } from 'react'
import Quill from 'quill'
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

  useEffect(() => {
    if (!editorRef.current) return
    const options: Quill.Options = {
      theme: 'snow',
      readOnly: Boolean(readOnly),
      modules: {
        toolbar: toolbarRef.current ?? true,
        history: { delay: 500, maxStack: 100, userOnly: true },
      },
    }
    const q = new Quill(editorRef.current, options)
    quillRef.current = q
    if (html) {
      q.root.innerHTML = html
    }
    const handler = () => onChangeHtml(q.root.innerHTML)
    q.on('text-change', handler)
    return () => {
      q.off('text-change', handler)
      // @ts-expect-error cleanup
      q?.destroy?.()
      quillRef.current = null
    }
  }, [])

  useEffect(() => {
    const q = quillRef.current
    if (!q) return
    if (q.root.innerHTML.trim() !== (html || '').trim()) {
      q.root.innerHTML = html || ''
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
            <option value="" />
          </select>
        </span>
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-link" />
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
          <button className="ql-blockquote" />
          <button className="ql-code-block" />
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


