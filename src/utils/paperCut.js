// 小剪紙（參考 ITO FARM 的裝飾）：不規則的圓片、愛心、五道短條拼成的星星。
// 每片照實際的像素大小畫（size 是大約的直徑），中心在 (c, c)；亂數用固定種子，每次載入都一樣。
// 不描邊，填色後再鋪一層顆粒，跟風景的色塊同一種質感
import { random } from './sketch.js'

const fmt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`
const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]

// 圓片：繞一圈取幾個半徑長短不一的點，壓扁一點，再從每兩點的中間用弧接起來，邊緣圓圓的、不規則
export function blob(size, c, seed) {
  const rand = random(seed)
  const n = 7
  const squash = 0.7 + rand() * 0.25
  const points = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5
    const r = (size / 2) * (0.8 + rand() * 0.25)
    return [c + Math.cos(a) * r, c + Math.sin(a) * r * squash]
  })
  const d = points.map((p, i) => `Q${fmt(p)} ${fmt(mid(p, points[(i + 1) % n]))}`)
  return `M${fmt(mid(points[n - 1], points[0]))}${d.join('')}Z`
}

// 愛心：一刀一刀剪出來的，邊是直的、角是尖的；每個點抖一點，兩邊不會一樣大
const HEART = [
  [0, 0.9],
  [-0.5, 0.38],
  [-0.86, -0.05],
  [-0.82, -0.5],
  [-0.5, -0.78],
  [-0.14, -0.62],
  [0, -0.38],
  [0.16, -0.66],
  [0.52, -0.8],
  [0.84, -0.48],
  [0.86, -0.04],
  [0.52, 0.36],
]

export function heart(size, c, seed) {
  const rand = random(seed)
  const s = size / 2
  const points = HEART.map(([x, y]) => [c + (x + (rand() - 0.5) * 0.12) * s, c + (y + (rand() - 0.5) * 0.12) * s])
  return `M${points.map(fmt).join('L')}Z`
}

// 星星：五道短條從中心往外放射，中間留空；每條粗細、長短、角度都差一點，兩側在中段各折一下，像手剪的紙條。
// 每條的繞向一樣，靠近中心萬一碰在一起也不會挖出洞
export function sparkle(size, c, seed) {
  const rand = random(seed)
  let d = ''
  for (let j = 0; j < 5; j++) {
    const a = (j / 5) * Math.PI * 2 + (rand() - 0.5) * 0.4
    const r0 = size * (0.12 + rand() * 0.05)
    const r1 = size * (0.36 + rand() * 0.12)
    const w0 = size * (0.05 + rand() * 0.025)
    const w1 = size * (0.03 + rand() * 0.025)
    const rm = (r0 + r1) / 2
    const wm = (w0 + w1) / 2
    const [ux, uy] = [Math.cos(a), Math.sin(a)]
    const at = (r, w) => [c + ux * r - uy * w, c + uy * r + ux * w]
    const side = [at(r0, -w0), at(rm, -wm * (0.85 + rand() * 0.3)), at(r1, -w1), at(r1, w1), at(rm, wm * (0.85 + rand() * 0.3)), at(r0, w0)]
    d += `M${side.map(fmt).join('L')}Z`
  }
  return d
}
