// シート・フォルダの型。ホーム画面・編集画面・認証・lib から使うので、features の外に置く

import type { Edge, Node } from '@xyflow/react'
import type { AnyNodeData } from './mindmap'

export type MapType = 'linear' | 'free'

export interface Sheet {
  id: string
  name: string
  mapType?: MapType
  nodes: Node<AnyNodeData>[]
  edges: Edge[]
  // ノードの中身（nodes / edges）を読み込んでいるか。false のシートは中身が空で、DB に書き込んではいけない
  // （初回ロードでは、軽い項目だけを取得し、中身はシートを開くときに取得する）。未設定は読み込み済みとして扱う
  loaded?: boolean
  // ホームのカードに表示する画像のストレージ上のパス。未設定ならシートごとのパステルカラー
  thumbnailPath?: string | null
  // このシートの線の色（edgeColor.ts のパレットのいずれか）。未設定ならテーマの色
  lineColor?: string | null
  isStarred: boolean
  deletedAt: string | null
  lastOpenedAt: string
  updatedAt: string
  folderId: string | null
}

export interface Folder {
  id: string
  name: string
}
