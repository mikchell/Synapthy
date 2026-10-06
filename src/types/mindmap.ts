// マインドマップのノードの型。複数の feature と lib から使うので、features の外に置く

export type NodeColor = 'purple' | 'blue' | 'cyan' | 'green' | 'pink' | 'orange'
export type FreeDirection = 'right' | 'left' | 'bottom' | 'top' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'

// 文字の一部分だけの装飾（太字・色）。仕組みは src/features/mindmap/utils/labelStyle.ts
export interface LabelSpan {
  start: number // 範囲の先頭（含む）。label の UTF-16 インデックス（input の selectionStart と同じ単位）
  end: number // 範囲の末尾（含まない）
  bold?: boolean
  color?: string
}

export interface MindmapNodeData extends Record<string, unknown> {
  label: string
  color: NodeColor
  isRoot?: boolean
  depth?: number
  memo?: string
  borderWidth?: number
  sizeScale?: number
  borderRadius?: number
  isCircle?: boolean
  // 文字だけのノード（ロジックツリーの中心テーマ以外）に枠線を表示するか。未指定＝表示しない
  showBorder?: boolean
  // ノードに付けた画像（文字の上に表示する）。path はストレージ上の保存先、width/height は表示サイズ
  image?: NodeImage
  // 文字の太字・色。bold / textColor はノード全体、labelStyles は文字の一部分だけの装飾（こちらが優先）
  bold?: boolean
  textColor?: string
  labelStyles?: LabelSpan[]
}

export interface NodeImage {
  path: string
  width: number
  height: number
}

// クリップボードから貼り付けた画像ノード（マインドマップのツリー構造には属さない自由配置要素）
// 表示サイズはnode.style.width/heightで管理する（NodeResizeControlがそのまま更新できるようにするため）
export interface ImageNodeData extends Record<string, unknown> {
  path: string
  rotation?: number
}

export type AnyNodeData = MindmapNodeData | ImageNodeData
