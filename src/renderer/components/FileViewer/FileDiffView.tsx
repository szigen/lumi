import { DiffEditor } from '@monaco-editor/react'

interface FileDiffViewProps {
  original: string
  modified: string
  fileName: string
}

export default function FileDiffView({ original, modified, fileName }: FileDiffViewProps) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', scss: 'scss', html: 'html',
    py: 'python', rs: 'rust', go: 'go', yaml: 'yaml', yml: 'yaml',
  }
  const language = langMap[ext] || 'plaintext'

  return (
    <DiffEditor
      height="100%"
      language={language}
      original={original}
      modified={modified}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        renderSideBySide: true,
        renderOverviewRuler: false,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  )
}
