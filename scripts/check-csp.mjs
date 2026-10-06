// vercel.json の Content-Security-Policy を検査する
//
// 確かめること:
//   1. 通信（connect-src）と画像（img-src）の許可先に、ワイルドカードが無いこと
//      （Google のアバター画像の `https://*.googleusercontent.com` だけは例外）。
//      `*.supabase.co` のように広く許可すると、万一スクリプトを差し込まれたときに、
//      他人の Supabase プロジェクトへデータを送れてしまう
//   2. Supabase の許可先が、このアプリのプロジェクトの URL だけであること（環境変数 VITE_SUPABASE_URL があれば、それとも一致すること）
//   3. supabase-js が実際に通信する宛先（認証・REST・ストレージ）が、すべて connect-src に含まれていること。
//      画像の署名付き URL の宛先（ストレージ）は、img-src にも含まれていること
//
// 3 は、supabase-js の更新で宛先のホストが変わったときに、CSP が合わなくなるのを、CI で気づくためのもの
// （合わないまま本番に出ると、ログインやデータの保存が、本番だけ通信を拒否されて止まる）
//
// 使い方: node scripts/check-csp.mjs [vercel.json のパス]
//         （.env.local の値と突き合わせるとき: node --env-file=.env.local scripts/check-csp.mjs）
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const configPath = process.argv[2] ?? new URL('../vercel.json', import.meta.url)
const errors = []

const config = JSON.parse(readFileSync(configPath, 'utf8'))
const csp = (config.headers ?? [])
  .flatMap((h) => h.headers ?? [])
  .find((h) => h.key === 'Content-Security-Policy')?.value
if (!csp) {
  console.error('NG: vercel.json に Content-Security-Policy がありません')
  process.exit(1)
}

// 「ディレクティブ名 → 許可先の一覧」に分ける
const directives = new Map(
  csp
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [name, ...sources] = d.split(/\s+/)
      return [name, sources]
    })
)
const sourcesOf = (name) => directives.get(name) ?? directives.get('default-src') ?? []

// 1. ワイルドカードと、スキームだけの許可を検査する
const ALLOWED_WILDCARDS = { 'img-src': ['https://*.googleusercontent.com'] }
const ALLOWED_SCHEMES = { 'img-src': ['data:', 'blob:'], 'connect-src': [] }
for (const name of ['connect-src', 'img-src']) {
  for (const source of sourcesOf(name)) {
    if (source.startsWith("'")) continue // 'self' など
    if (source.includes('*')) {
      if (!(ALLOWED_WILDCARDS[name] ?? []).includes(source)) {
        errors.push(`${name} に、ワイルドカードの許可先があります: ${source}`)
      }
    } else if (source.endsWith(':')) {
      if (!(ALLOWED_SCHEMES[name] ?? []).includes(source)) {
        errors.push(`${name} に、スキームだけの許可先があります: ${source}`)
      }
    } else if (!/^https:\/\/[^/*]+$/.test(source)) {
      errors.push(`${name} の許可先が、https のオリジン（パスなし）ではありません: ${source}`)
    }
  }
}

// 2. Supabase の許可先が、1 つのプロジェクトの URL だけであること
const supabaseOrigins = sourcesOf('connect-src').filter((s) => /^https:\/\/[^/*]+\.supabase\.co$/.test(s))
if (supabaseOrigins.length !== 1) {
  errors.push(`connect-src の Supabase の許可先は、ちょうど 1 つのはずです（実際: ${supabaseOrigins.length} 個）`)
}

// 環境変数 VITE_SUPABASE_URL があるときは、アプリが実際に使う URL と一致することも確かめる
// （ローカルでは `node --env-file=.env.local scripts/check-csp.mjs` で確かめられる）
const [projectOrigin] = supabaseOrigins
const envUrl = process.env.VITE_SUPABASE_URL
if (envUrl && projectOrigin && new URL(envUrl).origin !== projectOrigin) {
  errors.push(`VITE_SUPABASE_URL（${new URL(envUrl).origin}）と、CSP のプロジェクトの URL（${projectOrigin}）が違います`)
}

// 3. supabase-js が実際に通信する宛先が、すべて許可されていること
if (projectOrigin) {
  const client = createClient(projectOrigin, 'dummy-anon-key')
  const endpoints = {
    '認証': client.auth.url,
    'REST': client.rest.url,
    'ストレージ': client.storage.url,
  }
  for (const [label, url] of Object.entries(endpoints)) {
    const origin = new URL(url).origin
    if (!sourcesOf('connect-src').includes(origin)) {
      errors.push(`${label}の宛先 ${origin} が、connect-src に含まれていません（supabase-js の更新で、宛先が変わった可能性があります）`)
    }
  }
  // 画像の署名付き URL は、ストレージの宛先から出る
  const storageOrigin = new URL(client.storage.url).origin
  if (!sourcesOf('img-src').includes(storageOrigin)) {
    errors.push(`画像の宛先 ${storageOrigin} が、img-src に含まれていません`)
  }
}

if (errors.length > 0) {
  console.error('NG: CSP に問題があります')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`OK: Supabase の許可先は ${projectOrigin} だけで、supabase-js の宛先（認証・REST・ストレージ）をすべて含んでいます`)
