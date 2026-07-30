"use client"

import { useState, useEffect, useRef } from "react"
import { marked } from "marked"
import { Bold, Italic, Heading3, Link2, List } from "lucide-react"

interface MarkdownEditorProps {
  id: string
  name: string
  value: string
  onChange?: (val: string) => void
  placeholder?: string
  rows?: number
  label?: string
}

export function MarkdownEditor({
  id,
  name,
  value,
  onChange,
  placeholder = "",
  rows = 4,
  label,
}: MarkdownEditorProps) {
  const [internalValue, setInternalValue] = useState(value)
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write")
  const [previewHtml, setPreviewHtml] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep internal state synced with outer value prop
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Parse markdown into HTML for preview
  useEffect(() => {
    if (activeTab === "preview") {
      const parsedHtml = marked.parse(internalValue || "") as string
      setPreviewHtml(parsedHtml)
    }
  }, [activeTab, internalValue])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInternalValue(val)
    if (onChange) {
      onChange(val)
    }
  }

  // Insert markdown helpers at cursor position
  const insertMarkdown = (prefix: string, suffix: string = "", placeholderText: string = "") => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    const selectedText = text.substring(start, end)
    const content = selectedText || placeholderText
    const replacement = prefix + content + suffix

    const newValue = text.substring(0, start) + replacement + text.substring(end)
    
    setInternalValue(newValue)
    if (onChange) {
      onChange(newValue)
    }

    // Set cursor position after the insert asynchronously
    setTimeout(() => {
      textarea.selectionStart = start + prefix.length
      textarea.selectionEnd = start + prefix.length + content.length
      textarea.focus()
    }, 0)
  }

  return (
    <div className="grid gap-2">
      {label && (
        <label htmlFor={id} className="text-xs uppercase tracking-widest font-heading font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="border border-border rounded-lg overflow-hidden bg-background">
        {/* Editor Toolbar (Tabs & Action Buttons) */}
        <div className="flex flex-col sm:flex-row border-b border-border bg-muted/30 px-3 py-2 gap-3 justify-between sm:items-center">
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`px-3 py-1 text-xs uppercase tracking-widest font-medium rounded transition-colors ${
                activeTab === "write"
                  ? "bg-background text-primary shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              disabled={!internalValue}
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 text-xs uppercase tracking-widest font-medium rounded transition-colors disabled:opacity-30 disabled:pointer-events-none ${
                activeTab === "preview"
                  ? "bg-background text-primary shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Preview
            </button>
          </div>

          {/* Basic Formatting Buttons (Visible only in 'write' mode) */}
          {activeTab === "write" && (
            <div className="flex items-center gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
              <button
                type="button"
                onClick={() => insertMarkdown("**", "**", "bold text")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("*", "*", "italic text")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("### ", "", "Heading")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Heading 3"
              >
                <Heading3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("[", "](url)", "link text")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Insert Link"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("- ", "", "list item")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Bullet List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Editor Body */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={id}
            name={name}
            value={internalValue}
            onChange={handleTextChange}
            placeholder={placeholder}
            rows={rows}
            style={{ display: activeTab === "write" ? "block" : "none" }}
            className="flex w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] border-0"
          />
          
          {activeTab === "preview" && (
            <div 
              className="prose prose-sm max-w-none dark:prose-invert p-4 min-h-[102px] overflow-y-auto max-h-[400px] text-foreground"
              dangerouslySetInnerHTML={{ __html: previewHtml || "<p className='text-muted-foreground font-light text-xs'>Nothing to preview</p>" }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
