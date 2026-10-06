// 画面を描く前にテーマを決めておく（あとから切り替わると一瞬明るく光るため）。src/lib/theme.ts と同じ判定
// CSP（script-src 'self'）でインラインスクリプトを許可しなくて済むよう、index.html から外に出している
(function () {
  var saved = null
  try { saved = localStorage.getItem('synaptique-theme') } catch (e) {}
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
})()
