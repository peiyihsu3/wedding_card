import { noise } from './sakura.js'

/*
 * 剪紙風的卡通樹（照參考網站的樹畫的）：不描邊，顏色與質感由用的地方決定（首屏是漸層加顆粒）。
 * 樹冠是一圈往外鼓的小圓弧接成的波浪邊，像一朵雲；樹幹上細下粗、直直地往上長，
 * 可以畫在樹冠前面（從樹冠中間穿出來，再分出一根彎彎的樹枝），或藏在樹冠後面只露出下半截。
 * 樹冠上點一筆短短的墨色弧線，有的再長一小撮葉子
 */

const fmt = (n) => +n.toFixed(1)
const pt = ([x, y]) => `${fmt(x)} ${fmt(y)}`

// 波浪邊：沿橢圓取 bumps 個點（順時針），點和點之間接一段往外鼓的圓弧；位置與半徑都亂一點，輪廓才不會太圓
function crownPath(cx, cy, rx, ry, bumps, seed) {
  const points = Array.from({ length: bumps }, (_, i) => {
    const a = ((i + (noise(seed, i) - 0.5) * 0.4) / bumps) * Math.PI * 2
    const k = 0.92 + noise(seed + 1, i) * 0.16
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]
  })
  const arcs = points.map((from, i) => {
    const to = points[(i + 1) % bumps]
    const r = Math.hypot(to[0] - from[0], to[1] - from[1]) * (0.55 + noise(seed + 2, i) * 0.15)
    return `A${fmt(r)} ${fmt(r)} 0 0 1 ${pt(to)}`
  })
  return `M${pt(points[0])}${arcs.join('')}Z`
}

// 上細下粗的長條：from 是粗的那端。兩端接半圓，跟樹枝的圓頭一致；粗細差很小，兩側直線和半圓接起來看不出折角
function limb(from, to, w0, w1) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const [nx, ny] = [-(to[1] - from[1]) / len, (to[0] - from[0]) / len]
  const side = (p, w, s) => [p[0] + (nx * w * s) / 2, p[1] + (ny * w * s) / 2]
  const cap = (w, p) => `A${fmt(w / 2)} ${fmt(w / 2)} 0 0 0 ${pt(p)}`
  return `M${pt(side(from, w0, 1))}L${pt(side(to, w1, 1))}${cap(w1, side(to, w1, -1))}L${pt(side(from, w0, -1))}${cap(w0, side(from, w0, 1))}Z`
}

// 一片葉子：從 (x, y) 往 angle 方向長出去的橄欖形
function leaf(x, y, len, angle) {
  const [dx, dy] = [Math.cos(angle) * len, Math.sin(angle) * len]
  const [mx, my] = [x + dx / 2, y + dy / 2]
  const [px, py] = [-dy * 0.4, dx * 0.4]
  return `M${pt([x, y])}Q${pt([mx + px, my + py])} ${pt([x + dx, y + dy])}Q${pt([mx - px, my - py])} ${pt([x, y])}Z`
}

/*
 * (x, y) 是樹幹貼地的位置，樹冠中心在正上方 height 處（樹幹直立，不往旁邊斜）；
 * over：樹幹畫在樹冠前面，branch 是樹枝往哪一側長（-1 左、1 右）；leaves：葉子的片數；
 * mark：要不要點墨色短弧（擠成一叢的樹每棵都點會太多線條）
 */
export function puffyTree({ x, y, rx, ry, height, over = false, branch = 1, leaves = 0, bumps = 11, mark = true, seed = 1 }) {
  const [cx, cy] = [x, y - height]
  const w = rx * 0.2
  // 畫在前面的樹幹長到樹冠上半部；藏在後面的只要長到樹冠中間
  const top = [x, over ? cy - ry * 0.35 : cy]
  const at = (t) => [x + (top[0] - x) * t, y + (top[1] - y) * t]

  // 樹枝：從樹冠下緣附近的樹幹分出去，先往外、再彎向上
  const start = at((height - ry * 0.4) / (y - top[1]))
  const elbow = [start[0] + branch * rx * 0.42, cy - ry * 0.02]
  const tip = [elbow[0] + branch * rx * 0.04, elbow[1] - ry * 0.26]

  // 墨色短弧：樹冠上半部、樹枝的另一側，一筆往左鼓的弧線（跟樹枝同一側會疊在樹枝末端上）
  const s = rx * 0.14
  const [mx, my] = [cx - branch * rx * 0.45, cy - ry * 0.3]

  // 葉子：樹枝另一側、樹冠下半部，一小撮往外散開
  const [lx, ly] = [cx - branch * rx * 0.55, cy + ry * 0.35]
  const leafPaths = Array.from({ length: leaves }, (_, i) => {
    const a = -Math.PI / 2 + (i - (leaves - 1) / 2) * 0.55 + (noise(seed + 3, i) - 0.5) * 0.3
    const r = rx * (0.06 + noise(seed + 4, i) * 0.08)
    return leaf(lx + Math.cos(a) * r, ly + Math.sin(a) * r, rx * (0.11 + noise(seed + 5, i) * 0.04), a)
  })

  // 由後往前畫的各層；樹枝是一條線（width 是線寬），其他是填色的形狀
  const trunk = { part: 'trunk', d: limb([x, y], top, w, w * 0.55) }
  const layers = [
    ...(over ? [] : [trunk]),
    { part: 'crown', d: crownPath(cx, cy, rx, ry, bumps, seed) },
    ...(over ? [trunk] : []),
    ...(over ? [{ part: 'branch', d: `M${pt(start)}Q${pt([elbow[0], start[1] - ry * 0.05])} ${pt(elbow)}L${pt(tip)}`, width: w * 0.42 }] : []),
    ...(leaves ? [{ part: 'leaf', d: leafPaths.join('') }] : []),
  ]
  return {
    layers,
    mark: mark ? `M${pt([mx + s * 0.35, my])}Q${pt([mx - s * 0.45, my + s * 0.5])} ${pt([mx + s * 0.15, my + s * 1.15])}` : null,
  }
}
