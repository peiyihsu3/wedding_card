// 手繪感線條：把向量路徑沿線取點，再沿法線方向加上平滑、不規則的小抖動，
// 邊緣就會像用筆畫出來的，而不是完美的幾何曲線。只在載入時算一次，之後就是一般的 path，不影響動畫效能。

const NS = 'http://www.w3.org/2000/svg'
let host = null

// 量路徑長度要用瀏覽器的 SVGPathElement，放在一個看不見的 svg 裡。
// 每次都建新的 path：重複使用同一個元素只改 d 的話，Chrome 有時會沿用上一個形狀
function measure(d) {
  if (!host) {
    host = document.createElementNS(NS, 'svg')
    host.setAttribute('width', '0')
    host.setAttribute('height', '0')
    host.setAttribute('aria-hidden', 'true')
    host.style.position = 'absolute'
    document.body.appendChild(host)
  }
  const path = document.createElementNS(NS, 'path')
  path.setAttribute('d', d)
  host.appendChild(path)
  return path
}

// 固定種子的亂數，每次載入畫出來的線都一樣
export function random(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 幾個不同波長的正弦波疊加：長波讓線條微微起伏，短波帶出筆觸的小顫動
function wobble(length, { amp, wavelength, seed, closed }) {
  const rand = random(seed)
  const waves = [
    [1, 0.6],
    [0.37, 0.28],
    [0.13, 0.12],
  ].map(([ratio, weight]) => {
    let len = wavelength * ratio * (0.8 + rand() * 0.4)
    // 封閉路徑讓波長剛好整除周長，起點與終點才接得起來
    if (closed) len = length / (2 * Math.PI * Math.max(1, Math.round(length / (2 * Math.PI * len))))
    return { len, phase: rand() * Math.PI * 2, amp: amp * weight }
  })
  return (s) => waves.reduce((sum, w) => sum + w.amp * Math.sin(s / w.len + w.phase), 0)
}

// 沿路徑取點並加上抖動，回傳點的陣列 [[x, y], ...]；要把幾段線自己接成一個形狀時用
// taper：兩端這段長度內抖動漸漸收到 0，幾段線接在一起時接縫才不會錯開
export function sketchPoints(d, { step = 8, amp = 3, wavelength = 140, seed = 1, taper = 0 } = {}) {
  const closed = /z\s*$/i.test(d)
  const path = measure(d)
  const length = path.getTotalLength()
  const count = Math.max(2, Math.round(length / step))
  const raw = Array.from({ length: closed ? count : count + 1 }, (_, i) => {
    const p = path.getPointAtLength((i / count) * length)
    return [p.x, p.y]
  })
  path.remove()
  const offset = wobble(length, { amp, wavelength, seed, closed })
  const last = raw.length - 1
  return raw.map(([x, y], i) => {
    const prev = raw[closed ? (i + last) % raw.length : Math.max(0, i - 1)]
    const next = raw[closed ? (i + 1) % raw.length : Math.min(last, i + 1)]
    const tx = next[0] - prev[0]
    const ty = next[1] - prev[1]
    const n = Math.hypot(tx, ty) || 1
    const s = (i / count) * length
    const t = taper ? Math.min(1, s / taper, (length - s) / taper) : 1
    const o = offset(s) * t * t * (3 - 2 * t)
    return [x - (ty / n) * o, y + (tx / n) * o]
  })
}

const fmt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`

// 一般形狀（封閉或開放路徑都可以）
export function sketch(d, options) {
  const points = sketchPoints(d, options)
  return `M${points.map(fmt).join('L')}${/z\s*$/i.test(d) ? 'Z' : ''}`
}

// 手繪圓角框（從 x0, y0 到 x1, y1）。拆成四段分開畫（上緣連兩個圓角、右邊、下緣連兩個圓角、左邊），左右兩邊都從上往下畫：
// 框變高時上下緣的形狀不變，左右兩邊只在下端多出一截，展開收合的動畫中邊緣才不會整圈跟著抖
export function sketchRoundRect(x0, y0, x1, y1, { radius = 0, seed = 1, ...options } = {}) {
  const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2)
  const edge = (d, n) => sketchPoints(d, { taper: 12, ...options, seed: seed * 10 + n })
  const points = [
    ...edge(`M${x0} ${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}`, 1),
    ...edge(`M${x1} ${y0 + r}V${y1 - r}`, 2),
    ...edge(`M${x1} ${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}`, 3),
    ...edge(`M${x0} ${y0 + r}V${y1 - r}`, 4).reverse(),
  ]
  return `M${points.map(fmt).join('L')}Z`
}

// 用剪刀剪下來的照片（0, 0 到 width, height）：四個角各自往內縮一點，每條邊在幾個地方折一下，
// 折點之間是直的，像一刀一刀剪的，不是手繪線那種圓滑的起伏。所有點都在框內，照片只會被裁掉一點邊、不會露出框外的空白。
// amp 是內縮最多幾個像素，預設照短邊的 2.5% 算（夾在 3–10px），手機的小照片才不會剪得太歪。
// radius 是四個角的圓角，預設照短邊的 4.5% 算（夾在 8–18px）：角剪成圓的，像把相片的尖角修掉
export function cutRect(width, height, { seed = 1, amp, radius } = {}) {
  const rand = random(seed)
  const a = amp ?? Math.min(10, Math.max(3, Math.min(width, height) * 0.025))
  const r = radius ?? Math.min(18, Math.max(8, Math.min(width, height) * 0.045))
  // 框的四個角（順時針）與每條邊往內的方向：上、右、下、左
  const box = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ]
  const inward = [
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 0],
  ]
  const points = []
  const corners = new Set()
  box.forEach(([x0, y0], side) => {
    const [x1, y1] = box[(side + 1) % 4]
    const [nx, ny] = inward[side]
    const [px, py] = inward[(side + 3) % 4]
    // 角：沿著這條邊和上一條邊的往內方向各縮一點
    const u = rand() * a
    const v = rand() * a
    corners.add(points.length)
    points.push([x0 + nx * u + px * v, y0 + ny * u + py * v])
    // 長邊多折幾次；折點的位置錯開，不要剛好等距
    const count = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / (90 + rand() * 60)))
    for (let i = 1; i < count; i++) {
      const t = (i + (rand() - 0.5) * 0.6) / count
      // 從框的邊（不是兩個角的連線）往內量，折點才會時而凸出、時而凹進去
      const o = rand() * a * 0.7
      points.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o])
    }
  })
  // 角：從前後兩段各退回 r（最多退到那一段的一半），中間用一段以角為控制點的弧接起來；折點還是尖的
  const n = points.length
  const back = (p, q) => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
    const t = Math.min(r, len / 2) / len
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
  }
  const d = points.map((p, i) => {
    if (!corners.has(i)) return `L${fmt(p)}`
    return `L${fmt(back(p, points[(i + n - 1) % n]))}Q${fmt(p)} ${fmt(back(p, points[(i + 1) % n]))}`
  })
  // 第一個點是左上角，從它圓角的起點開始畫
  return `M${d.join('').slice(1)}Z`
}

// 撕開的紙邊：從 x0 到 x1 的一條橫線，從 y 往下最多 depth。兩道長短不同的起伏讓紙邊微微高低不平；
// 撕口的小塊跟前一段有關聯，一小段一小段地凸出凹進，再加一點細碎的毛邊。
// 每一點各自隨機深淺的話，鋸齒太平均，像花邊剪刀剪的；也不像 sketch 的手繪線那麼圓滑。回傳開放的路徑
export function tornEdge(x0, x1, { y = 0, depth = 6, seed = 1 } = {}) {
  const rand = random(seed)
  const waves = [
    [320, 0.35],
    [90, 0.15],
  ].map(([len, weight]) => ({ len: len * (0.8 + rand() * 0.4), phase: rand() * Math.PI * 2, amp: depth * weight }))
  const swell = (x) => waves.reduce((sum, w) => sum + (w.amp * (1 + Math.sin(x / w.len + w.phase))) / 2, 0)
  let chunk = 0
  const points = []
  for (let x = x0; ; x += 2 + rand() * 6) {
    const at = Math.min(x, x1)
    chunk = chunk * 0.55 + (rand() - 0.5) * depth * 0.45
    points.push([at, swell(at) + chunk + rand() * depth * 0.12])
    if (at === x1) break
  }
  // 最高的那點貼齊 y，往下超過 depth 的削平
  const top = Math.min(...points.map((p) => p[1]))
  return `M${points.map(([px, py]) => fmt([px, y + Math.min(depth, py - top)])).join('L')}`
}

// 帶狀色塊（山、海、草坡）：只有上緣是手繪線，往下補到 bottom 封起來
// 回傳 line（描邊用的上緣）與 fill（填色用的整塊）
export function sketchBand(edge, bottom, options) {
  const points = sketchPoints(edge, options)
  const line = `M${points.map(fmt).join('L')}`
  const first = points[0]
  const last = points[points.length - 1]
  return { line, fill: `${line}L${last[0].toFixed(1)} ${bottom}L${first[0].toFixed(1)} ${bottom}Z` }
}

// 細筆觸：沿路徑畫一筆兩端收尖的細長色塊，像用筆輕輕刷過（回傳的是填色用的封閉形狀，不是描邊）
// from、to 只取路徑的其中一段（0–1），offset 把整筆往路徑的法線方向平移
export function brush(d, { width = 4, from = 0, to = 1, offset = 0, ...options } = {}) {
  const points = sketchPoints(d, options)
  const last = points.length - 1
  const part = points.slice(Math.round(from * last), Math.round(to * last) + 1)
  const n = Math.max(1, part.length - 1)
  const left = []
  const right = []
  part.forEach(([x, y], i) => {
    const prev = part[Math.max(0, i - 1)]
    const next = part[Math.min(n, i + 1)]
    const tx = next[0] - prev[0]
    const ty = next[1] - prev[1]
    const len = Math.hypot(tx, ty) || 1
    const nx = -ty / len
    const ny = tx / len
    // 中間最粗、往兩端漸細；最後一點的 sin(π) 在浮點數下可能是極小的負數，開次方會變成 NaN，先夾到 0
    const half = (width / 2) * Math.pow(Math.max(0, Math.sin((Math.PI * i) / n)), 0.6)
    left.push([x + nx * (offset + half), y + ny * (offset + half)])
    right.push([x + nx * (offset - half), y + ny * (offset - half)])
  })
  return `M${left.map(fmt).join('L')}L${right.reverse().map(fmt).join('L')}Z`
}

export function circle(cx, cy, r) {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
}

// 整條路徑等比例放大縮小（只適用全部是絕對座標的路徑，例如 sketch 畫出來的）。
// 要鋪顆粒的形狀照實際像素重畫，不用 transform 縮放，顆粒才不會跟著變大變小
export function scalePath(d, k) {
  return d.replace(/-?[\d.]+/g, (n) => (n * k).toFixed(1))
}
