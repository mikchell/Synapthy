// ロジックツリーのノードサイズ（小・中・大）。data.sizeScale に倍率として保存する
export const NODE_SIZE_STEPS = [
  { label: '小', scale: 0.8 },
  { label: '中', scale: 1 },
  { label: '大', scale: 1.3 },
] as const
