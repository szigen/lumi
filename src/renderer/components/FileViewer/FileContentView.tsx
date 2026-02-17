import Editor from '@monaco-editor/react'

interface FileContentViewProps {
  content: string
  filePath: string
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', scss: 'scss', html: 'html',
    py: 'python', rs: 'rust', go: 'go', yaml: 'yaml', yml: 'yaml',
    sh: 'shell', bash: 'shell', toml: 'ini', sql: 'sql', xml: 'xml',
    svg: 'xml', graphql: 'graphql', dockerfile: 'dockerfile',
  }
  return langMap[ext] || 'plaintext'
}

export default function FileContentView({ content, filePath }: FileContentViewProps) {
  return (
    <Editor
      height="100%"
      language={getLanguageFromPath(filePath)}
      value={content}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        lineNumbers: 'on',
        renderLineHighlight: 'none',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  )
}
