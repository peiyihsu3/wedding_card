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
function random(seed) {
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
