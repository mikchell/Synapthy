import { clampSheetName } from '../../../lib/limits'
import { ImportError, IMPORT_LIMITS, parseMarkdownOutline, type OutlineItem } from './markdown'

// 選んだ Markdown ファイルを読んで、新しいシートの名前とノードの木にする。取り込めないときは ImportError
export async function readMarkdownFile(file: File): Promise<{ name: string; root: OutlineItem }> {
  if (file.size > IMPORT_LIMITS.fileBytes) {
    throw new ImportError(`ファイルが大きすぎます（${IMPORT_LIMITS.fileBytes / 1024 / 1024}MBまで）`)
  }
  const { title, root } = parseMarkdownOutline(await file.text())
  // シート名は、見出しがなければファイル名にする
  const name = clampSheetName((title || file.name.replace(/\.[^.]+$/, '')).trim())
  return { name: name || 'インポートしたマップ', root }
}
