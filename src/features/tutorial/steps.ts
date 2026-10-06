// ガイドツアーの内容。target は画面上の対象を指す CSS セレクタ（無ければ、画面の中央に出す）
export interface TutorialStep {
  id: string
  // どちらの画面で見せるか。ステップが変わると、画面も自動で切り替わる
  view: 'home' | 'editor'
  target?: string
  // モバイルでは、対象が違うとき（画面に出ていない部品の代わりに、それを開くボタンなど）
  mobileTarget?: string
  title: string
  body: string
  // モバイルでは別の文面にしたいとき
  mobileBody?: string
  // モバイルでは対象が画面に出ない（サイドバーなど）ステップ
  desktopOnly?: boolean
  // 説明のカードを出さず、画面全体のアニメーションだけを見せる導入のステップ
  intro?: boolean
  // このステップの間、中心テーマを選択状態にする（選択すると出る「＋」を見せるため）
  selectRoot?: boolean
}

export const ROOT_NODE_SELECTOR = '.react-flow__node[data-id="root"]'

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    view: 'home',
    intro: true,
    title: 'Synapthy へようこそ',
    body: 'アイデアをマインドマップで整理するアプリです。1分ほどで、基本の使い方をご案内します。',
  },
  {
    id: 'new-sheet',
    view: 'home',
    target: '[data-tour="new-sheet"]',
    title: 'マップを作る',
    body: '「新規作成」で、新しいマップ（シート）を作れます。作ったマップはカードで並び、クリックすると開きます。',
  },
  {
    id: 'import',
    view: 'home',
    target: '[data-tour="import"]',
    title: 'Markdown から取り込む',
    body: '「インポート」で、書き出した Markdown（.md）のファイルを、新しいマップとして取り込めます。今あるマップは変わりません。',
  },
  {
    id: 'thumbnail',
    view: 'home',
    target: '[data-tour="sheet-card"]',
    title: 'サムネイルを変える',
    body: 'カードにカーソルを合わせると出る「画像」ボタンで、サムネイル（カードの画像）を変えられます。用意されたテンプレートから選ぶことも、自分の画像をアップロードすることもできます。',
    mobileBody: 'カードの「画像」ボタンで、サムネイル（カードの画像）を変えられます。用意されたテンプレートから選ぶことも、自分の画像をアップロードすることもできます。',
  },
  {
    id: 'folders',
    view: 'home',
    target: '[data-tour="home-folders"]',
    title: 'フォルダで整理する',
    body: '「＋」でフォルダを作り、マップのカードをフォルダにドラッグ&ドロップすると、整理できます。',
    desktopOnly: true,
  },
  {
    id: 'theme',
    view: 'home',
    target: '[data-tour="theme-toggle"]',
    title: 'ダークモード',
    body: '太陽・月のボタンで、ライトモードとダークモードを切り替えられます。暗い場所や夜に使うときは、ダークモードが目にやさしくなります。選んだ設定は、このブラウザに保存されます。',
  },
  {
    id: 'root-node',
    view: 'editor',
    target: ROOT_NODE_SELECTOR,
    title: '中心テーマ',
    body: 'ここから考えを広げていきます。ダブルクリックで文字を編集して、Enter で確定します（Esc で取り消し）。編集中は、太字や文字の色も選べます。',
    mobileBody: 'ここから考えを広げていきます。ダブルタップで文字を編集して、確定します。編集中は、太字や文字の色も選べます。',
    // 次のステップで見せる「＋」を、あらかじめ出しておく（選択し直さないので、切り替えがなめらかになる）
    selectRoot: true,
  },
  {
    id: 'add-child',
    view: 'editor',
    target: '[data-tour="add-child"]',
    title: '子ノードを追加する',
    body: 'ノードにカーソルを合わせるか、クリックして選ぶと、右に「＋」が出ます。押すと、そのノードにつながる子ノードが増えます。',
    mobileBody: 'ノードをタップして選ぶと、右に「＋」が出ます。押すと、そのノードにつながる子ノードが増えます。',
    selectRoot: true,
  },
  {
    id: 'add-sibling',
    view: 'editor',
    title: '兄弟ノードを追加する',
    body: '中心テーマ以外のノードを選ぶと、下にも「＋」が出ます。押すと、同じ階層に並ぶ兄弟ノードが増えます。中心テーマには兄弟がないので、「＋」は右にだけ出ます。',
    mobileBody: '中心テーマ以外のノードを選ぶと、下にも「＋」が出ます。押すと、同じ階層に並ぶ兄弟ノードが増えます。',
  },
  {
    id: 'node-buttons',
    view: 'editor',
    title: '画像の追加と削除',
    body: '中心テーマ以外のノードを選ぶと、左上にボタンが出ます。画像を付けたり（貼り付けの⌘V / Ctrl+V でも付けられます）、ノードを削除したりできます。中心テーマには、画像を付けることも、削除することもできません。',
    mobileBody: '中心テーマ以外のノードを選ぶと、左上にボタンが出ます。画像を付けたり、ノードを削除したりできます。中心テーマには、画像を付けることも、削除することもできません。',
  },
  {
    id: 'toolbar',
    view: 'editor',
    target: '[data-tour="toolbar"]',
    title: 'ツールバー',
    body: 'ズーム、全体表示、元に戻す・やり直し、画像の追加は、ここから使えます。',
  },
  {
    id: 'export',
    view: 'editor',
    target: '[data-tour="export"]',
    title: 'PDF・Markdown に書き出す',
    body: 'ヘッダーの「書き出し」で、このマップを PDF か Markdown（.md）のファイルにできます。Markdown に書き出したものは、ホームの「インポート」で取り込めます。',
  },
  {
    id: 'editor-sidebar',
    view: 'editor',
    target: '[data-tour="editor-sidebar"]',
    title: 'サイドバー',
    body: 'マップの切り替え、新規作成、ゴミ箱への移動、フォルダへの移動ができます。左上のボタンで、折りたためます。',
    desktopOnly: true,
  },
  {
    id: 'done',
    view: 'editor',
    target: '[data-tour="tutorial-help"]',
    mobileTarget: '[data-tour="editor-sidebar-open"]',
    title: '準備ができました',
    body: '左のサイドバーの下にある「使い方」ボタンから、いつでもこのガイドを見直せます。さっそく、マップを作ってみましょう。',
    mobileBody: 'このボタンでサイドバーを開くと、いちばん下に「使い方」ボタンがあります。いつでもこのガイドを見直せます。さっそく、マップを作ってみましょう。',
  },
]
