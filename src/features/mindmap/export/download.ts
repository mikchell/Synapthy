// ファイルとして保存する（ブラウザのダウンロード）

// ファイル名に使えない文字を置き換える。空になったら代わりの名前を使う
export function safeFileName(name: string, fallback = 'mindmap'): string {
  // 制御文字（コード32未満）は取り除き、ファイル名に使えない記号は _ に置き換える
  const cleaned = Array.from(name)
    .filter((c) => c.charCodeAt(0) >= 32)
    .join('')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
  return cleaned.slice(0, 80) || fallback
}

export function downloadTextFile(fileName: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // ダウンロードが始まったあとに解放する
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
