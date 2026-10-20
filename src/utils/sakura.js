import { brush, circle, sketch } from './sketch.js'

// 固定的偽亂數（0–1）：位置看起來隨機，但每次載入都一樣
export function noise(i, k) {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// 一片櫻花瓣：中心在原點、長約 18，上緣中間有個小缺口；用 transform 旋轉、縮放
export const PETAL = 'M0 9C-5.5 5.5-7.5-0.5-5-5.5C-3.5-8.2-1.4-7.6 0-4.8C1.4-7.6 3.5-8.2 5-5.5C7.5-0.5 5.5 5.5 0 9Z'

const stroke = (seed, extra) => ({ step: 4, amp: 1.2, wavelength: 40, seed, ...extra })
const puffPath = ({ cx, cy, r }, seed) => sketch(circle(cx, cy, r), stroke(seed, { amp: Math.min(2, r * 0.06) }))
// 圓形靠 a 方向邊緣的一道弧（往外拱），當作那一側的陰影或亮面
const arcToward = ({ cx, cy, r }, a, seed, width) => {
  const [ux, uy] = [Math.cos(a), Math.sin(a)]
  const at = (u, v) => `${(cx + (ux * u - uy * v) * r).toFixed(1)} ${(cy + (uy * u + ux * v) * r).toFixed(1)}`
  return brush(`M${at(0.5, -0.55)}Q${at(0.98, 0)} ${at(0.5, 0.55)}`, stroke(seed, { amp: 0.6, width }))
}

// 五瓣小櫻花：五個圓繞著花心排一圈；回傳 [花瓣, 花心] 兩個路徑
function flower(x, y, r, angle) {
  const petals = Array.from({ length: 5 }, (_, k) => {
    const a = angle + (k * 2 * Math.PI) / 5
    return circle(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5)
  })
  return [petals.join(''), circle(x, y, r * 0.3)]
}

// 光從左上方照下來：亮面朝這個方向，陰影和落在草地上的影子朝反方向
const LIGHT = (-3 * Math.PI) / 4

/*
 * 從正上方往下看的一棵櫻花樹，樹冠中心在原點、半徑約 r（看不到樹幹）：中間一大團，外圈七、八團繞一圈，
 * 邊緣是一圈圓滾滾的波浪。每團朝左上的一側一道亮面、朝右下的一側一道陰影，整棵樹的影子落在右下方的草地上，
 * 上面點綴幾朵白色小櫻花。同一種顏色的形狀合成一條路徑，一棵樹只有幾個元素；顏色由外層的 --crown 等變數決定
 */
export function sakuraCanopy(seed, r = 50) {
  const n = 7 + Math.floor(noise(seed, 1) * 2)
  const turn = noise(seed, 2) * Math.PI * 2
  const ring = Array.from({ length: n }, (_, k) => {
    const a = turn + (k * 2 * Math.PI) / n + (noise(seed + k, 3) - 0.5) * 0.35
    const d = r * 0.6 * (0.9 + noise(seed + k, 4) * 0.2)
    return { cx: Math.cos(a) * d, cy: Math.sin(a) * d, r: r * 0.42 * (0.88 + noise(seed + k, 5) * 0.26) }
  })
  const puffs = [{ cx: 0, cy: 0, r: r * 0.66 }, ...ring]
  const shade = [r * 0.2, r * 0.26]
  // 外圈任意挑幾團各開一朵，中間那團再開一朵
  const flowers = puffs
    .filter((_, i) => i === 0 || noise(seed + i, 6) > 0.45)
    .map(({ cx: x, cy: y, r: pr }, i) => {
      const a = noise(seed + i, 7) * Math.PI * 2
      const d = pr * 0.45 * noise(seed + i, 8)
      return flower(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.1 * (0.8 + noise(seed + i, 9) * 0.4), noise(seed + i, 10) * Math.PI)
    })
  const facing = ({ cx, cy }) => (cx || cy ? Math.cos(Math.atan2(cy, cx) - LIGHT) : 0)
  return [
    ['tree-shadow', puffs.map((c, i) => puffPath({ ...c, cx: c.cx + shade[0], cy: c.cy + shade[1] }, seed + 40 + i)).join('')],
    ['fill-crown', puffs.map((c, i) => puffPath(c, seed + 10 + i)).join('')],
    ['brush-crown-deep', puffs.filter((c) => facing(c) < 0.3).map((c, i) => arcToward(c, LIGHT + Math.PI, seed + 20 + i, c.r * 0.16)).join('')],
    ['brush-crown-light', puffs.filter((c) => facing(c) > -0.3).map((c, i) => arcToward(c, LIGHT, seed + 30 + i, c.r * 0.13)).join('')],
    ['sakura-petal', flowers.map(([p]) => p).join('')],
    ['sakura-center', flowers.map(([, c]) => c).join('')],
  ]
}
