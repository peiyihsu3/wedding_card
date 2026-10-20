<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { brush, circle, sketch, sketchBand } from '../utils/sketch.js'
import { PETAL, noise, sakuraCanopy } from '../utils/sakura.js'
import { seaMarksImage } from '../utils/seaMarks.js'
import WalkingCat from './WalkingCat.vue'

/*
 * 首屏之後一整片連續的風景，鋪在 <main> 裡四個區塊的後面：
 * 首屏的草地往下一小段就是海岸，小貓在岸邊散步（婚紗）；接著一路是海，有海鷗和白雲（資訊），
 * 回覆那一區的右側有一座小島；最後再上岸，岸上的櫻花樹越往下越多，花瓣紛飛（交通）。
 *
 * 風景照各區塊實際的位置與大小來畫（座標就是像素，原點在 <main> 的左上角）：
 * 交界都落在兩區內容之間的空白裡，樹也避開卡片、照片等內容；內容的高度變了（字型載入、表單送出）就重畫
 */
const root = ref(null)
const scene = shallowRef(null)
const wavesImage = seaMarksImage()

// 像素座標用的手繪參數
const stroke = (seed, extra) => ({ step: 6, amp: 2, wavelength: 70, seed, ...extra })
const inside = (box, x, y) => x > box.left && x < box.right && y > box.top && y < box.bottom

/* ---------- 重複使用的圖形：只畫一次，之後用 transform 擺到各處 ---------- */
let shapes = null

function getShapes() {
  if (shapes) return shapes
  const hill = (seed, extra) => ({ step: 8, amp: 3, wavelength: 130, seed, ...extra })
  const band = (d, seed) => sketchBand(d, 140, hill(seed)).fill
  const marks = (list, seed, size) =>
    list.flatMap((d, i) => [
      brush(d, hill(seed + i, { step: 6, amp: 2, wavelength: 50, width: size })),
      brush(d, hill(seed + i + 50, { step: 6, amp: 2, wavelength: 50, width: size * 0.7, from: 0.2, to: 0.75, offset: size * 1.8 })),
    ])
  shapes = {
    // 從上往下看的樹冠，半徑 50，擺放時再縮放
    trees: [0, 1, 2, 3].map((k) => sakuraCanopy(700 + k * 41)),
    // 首屏接草地的兩層山丘（座標寬 2400、高 140，跟首屏一樣以裁切方式鋪滿）
    hills: {
      back: band('M-60 64C200 34 400 32 600 56S1000 86 1200 54S1600 24 1800 50S2200 82 2460 52', 1),
      backMarks: marks(['M150 54C250 46 350 45 450 52', 'M1400 50C1500 42 1600 40 1700 48', 'M900 82C980 84 1060 80 1140 72'], 20, 4),
      front: band('M-60 92C250 68 500 66 750 86S1250 106 1500 84S2000 64 2460 88', 2),
      frontMarks: marks(['M300 90C400 82 500 81 600 86', 'M1100 112C1200 114 1300 110 1400 102', 'M1800 86C1900 80 2000 80 2100 86'], 30, 4),
    },
    // 卡通雲：幾個圓疊成底部也圓滾滾的一朵（座標 200×100）
    cloud: [
      [52, 58, 26],
      [92, 44, 34],
      [136, 52, 28],
      [166, 64, 18],
      [80, 70, 20],
      [120, 72, 20],
      [150, 72, 14],
    ]
      .map(([cx, cy, r], i) => sketch(circle(cx, cy, r), { step: 4, amp: 1.2, wavelength: 40, seed: 200 + i }))
      .join(''),
  }
  return shapes
}

/* ---------- 版面：量出各區塊與內容的位置 ---------- */
function measure() {
  const main = root.value.parentElement
  const box = main.getBoundingClientRect()
  const rel = (r) => ({
    left: Math.round(r.left - box.left),
    right: Math.round(r.right - box.left),
    top: Math.round(r.top - box.top),
    bottom: Math.round(r.bottom - box.top),
  })
  const zones = [...main.querySelectorAll(':scope > .scenic')].map((section) => {
    const own = rel(section.getBoundingClientRect())
    const kids = [...section.querySelector('.scenic__inner').children]
      .map((el) => rel(el.getBoundingClientRect()))
      .filter((r) => r.bottom > r.top)
    const content = kids.length
      ? {
          left: Math.min(...kids.map((r) => r.left)),
          right: Math.max(...kids.map((r) => r.right)),
          top: Math.min(...kids.map((r) => r.top)),
          bottom: Math.max(...kids.map((r) => r.bottom)),
        }
      : own
    return { ...own, content }
  })
  return { W: Math.round(box.width), H: Math.round(box.height), zones }
}

// 岸邊、海、岸上分開快取：表單送出只改變回覆以下的部分，上面的岸邊不用重算
const cache = {}
function cached(slot, input, fn) {
  const key = JSON.stringify(input)
  if (cache[slot]?.key !== key) cache[slot] = { key, value: fn(input) }
  return cache[slot].value
}

function draw({ W, H, zones }) {
  // 依序是岸邊（婚紗）、海（資訊）、海上的小島（回覆）、岸上的櫻花林（交通）
  const blocks = zones.map((z) => z.content)
  // 各區內容之間的空白：第 0 段在第一區內容上方，第 k 段在第 k 區內容下方
  const gaps = blocks.map((b, k) => {
    const top = k ? blocks[k - 1].bottom : 0
    return { top, bottom: b.top, h: b.top - top }
  })
  const shore = cached('shore', { W, gap: gaps[0] }, drawShore)
  const grove = cached('grove', { W, H, gap: gaps[3], block: blocks[3] }, drawGrove)
  const sea = cached('sea', { W, blocks: blocks.slice(0, 3), gaps: gaps.slice(1), shoreGull: shore.gull, bottom: grove.top }, drawSea)
  const { hillH } = shore
  return {
    W,
    shapes: getShapes(),
    // 地面和樹分成兩張 svg、中間夾著會動的小草，兩張的位置與座標一樣：最上面超出 <main> 頂端（山丘疊在首屏底部），下面到 <main> 底部
    canvas: {
      style: { top: `${-hillH}px`, height: `${H + hillH}px` },
      viewBox: `0 ${-hillH} ${W} ${H + hillH}`,
    },
    shore,
    sea,
    grove,
    // 海紋鋪滿兩道海岸之間，上下會被兩邊的草地蓋住
    waves: { top: `${shore.seaTop}px`, height: `${grove.landTop - shore.seaTop}px` },
    petals: [...shore.petals, ...sea.island.petals, ...grove.petals],
    trees: [...shore.trees, ...sea.island.trees, ...grove.trees],
    tufts: [...shore.tufts, ...grove.tufts],
    fallers: cached('fallers', { W, zone: grove.sakura, count: W >= 768 ? 40 : 22 }, drawFallers),
    style: {
      background: `linear-gradient(var(--scene-grass) ${shore.seaTop}px, var(--scene-sea) ${shore.seaTop}px ${grove.landTop}px, var(--scene-grass) ${grove.landTop}px)`,
    },
  }
}

/*
 * 草地與海的交界：一道橫跨畫面的大弧線，中間往上拱、兩側往下（y 是弧線的平均高度），
 * 只靠手繪的小抖動帶出筆觸，再描一道深色的線
 */
const arcRise = (W) => Math.min(130, Math.max(36, W * 0.1))
function arcAt(W, y) {
  const rise = arcRise(W)
  return (x) => y + rise * (0.5 - Math.sin((Math.PI * x) / W))
}
// 左右各多畫 40，手繪抖動時畫面邊緣才不會露出缺口
const edgeXs = (W) => Array.from({ length: Math.ceil((W + 80) / 16) + 1 }, (_, i) => -40 + i * 16)
const polyline = (xs, fn) => `M${xs.map((x) => `${x} ${fn(x).toFixed(1)}`).join('L')}`

/* ---------- 草地上共用的東西：櫻花樹、落花、小草 ---------- */
// 一棵櫻花樹（從上往下看的樹冠），樹冠中心在 (x, y)、半徑 r：樹冠上緣約 1.15r、影子下緣約 1.4r
const TONES = ['', 'tone-pale', 'tone-rose']
function tree(id, x, y, r) {
  const { trees } = getShapes()
  return {
    id,
    x,
    y,
    r,
    shapes: trees[Math.floor(noise(id, 6) * trees.length)],
    tone: TONES[Math.floor(noise(id, 5) * TONES.length)],
    transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(r / 50).toFixed(3)})`,
  }
}

// 地上的一片落花
const petal = (x, y, i, wide) => ({
  cls: `petal-${i % 3}`,
  transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(noise(i, 74) * 360)}) scale(${((wide ? 0.6 : 0.45) * (0.7 + noise(i, 75) * 0.5)).toFixed(2)})`,
})

// 每棵樹底下再落一圈，多半落在樹冠邊緣外、偏右下（下風處）；ok(x, y) 決定那裡落不落得下
function petalsUnder(trees, ok, wide) {
  const list = []
  for (const { id, x, y, r } of trees) {
    for (let j = 0; j < 6; j++) {
      const i = id * 7 + j
      const a = noise(i, 76) * Math.PI * 2
      const d = r * (1.05 + noise(i, 77) * 0.5)
      const px = x + Math.cos(a) * d + r * 0.15
      const py = y + Math.sin(a) * d * 0.9 + r * 0.15
      if (ok(px, py)) list.push(petal(px, py, i, wide))
    }
  }
  return list
}

/*
 * 小草：一排一排細長的橫條（圖樣寬 760，見樣式），每排各自以底部為軸左右擺，一排接一排錯開，像風吹過草地。
 * 只鋪在 from 到 to 之間整片都是草地的地方，不會長到海裡
 */
function tuftRows(from, to, gap, seed) {
  return Array.from({ length: Math.max(0, Math.floor((to - from) / gap)) }, (_, i) => ({
    top: `${Math.round(from + i * gap + (noise(i + seed, 111) - 0.5) * 16)}px`,
    backgroundPositionX: `${Math.round(noise(i + seed, 112) * 760)}px`,
    '--delay': `${(-i * 0.4).toFixed(1)}s`,
  }))
}

/* ---------- 岸邊：山丘、小貓散步的草地、海岸 ---------- */
function drawShore({ W, gap }) {
  const wide = W >= 768
  const { hills } = getShapes()
  const hillH = wide ? 96 : 72
  const xs = edgeXs(W)

  /*
   * 散步的小貓：首屏的草地往下一點，從左走到右、轉身再走回來（畫布 120×84，腳踩在 y=78）。
   * 來回一趟的秒數照路程算，手機和桌機走得一樣慢；delay 讓牠一開始就走在路中間
   */
  const catW = wide ? 116 : 80
  const catH = (catW * 84) / 120
  const feet = (wide ? 18 : 10) + catH
  const catSide = wide ? W * 0.06 : 8
  const catRun = W - catSide * 2 - catW
  const catLane = { top: feet - catH - 6, bottom: feet + 10 }
  const catTrip = (2 * catRun) / (wide ? 40 : 28)
  const cat = {
    left: `${Math.round(catSide)}px`,
    top: `${Math.round(feet - (catH * 78) / 84)}px`,
    width: `${catW}px`,
    '--run': `${Math.round(catRun)}px`,
    '--duration': `${Math.round(catTrip)}s`,
    '--delay': `${-Math.round(catTrip * 0.2)}s`,
  }

  // 海岸：小貓腳下再往下一段草地就是海，海岸最靠上的地方（畫面中間）也跟小貓隔著一段距離
  const coastAt = arcAt(W, feet + 56 + arcRise(W) / 2)
  const seaTop = Math.floor(Math.min(...xs.map(coastAt)))
  // 草地往上填到 <main> 頂端（-2 跟山丘重疊一點，接縫才不會露出細線）
  const coast = sketchBand(polyline(xs, coastAt), -2, stroke(6))

  /*
   * 櫻花樹：岸邊只在左右兩端（海岸比較低、草地比較寬的地方）、小貓散步的路下方各長一棵，被畫面邊緣切掉一點；
   * 樹的大小照那裡草地的寬窄調整，太窄就不長
   */
  const base = wide ? 56 : 32
  const trees = [
    [701, 1, (r) => W - r * 0.4],
    [702, 0.8, (r) => r * 0.5],
  ].flatMap(([id, k, xOf]) => {
    const room = (x) => [catLane.bottom + 4, coastAt(x) - 6]
    const [top, bottom] = room(xOf(base * k))
    const r = Math.min(base * k, (bottom - top) / 2.55)
    if (r < base * 0.5) return []
    const x = xOf(r)
    const [t, b] = room(x)
    return [tree(id, x, (t + b) / 2 - r * 0.125, r)]
  })

  // 地上的落花：岸邊的草地上零零落落，樹底下再多一圈
  const onGrass = (x, y) => y > 4 && y < coastAt(x) - 4
  const petals = []
  const tries = Math.round((W * seaTop) / (wide ? 7000 : 3500))
  for (let i = 0; i < tries; i++) {
    const x = noise(i, 71) * W
    const y = noise(i, 72) * (seaTop + arcRise(W))
    if (noise(i, 73) > 0.55 || !onGrass(x, y)) continue
    petals.push(petal(x, y, i, wide))
  }
  petals.push(...petalsUnder(trees, onGrass, wide))

  // 岸邊下方那隻海鷗：飛在海岸往下一段的海面上，不會碰到婚紗的標題
  const xGull = W * (wide ? 0.4 : 0.3) + (wide ? 276 : 146)
  const yFrom = coastAt(W * (wide ? 0.4 : 0.3)) - (wide ? 14 : 9)
  const drop = Math.min(wide ? 170 : 118, gap.bottom - (wide ? 48 : 32) - yFrom)

  return {
    hillH,
    hills: { ...hills, transform: hillTransform(W, hillH) },
    seaTop,
    grass: coast.fill,
    coast: coast.line,
    cat,
    trees: trees.sort((a, b) => a.y - b.y),
    petals,
    tufts: tuftRows(10, seaTop - 24, wide ? 58 : 46, 0),
    gull: { x: xGull, y: yFrom + drop * 0.8 },
  }
}

// 山丘畫布（2400×140）鋪滿寬度、下緣對齊 <main> 頂端，跟原本 xMidYMax slice 的效果一樣
function hillTransform(W, hillH) {
  const s = Math.max(W / 2400, hillH / 140)
  return `translate(${((W - 2400 * s) / 2).toFixed(1)} ${(-140 * s).toFixed(1)}) scale(${s.toFixed(4)})`
}

/* ---------- 海：海鷗、白雲、回覆右側的小島 ---------- */
function drawSea({ W, blocks: [gallery, info, rsvp], gaps: [gap1, gap2, gap3], shoreGull, bottom }) {
  const wide = W >= 768
  const island = drawIsland(W, rsvp, gap2)

  // 海鷗與海上的白雲（影子落在海面上）；sprite 以中心點定位
  const at = (x, y, w, extra = {}) => ({ left: `${(x - w / 2).toFixed(0)}px`, top: `${(y - w / 2).toFixed(0)}px`, width: `${w}px`, ...extra })
  const gullSize = wide ? 76 : 52
  const cloudSize = wide ? 170 : 110
  // 一群海鷗：帶頭的最大，其他的散在旁邊、有大有小；位置以海鷗的大小為單位，(x, y) 大約是整群的中心，k 是整群的縮放
  const flock = (x, y, n, k = 1) =>
    [
      [0, -0.3, 1.15],
      [-1.05, 0.2, 0.8],
      [0.95, 0.15, 0.9],
      [-0.3, 0.75, 0.6],
      [1.8, -0.5, 0.55],
    ]
      .slice(0, n)
      .map(([u, v, s]) => [x + u * gullSize * k, y + v * gullSize * k, s * k])
  // 回覆下方、上岸之前的那一段海
  const last = { top: gap3.top, h: bottom - gap3.top }
  const gulls = [
    ...flock(shoreGull.x, shoreGull.y, 3),
    [W * 0.8, gap1.top + gap1.h * 0.3, 0.9],
    // 資訊與回覆之間：小島在右邊，海鷗飛在左邊
    [W * 0.16, gap2.top + gap2.h * 0.4, 1],
    [W * 0.14, last.top + last.h * 0.5, 0.9],
  ]
  const clouds = [
    [W * (wide ? 0.2 : 0.26), gap1.top + gap1.h * 0.62, cloudSize],
    [W * (wide ? 0.82 : 0.76), last.top + last.h * 0.45, cloudSize * 0.9],
  ]
  // 寬螢幕：內容兩側露出一大片海，沿著三區的內容再放幾隻海鷗和幾朵雲，左右錯開，也避開小島；
  // 婚紗旁邊不放雲，改成標題左邊一群海鷗，兩側的海比較窄時整群縮小，才不會飛進照片裡
  const side = rsvp.left
  if (side > 150) {
    const along = (b, t) => b.top + (b.bottom - b.top) * t
    const L = (u) => side * u
    const R = (u) => W - side * u
    gulls.push(
      ...flock(L(0.45), along(gallery, 0.05), 5, Math.min(1, side / 300)),
      [R(0.45), along(info, 0.25), 1.1],
      [L(0.6), along(info, 0.7), 0.85],
      [L(0.45), along(rsvp, 0.55), 1],
      [R(0.5), along(rsvp, 0.62), 0.8],
    )
    clouds.push([L(0.5), along(rsvp, 0.22), 160], [R(0.5), along(rsvp, 0.85), 170])
    // 小島擺到表單右邊時，資訊與回覆之間的右側空出來，補一朵雲
    if (island.beside) clouds.push([W * 0.8, gap2.top + gap2.h * 0.35, 150])
  }

  return {
    island,
    gulls: gulls.map(([x, y, k], i) =>
      at(x, y, gullSize * k, { '--delay': `${(-noise(i, 91) * 3).toFixed(1)}s`, '--drift': `${(5 + noise(i, 92) * 3).toFixed(1)}s` }),
    ),
    clouds: clouds.map(([x, y, w], i) => at(x, y, w, { '--duration': `${5 + (i % 4) * 1.3}s`, '--delay': `${-i * 1.7}s` })),
  }
}

/*
 * 回覆這一區右側海上的小島：從正上方看是一塊圓胖的草地，外圈一圈沙灘，沙灘外描一道深色的線（跟海岸一樣），
 * 海面上落著島的影子、周圍斷斷續續一圈白色浪花；島上兩棵櫻花樹、幾叢小草和落花。
 * 表單右邊露出的海夠寬（寬螢幕）就擺在表單右邊、靠上的地方，不然擺在資訊與回覆之間的空白
 */
function drawIsland(W, form, gap) {
  const wide = W >= 768
  const w = wide ? 290 : 160
  const h = w * 0.62
  const room = W - form.right
  const beside = room > w + 70
  const cx = beside ? W - room / 2 : W - w / 2 - (wide ? 40 : 14)
  const cy = beside ? form.top + h * 0.55 : gap.top + gap.h * 0.52
  const rx = w / 2
  const ry = h / 2
  const sand = wide ? 12 : 8

  // 輪廓：橢圓的半徑隨角度起伏一點，看起來圓胖不規則；取一圈裡 from 到 to 這一段（一整圈是 0 到 1）
  const ring = (ax, ay, from = 0, to = 1, dx = 0, dy = 0) => {
    const n = Math.max(2, Math.round(48 * (to - from)))
    return Array.from({ length: n + 1 }, (_, i) => {
      const a = (from + ((to - from) * i) / n) * 2 * Math.PI
      const k = 1 + 0.08 * Math.sin(2 * a + 1.1) + 0.05 * Math.sin(3 * a + 2.3)
      return `${(cx + dx + Math.cos(a) * ax * k).toFixed(1)} ${(cy + dy + Math.sin(a) * ay * k).toFixed(1)}`
    })
  }
  const loop = (ax, ay, dx, dy, seed) => sketch(`M${ring(ax, ay, 0, 1, dx, dy).slice(1).join('L')}Z`, stroke(seed, { step: 5 }))
  // 草地比沙灘小一圈、往左上偏一點，右下方的沙灘寬一些
  const grass = { dx: -sand * 0.3, dy: -sand * 0.4, rx: rx - sand, ry: ry - sand }
  const onGrass = (x, y) => ((x - cx - grass.dx) / grass.rx) ** 2 + ((y - cy - grass.dy) / grass.ry) ** 2 < 0.8

  const foamGap = wide ? 15 : 10
  const foam = [
    [0.02, 0.18],
    [0.27, 0.43],
    [0.52, 0.66],
    [0.76, 0.93],
  ]
    .map(([from, to], i) => brush(`M${ring(rx + foamGap, ry + foamGap * 0.85, from, to).join('L')}`, stroke(410 + i, { width: wide ? 3 : 2.4, amp: 1 })))
    .join('')

  // 草地上兩筆淺色筆觸，和三叢小草（跟會動的那排小草同一種畫法：草根在下、三片草葉）
  const marks = [
    [-0.2, 0.2, 0.2],
    [0.12, -0.22, 0.16],
  ]
    .map(([u, v, len], i) => {
      const x = cx + u * w
      const y = cy + v * h
      const half = (len * w) / 2
      return brush(`M${x - half} ${y}Q${x} ${y - half * 0.25} ${x + half} ${y}`, stroke(420 + i, { width: wide ? 4 : 3, amp: 0.8, wavelength: 40 }))
    })
    .join('')
  const s = wide ? 0.85 : 0.6
  const tufts = [
    [0.32, -0.25],
    [-0.33, 0.18],
    [0.02, 0.32],
  ]
    .map(([u, v]) => {
      const x = (cx + u * w).toFixed(1)
      const y = (cy + v * h).toFixed(1)
      return `M${x} ${y}m${-3 * s} 0q${-s} ${-9 * s} ${-7 * s} ${-15 * s}M${x} ${y}q0 ${-11 * s} ${2 * s} ${-19 * s}M${x} ${y}m${3 * s} 0q${2 * s} ${-8 * s} ${8 * s} ${-12 * s}`
    })
    .join('')

  const trees = [tree(801, cx - w * 0.12, cy - h * 0.12, wide ? 46 : 26), tree(802, cx + w * 0.21, cy + h * 0.08, wide ? 30 : 17)]

  return {
    beside,
    shadow: loop(rx, ry, wide ? 10 : 6, wide ? 12 : 8, 401),
    foam,
    beach: loop(rx, ry, 0, 0, 400),
    grass: loop(grass.rx, grass.ry, grass.dx, grass.dy, 402),
    marks,
    tufts,
    trees,
    petals: petalsUnder(trees, onGrass, wide),
  }
}

/* ---------- 岸上：海岸、越往下越多的櫻花樹、雲影 ---------- */
function drawGrove({ W, H, gap, block }) {
  const wide = W >= 768
  const xs = edgeXs(W)
  // 回覆與交通之間上岸：跟婚紗那裡的海岸一樣是一道大弧線，這次海在上、草地在下
  const coastAt = arcAt(W, gap.top + gap.h * 0.4)
  const top = Math.floor(Math.min(...xs.map(coastAt)))
  const landTop = Math.ceil(Math.max(...xs.map(coastAt)))
  // 草地補到整片都是草地的地方，再往下由 <main> 的背景接手
  const coast = sketchBand(polyline(xs, coastAt), landTop + 40, stroke(16))

  /*
   * 櫻花樹：把岸上的草地切成大格子，每格隨機放一棵，越往下放的機率越高，但整體疏疏落落；
   * 整棵樹連影子都要在草地上、不超出 <main> 底部（超出會把頁面撐高），樹冠中心也不能躲在內容後面
   */
  const cell = wide ? [230, 190] : [130, 120]
  const trees = []
  for (let row = 0; top + row * cell[1] < H; row++) {
    for (let col = 0; col * cell[0] < W; col++) {
      const id = row * 97 + col * 13 + 7
      const x = (col + 0.5 + (noise(id, 1) - 0.5) * 0.7) * cell[0]
      const y = top + (row + 0.5 + (noise(id, 2) - 0.5) * 0.6) * cell[1]
      const depth = Math.min(1, (y - top) / (H - top))
      if (noise(id, 3) > 0.3 + 0.45 * depth) continue
      const r = (wide ? 54 : 32) * (0.85 + noise(id, 4) * 0.3)
      if (y - r * 1.15 < coastAt(x) + 8 || y + r * 1.4 > H - 4) continue
      if (inside({ left: block.left - r * 0.35, right: block.right + r * 0.35, top: block.top - r * 0.35, bottom: block.bottom + r * 0.35 }, x, y)) continue
      trees.push(tree(id, x, y, r))
    }
  }

  // 地上的落花，越往下越多；每棵樹底下再落一圈
  const onGrass = (x, y) => y > coastAt(x) + 4 && y < H - 6 && !inside(block, x, y)
  const petals = []
  const span = H - top
  const tries = Math.round((W * span) / (wide ? 9000 : 4000))
  for (let i = 0; i < tries; i++) {
    const k = i + 3000
    const x = noise(k, 71) * W
    const y = top + noise(k, 72) * span
    if (noise(k, 73) > (0.3 + (0.7 * (y - top)) / span) ** 1.5 || !onGrass(x, y)) continue
    petals.push(petal(x, y, k, wide))
  }
  petals.push(...petalsUnder(trees, onGrass, wide))

  /*
   * 白雲的影子：雲朵形狀的深綠色影子，從畫面左外側慢慢飄到右外側，一邊飄一邊上下起伏；只在岸上，不會飄到海上。
   * 上岸的地方一朵大的、內容中間一朵、內容下方一朵小的，一左一右錯開。
   * 飄過整段（兩個畫面寬加自己的寬度）的秒數照速度算，手機和桌機看起來一樣慢，大的飄得慢一點；
   * left 是一開始（和減少動態效果時）的位置，delay 換算成剛好從那裡開始飄
   */
  const slots = [
    // [上緣的高度, 一開始的水平位置（畫面寬的比例）, 大小]
    [landTop + 16, 0.56, 1.6],
    [block.top + (block.bottom - block.top) * 0.4, 0.1, 1],
    [block.bottom + 16, 0.62, 0.5],
  ]
  const shadows = slots.map(([y, u, k], i) => {
    const size = k * (0.9 + noise(i, 121) * 0.2)
    const w = (wide ? 280 : 150) * size
    const h = (w * 62) / 170
    const duration = (2 * W + w) / ((wide ? 15 : 7) * (1.25 - size * 0.25))
    const rise = (wide ? 36 : 18) * (0.6 + noise(i, 126) * 0.6)
    // 連同上下起伏，影子都不能超出 <main> 底部
    const top = Math.min(y, H - h - rise - 6)
    return {
      top: `${Math.round(top)}px`,
      left: `${Math.round(u * W)}px`,
      width: `${Math.round(w)}px`,
      '--duration': `${Math.round(duration)}s`,
      '--delay': `${-Math.round((duration * (W + w)) / (2 * W + w))}s`,
      '--rise': `${Math.round(rise)}px`,
      '--wander': `${(9 + noise(i, 127) * 7).toFixed(1)}s`,
    }
  })

  return {
    top,
    landTop,
    grass: coast.fill,
    coast: coast.line,
    trees: trees.sort((a, b) => a.y - b.y),
    petals,
    tufts: tuftRows(landTop + 12, H - 30, wide ? 58 : 46, 500),
    shadows,
    // 落花飄的範圍：從海岸到 <main> 底部，底下留一段讓花瓣淡出，不會落到頁面外面
    sakura: { top, bottom: H - 80 },
  }
}

/* ---------- 量版面、重畫 ---------- */
let observer = null
let timer = 0
let lastKey = ''

function update() {
  const layout = measure()
  const key = JSON.stringify(layout)
  if (key === lastKey) return
  lastKey = key
  scene.value = draw(layout)
}

// 內容高度變動（字型載入、表單切換）時常常連續變好幾次，等停下來再重畫
function schedule() {
  clearTimeout(timer)
  timer = setTimeout(update, 120)
}

onMounted(() => {
  update()
  observer = new ResizeObserver(schedule)
  observer.observe(root.value.parentElement)
  document.fonts?.ready.then(schedule)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(timer)
})

/*
 * 櫻花林裡紛飛的花瓣：被風吹著一邊往下落、一邊往右飄（wind 是落完整段時往右飄的距離），
 * 起點從畫面左外側排到右邊，飄進來的花瓣才會鋪滿整個寬度。
 * 位置、大小、速度用固定的偽亂數打散，大的離畫面近、落得快一點。
 * 落完整段範圍（drop）的秒數照範圍高度算，速度才一致；rest 是減少動態效果時停住的高度
 */
function drawFallers({ W, zone: { top, bottom }, count }) {
  const h = bottom - top
  const wind = W >= 768 ? 240 : 110
  return Array.from({ length: count }, (_, i) => {
    const size = 10 + noise(i, 41) * 9
    return {
      cls: `petal-${i % 3}`,
      style: {
        top: `${top}px`,
        left: `${Math.round(-wind + ((i + noise(i, 42)) / count) * (W + wind))}px`,
        '--drop': `${h}px`,
        '--wind': `${Math.round(wind * (0.7 + noise(i, 48) * 0.6))}px`,
        '--size': `${size.toFixed(1)}px`,
        '--fall': `${(h / 40 - size * 0.4).toFixed(1)}s`,
        '--sway': `${(3 + noise(i, 43) * 2).toFixed(1)}s`,
        '--spin': `${(2 + noise(i, 44) * 2).toFixed(1)}s`,
        '--delay': `${(-noise(i, 45) * 30).toFixed(1)}s`,
        '--rest': `${Math.round(noise(i, 46) * 0.9 * h)}px`,
        '--tilt': `${(noise(i, 47) * 360).toFixed(0)}deg`,
      },
    }
  })
}
</script>

<template>
  <div ref="root" class="journey" aria-hidden="true" :style="scene?.style">
    <template v-if="scene">
      <!-- 海紋：深藍色的斜短線慢慢往左流；上下會被兩道海岸的草地蓋住 -->
      <div class="journey__waves" :style="scene.waves">
        <div class="journey__waves-flow" :style="{ backgroundImage: wavesImage }"></div>
      </div>

      <!-- 地面：首屏接下來的岸邊、海上的小島、上岸後的草地；最上面超出 <main> 頂端，疊在首屏底部 -->
      <svg class="journey__land" :style="scene.canvas.style" :viewBox="scene.canvas.viewBox" preserveAspectRatio="none">
        <g :transform="scene.shore.hills.transform">
          <path class="fill-grass-deep" :d="scene.shore.hills.back" />
          <path v-for="(d, i) in scene.shore.hills.backMarks" :key="`hb${i}`" class="brush-grass-mid" :d="d" />
          <path class="fill-grass" :d="scene.shore.hills.front" />
          <path v-for="(d, i) in scene.shore.hills.frontMarks" :key="`hf${i}`" class="brush-grass-light" :d="d" />
        </g>

        <path class="fill-grass" :d="scene.shore.grass" />
        <path class="journey__edge" :d="scene.shore.coast" />

        <!-- 小島：海面上的影子、浪花，沙灘描一道深色的線，中間是草地 -->
        <path class="journey__sea-shadow" :d="scene.sea.island.shadow" />
        <path class="journey__ripple" :d="scene.sea.island.foam" />
        <path class="fill-sand" :d="scene.sea.island.beach" />
        <path class="journey__edge" :d="scene.sea.island.beach" />
        <path class="fill-grass" :d="scene.sea.island.grass" />
        <path class="brush-grass-light" :d="scene.sea.island.marks" />
        <path class="journey__tuft" :d="scene.sea.island.tufts" />

        <path class="fill-grass" :d="scene.grove.grass" />
        <path class="journey__edge" :d="scene.grove.coast" />

        <path v-for="(p, i) in scene.petals" :key="`p${i}`" :class="p.cls" :d="PETAL" :transform="p.transform" />
      </svg>

      <!-- 白雲飄過草地的影子：外層往右飄、內層上下起伏，合起來是一道彎彎的路線；雲朵的形狀壓扁一點，像從斜上方照下來 -->
      <div v-for="(style, i) in scene.grove.shadows" :key="`cs${i}`" class="journey__cloud-shade" :style="style">
        <svg class="journey__cloud-shade-body" viewBox="20 6 170 90" preserveAspectRatio="none">
          <path :d="scene.shapes.cloud" />
        </svg>
      </div>

      <!-- 會左右擺的小草，夾在地面和樹之間 -->
      <div class="journey__tufts">
        <div v-for="(style, i) in scene.tufts" :key="i" class="journey__tuft-row" :style="style"></div>
      </div>

      <!-- 在岸邊散步的小貓，走在樹冠底下 -->
      <WalkingCat class="journey__cat" :style="scene.shore.cat" />

      <!-- 櫻花樹由上往下畫，下面的才會擋住上面的 -->
      <svg class="journey__land" :style="scene.canvas.style" :viewBox="scene.canvas.viewBox" preserveAspectRatio="none">
        <g v-for="(item, i) in scene.trees" :key="`t${i}`" :class="item.tone" :transform="item.transform">
          <path v-for="([cls, d], j) in item.shapes" :key="j" :class="cls" :d="d" />
        </g>
      </svg>

      <svg v-for="(style, i) in scene.sea.clouds" :key="`c${i}`" class="journey__cloud" :style="style" viewBox="0 0 220 170">
        <ellipse class="journey__cloud-shadow" cx="112" cy="150" rx="74" ry="9" />
        <g class="journey__cloud-hover">
          <path class="fill-cloud" :d="scene.shapes.cloud" />
        </g>
      </svg>

      <svg v-for="(style, i) in scene.sea.gulls" :key="`g${i}`" class="journey__gull" :style="style" viewBox="0 0 60 50">
        <ellipse class="journey__gull-shadow" cx="30" cy="46" rx="10" ry="2.5" />
        <g class="journey__gull-body">
          <g class="journey__gull-wings">
            <path class="gull-white" d="M29 16C24 8 14 5 3 8C11 9 19 13 25 19ZM31 16C36 8 46 5 57 8C49 9 41 13 35 19Z" />
            <path class="gull-tip" d="M3 8C7 6.5 11 6 14 6.5C11 7.8 8.5 8.5 6.5 9.2ZM57 8C53 6.5 49 6 46 6.5C49 7.8 51.5 8.5 53.5 9.2Z" />
          </g>
          <ellipse class="gull-white" cx="30" cy="17" rx="5.5" ry="4" />
          <circle class="gull-white" cx="35" cy="14.5" r="3.4" />
          <path class="gull-beak" d="M38 14l4.5 1.2-4.5 1.2z" />
        </g>
      </svg>

      <!-- 櫻花林裡紛飛的花瓣：外層負責被風吹著往右下落，中層左右飄，內層翻轉 -->
      <div v-for="(f, i) in scene.fallers" :key="`f${i}`" class="journey__faller" :style="f.style">
        <div class="journey__faller-sway">
          <svg class="journey__faller-spin" viewBox="-10 -10 20 20">
            <path :class="f.cls" :d="PETAL" />
          </svg>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 鋪滿 <main>、在各區塊內容的後面；左右超出畫面的部分裁掉，上下不裁（山丘要疊到首屏底部） */
.journey {
  --crown: #f6b2c5;
  --crown-light: #fbd3de;
  --crown-deep: #ea98b0;

  position: absolute;
  z-index: 0;
  inset: 0;
  overflow-x: clip;
  pointer-events: none;
}

.journey__land {
  position: absolute;
  left: 0;
  display: block;
  width: 100%;
}

/* ---------- 草地 ---------- */
/* 一排小草：橫向重複的細長條，底部是草根 */
.journey__tufts {
  position: absolute;
  inset: 0;
}

/* 每叢三片草葉，兩叢一大一小 */
.journey__tuft-row {
  position: absolute;
  right: -40px;
  left: -40px;
  height: 26px;
  background: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='760' height='26'><g fill='none' stroke='rgba(45,110,45,0.45)' stroke-width='2.2' stroke-linecap='round'><path d='M60 24q-1-9-7-15M63 24q0-11 2-19M66 24q2-8 8-12'/><path d='M450 24q-1-7-5-11M453 24q0-9 2-15M456 24q2-6 6-9'/></g></svg>")
    0 0 / 760px 26px repeat-x;
  transform-origin: 50% 100%;
}

/* 小島上不會動的小草，跟上面那排同色 */
.journey__tuft {
  fill: none;
  stroke: rgba(45, 110, 45, 0.45);
  stroke-width: 2.2;
  stroke-linecap: round;
}

/* 雲影：跟草地深色塊同一種綠（半透明，落花從底下透出來） */
.journey__cloud-shade {
  position: absolute;
}

.journey__cloud-shade-body {
  display: block;
  width: 100%;
  aspect-ratio: 170 / 62;
  fill: rgba(40, 120, 30, 0.245);
}

.petal-0 {
  fill: #f4aac0;
}

.petal-1 {
  fill: #fff;
}

.petal-2 {
  fill: #f8c8d6;
}

/* ---------- 櫻花樹：樹冠的底色、亮面、陰影（預設值在 .journey）由外層的 tone 換 ---------- */
.tone-pale {
  --crown: #f8c4d3;
  --crown-light: #fde2ea;
  --crown-deep: #efabbf;
}

.tone-rose {
  --crown: #f19fb7;
  --crown-light: #f8c3d2;
  --crown-deep: #e2849f;
}

.fill-crown {
  fill: var(--crown);
}

.brush-crown-light {
  fill: var(--crown-light);
}

.brush-crown-deep {
  fill: var(--crown-deep);
}

.sakura-petal {
  fill: #fff;
}

.sakura-center {
  fill: #ea8aa5;
}

.tree-shadow {
  fill: rgba(40, 90, 30, 0.2);
}

/* ---------- 海岸與小島 ---------- */
/* 草地和海的交界描一道深色手繪線，跟導覽按鈕的框線同色 */
.journey__edge {
  fill: none;
  stroke: #2b2523;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fill-sand {
  fill: #f1dcaa;
}

/* 小島落在海面上的影子 */
.journey__sea-shadow {
  fill: rgba(15, 60, 130, 0.22);
}

.journey__ripple {
  fill: rgba(255, 255, 255, 0.75);
}

/* 海紋：圖樣是參考圖的 0.6 倍（814×1160 → 488×696）；比畫面多一格寬，往左平移一格就能無縫循環 */
.journey__waves {
  position: absolute;
  right: 0;
  left: 0;
  overflow: hidden;
}

.journey__waves-flow {
  position: absolute;
  inset: 0 -488.4px 0 0;
  background-size: 488.4px 696px;
}

/* ---------- 小貓、海鷗、雲 ---------- */
/* 減少動態效果時，小貓停在路的中間附近 */
.journey__cat {
  transform: translateX(calc(var(--run) * 0.4));
}

.journey__cat,
.journey__cloud,
.journey__gull,
.journey__faller {
  position: absolute;
}

.journey__cloud,
.journey__gull {
  overflow: visible;
}

.journey__cloud-shadow {
  fill: rgba(15, 60, 130, 0.18);
  transform-box: fill-box;
  transform-origin: center;
}

.gull-white {
  fill: #fff;
}

.gull-tip {
  fill: #8796a5;
}

.gull-beak {
  fill: #f5a34a;
}

.journey__gull-shadow {
  fill: rgba(15, 60, 130, 0.25);
}

.journey__gull-wings {
  transform-box: view-box;
  transform-origin: 30px 16px;
}

/* 飄落的花瓣：外層從落花範圍的頂端往下平移整段範圍的高度（--drop），就是從頂端落到底端 */
.journey__faller {
  width: var(--size);
  transform: translateY(var(--rest));
}

.journey__faller-spin {
  display: block;
  width: var(--size);
  overflow: visible;
  transform: rotate(var(--tilt));
}

@media (prefers-reduced-motion: no-preference) {
  /* 每秒約 16px，跟原本的流速差不多 */
  .journey__waves-flow {
    animation: drift 30s linear infinite;
  }

  /* 小草以草根為軸左右輕輕擺 */
  .journey__tuft-row {
    animation: grass-sway 2.2s ease-in-out var(--delay) infinite alternate;
  }

  .journey__cloud-shade {
    animation: shade-drift var(--duration) linear var(--delay) infinite;
  }

  .journey__cat {
    animation: cat-stroll var(--duration) linear var(--delay) infinite;
  }

  .journey__cloud-shade-body {
    animation: shade-wander var(--wander) ease-in-out var(--delay) infinite alternate;
  }

  .journey__cloud-hover {
    animation: hover var(--duration) ease-in-out var(--delay) infinite alternate;
  }

  .journey__cloud-shadow {
    animation: shadow-breathe var(--duration) ease-in-out var(--delay) infinite alternate;
  }

  /* 海鷗拍翅膀，同時慢慢左右滑翔 */
  .journey__gull-wings {
    animation: flap 0.7s ease-in-out var(--delay) infinite alternate;
  }

  .journey__gull-body {
    animation: glide var(--drift) ease-in-out var(--delay) infinite alternate;
  }

  .journey__faller {
    animation: faller-fall var(--fall) linear var(--delay) infinite;
  }

  .journey__faller-sway {
    animation: faller-sway var(--sway) ease-in-out var(--delay) infinite alternate;
  }

  .journey__faller-spin {
    animation: faller-spin var(--spin) ease-in-out var(--delay) infinite alternate;
  }
}

@keyframes drift {
  to {
    transform: translateX(-488.4px);
  }
}

@keyframes grass-sway {
  from {
    transform: skewX(-26deg);
  }
  to {
    transform: skewX(20deg);
  }
}

/* 從畫面左外側（多扣自己的寬度）飄到右外側，起點與終點都在畫面外，循環時不會看到影子瞬間跳回去 */
/* 上下起伏，順便微微變大變小，像雲在空中慢慢變形 */
@keyframes shade-wander {
  from {
    transform: translateY(0) scale(0.95);
  }
  to {
    transform: translateY(var(--rise)) scale(1.05);
  }
}

@keyframes shade-drift {
  from {
    transform: translateX(calc(-100vw - 100%));
  }
  to {
    transform: translateX(100vw);
  }
}

/* 小貓走到右邊盡頭，原地轉身走回左邊，再轉身 */
@keyframes cat-stroll {
  0% {
    transform: translateX(0) scaleX(1);
  }
  49% {
    transform: translateX(var(--run)) scaleX(1);
  }
  50% {
    transform: translateX(var(--run)) scaleX(-1);
  }
  99% {
    transform: translateX(0) scaleX(-1);
  }
  100% {
    transform: translateX(0) scaleX(1);
  }
}

@keyframes hover {
  from {
    transform: translateY(-6px);
  }
  to {
    transform: translateY(4px);
  }
}

@keyframes shadow-breathe {
  from {
    transform: scale(0.86);
  }
  to {
    transform: scale(1.04);
  }
}

@keyframes flap {
  to {
    transform: scaleY(0.35);
  }
}

@keyframes glide {
  from {
    transform: translate(-6px, 2px);
  }
  to {
    transform: translate(6px, -2px);
  }
}

/* 多落 48px，一路被風往右吹；剛出現和快落完時淡入淡出，從海岸冒出來、在頁面底部消失時才不突兀 */
@keyframes faller-fall {
  from {
    transform: translate(0, 0);
    opacity: 0;
  }
  6%,
  90% {
    opacity: 1;
  }
  to {
    transform: translate(var(--wind), calc(var(--drop) + 48px));
    opacity: 0;
  }
}

@keyframes faller-sway {
  from {
    transform: translateX(-20px);
  }
  to {
    transform: translateX(20px);
  }
}

@keyframes faller-spin {
  from {
    transform: rotate(var(--tilt)) scaleY(1);
  }
  to {
    transform: rotate(calc(var(--tilt) + 70deg)) scaleY(0.45);
  }
}
</style>
