/*
 * 首屏的手繪漫畫對話框（新人的名字、貓的「喵！」），快捷按鈕上的貓也用同一種框。
 * 座標是畫框的那張 svg 自己的座標
 */

const lerp = ([ax, ay], [bx, by], t) => [ax + (bx - ax) * t, ay + (by - ay) * t]
const pt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`

/*
 * 手繪漫畫的對話框：圓角很大的四邊形，四個角的圓弧大小不一（尖角那一側的下角最小，留位置給尖角），
 * 上、左、右三邊微微往外鼓，上緣再歪一點。下緣在 base 兩點之間開口接到尖角 tip，
 * 尖角的兩邊都往下彎：先往下掉、再勾向本人，像一根彎彎的刺
 */
export function bubblePath(cx, cy, w, h, tilt, [b1, b2], tip) {
  const [x0, x1, y0, y1] = [cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2]
  // 依序是左上、右上、右下、左下（順時針）
  const corners = [
    [x0, y0 + tilt],
    [x1, y0 - tilt],
    [x1, y1],
    [x0, y1],
  ]
  const radii = ((b1 + b2) / 2 > cx ? [0.4, 0.34, 0.22, 0.36] : [0.34, 0.4, 0.36, 0.22]).map((k) => k * h)
  // 每個角的圓弧從前一邊上距離角 r 的點開始，到下一邊上距離角 r 的點結束
  const toward = (from, to, r) => lerp(from, to, r / Math.hypot(to[0] - from[0], to[1] - from[1]))
  const enter = (i) => toward(corners[i], corners[(i + 3) % 4], radii[i])
  const leave = (i) => toward(corners[i], corners[(i + 1) % 4], radii[i])

  // 從右往左走下緣：右邊的基點先接到尖角，再回到左邊的基點
  const tail = `L${pt([b2, y1])}${bubbleTail([b1, y1], [b2, y1], tip)}`

  let d = `M${pt(leave(0))}`
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4
    if (i === 2) {
      d += `${tail}L${pt(enter(next))}`
    } else {
      // 邊往外鼓：控制點在邊的中點往外推（順時針走，外側是行進方向往左轉 90 度）
      const [a, b] = [leave(i), enter(next)]
      const [ux, uy] = [b[0] - a[0], b[1] - a[1]]
      const n = Math.hypot(ux, uy)
      const [mx, my] = lerp(a, b, 0.5)
      d += `Q${pt([mx + (uy / n) * h * 0.1, my - (ux / n) * h * 0.1])} ${pt(b)}`
    }
    d += `Q${pt(corners[next])} ${pt(leave(next))}`
  }
  return `${d}Z`
}

/*
 * 對話框的尖角：從右邊的基點（目前所在的點）接到尖角，再回到左邊的基點。
 * 兩邊都往下彎（彎的方向取跟尖角方向垂直、朝下的那一側），外側（尖角背對本人的那一側）那條彎得多一點
 */
function bubbleTail(left, right, tip) {
  const mid = lerp(left, right, 0.5)
  const [dx, dy] = [tip[0] - mid[0], tip[1] - mid[1]]
  const len = Math.hypot(dx, dy)
  const sign = dx >= 0 ? 1 : -1
  const bow = [(-dy / len) * sign, (dx / len) * sign]
  const bend = (from, k) => {
    const [mx, my] = lerp(from, tip, 0.5)
    return [mx + bow[0] * len * k, my + bow[1] * len * k]
  }
  const [outer, inner] = [0.2, 0.12]
  return (
    `Q${pt(bend(right, sign > 0 ? inner : outer))} ${pt(tip)}` + `Q${pt(bend(left, sign > 0 ? outer : inner))} ${pt(left)}`
  )
}

// 圓圓的對話框（貓的）：一個橢圓，下緣在 a1、a2 兩個角度（度，往下是 90）之間開口接到尖角
export function roundBubblePath(cx, cy, rx, ry, [a1, a2], tip) {
  const at = (deg) => [cx + rx * Math.cos((deg * Math.PI) / 180), cy + ry * Math.sin((deg * Math.PI) / 180)]
  const [left, right] = [at(a1), at(a2)]
  // 從左邊的基點順時針繞過上緣到右邊的基點（大弧），再接尖角
  return `M${pt(left)}A${rx} ${ry} 0 1 1 ${pt(right)}${bubbleTail(left, right, tip)}Z`
}
