<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { sketchBand, tornEdge } from '../utils/sketch.js'
import { PETAL, noise } from '../utils/sakura.js'
import { seaMarksImage } from '../utils/seaMarks.js'
import { puffyTree } from '../utils/puffyTree.js'
import { GRAIN_SIZE, grainDot, grainImage } from '../utils/grain.js'
import SeaGull from './SeaGull.vue'

/*
 * 首屏之後一整片連續的風景，鋪在 <main> 裡四個區塊的後面：
 * 先是婚紗那一區一張滿版的奶油白紙；紙在婚紗與資訊之間結束，下緣是一道往下垂的手繪弧線，蓋在海上，
 * 接著一路是海，回覆那一段有海鷗；最後上岸，
 * 櫻花樹越往下越多，花瓣紛飛（交通）。
 * 跟首屏一樣是噴槍畫的質感：草地、海、樹都是同色系的漸層加一層顆粒（漸層與顆粒圖樣在 PaintDefs），不描邊；
 * 婚紗的紙平塗一個顏色，再鋪一層淡顆粒。
 *
 * 風景照各區塊實際的位置與大小來畫（座標就是像素，原點在 <main> 的左上角）：
 * 交界都落在兩區內容之間的空白裡，樹也避開卡片、照片等內容；內容的高度變了（字型載入、表單送出）就重畫。
 * 只有交通的常見問題展開（標了 data-stretch 的元素）不重畫：照收合時的版面畫，內容下方的樹、落花
 * 再整片往下移撐開的高度（--stretch），樹才不會因為展開收合換位置
 */
const root = ref(null)
const scene = shallowRef(null)
const wavesImage = seaMarksImage()
// 海和最下面的草地是 <main> 的背景，顆粒用同一張雜訊圖鋪成 CSS 背景（svg 裡的色塊用 paint-grain，大小一樣）
const grainUrl = `url(${grainImage()})`

// 像素座標用的手繪參數
const stroke = (seed, extra) => ({ step: 6, amp: 2, wavelength: 70, seed, ...extra })
const inside = (box, x, y) => x > box.left && x < box.right && y > box.top && y < box.bottom

/* ---------- 版面：量出各區塊與內容的位置 ---------- */
/*
 * 常見問題現在展開撐開的高度。常見問題整欄標了 data-stretch-column：
 * 一欄排的時候展開多高就撐開多高；跟地圖左右並排時（上緣對齊的那一欄），要先長得比地圖那欄高才會把版面撐開
 */
const heightOf = (el) => el.getBoundingClientRect().height
function stretchOf(main) {
  return [...main.querySelectorAll('[data-stretch-column]')].reduce((sum, column) => {
    const own = column.getBoundingClientRect()
    const open = [...column.querySelectorAll('[data-stretch]')].reduce((s, el) => s + heightOf(el), 0)
    const beside = [...column.parentElement.children]
      .filter((el) => el !== column)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => Math.abs(r.top - own.top) < 1)
      .map((r) => r.bottom)
    return sum + Math.max(0, own.bottom - Math.max(own.bottom - open, ...beside))
  }, 0)
}

function measure() {
  const main = root.value.parentElement
  const box = main.getBoundingClientRect()
  // 常見問題在最後一區（交通），那一區的底部和 <main> 的底部扣掉撐開的高度，量出收合時的版面；先扣再四捨五入，展開前後才會量出一樣的數字
  const stretch = stretchOf(main)
  const rel = (r, less = 0) => ({
    left: Math.round(r.left - box.left),
    right: Math.round(r.right - box.left),
    top: Math.round(r.top - box.top),
    bottom: Math.round(r.bottom - box.top - less),
  })
  const sections = [...main.querySelectorAll(':scope > .scenic')]
  const zones = sections.map((section, i) => {
    const less = i === sections.length - 1 ? stretch : 0
    const own = rel(section.getBoundingClientRect(), less)
    const kids = [...section.querySelector('.scenic__inner').children]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.height > 0)
    const content = kids.length
      ? rel(
          {
            left: Math.min(...kids.map((r) => r.left)),
            right: Math.max(...kids.map((r) => r.right)),
            top: Math.min(...kids.map((r) => r.top)),
            bottom: Math.max(...kids.map((r) => r.bottom)),
          },
          less,
        )
      : own
    return { ...own, content }
  })
  return { W: Math.round(box.width), H: Math.round(box.height - stretch), zones, stretch }
}

// 婚紗的紙、海、岸上分開快取：表單送出只改變回覆以下的部分，上面的紙不用重算
const cache = {}
function cached(slot, input, fn) {
  const key = JSON.stringify(input)
  if (cache[slot]?.key !== key) cache[slot] = { key, value: fn(input) }
  return cache[slot].value
}

function draw({ W, H, zones }) {
  // 依序是紙（婚紗）、海（資訊）、海（回覆）、岸上的櫻花林（交通）
  const blocks = zones.map((z) => z.content)
  // 各區內容之間的空白：第 0 段在第一區內容上方，第 k 段在第 k 區內容下方
  const gaps = blocks.map((b, k) => {
    const top = k ? blocks[k - 1].bottom : 0
    return { top, bottom: b.top, h: b.top - top }
  })
  const frame = cached('frame', { W, horizon: zones[0].bottom, below: gaps[1].bottom }, drawFrame)
  const grove = cached('grove', { W, H, gap: gaps[3], block: blocks[3] }, drawGrove)
  const sea = cached('sea', { W, rsvp: blocks[2], gaps: gaps.slice(2, 4) }, drawSea)
  const { seaTop } = frame
  const { landTop } = grove
  const tile = (GRAIN_SIZE * grainDot()).toFixed(2)
  const water = seaGradient({ seaTop, horizon: zones[0].bottom, card: blocks[1], next: blocks[2].top, landTop })
  const seaBack = `${grainUrl}, linear-gradient(var(--scene-paper) ${seaTop}px, ${water.stops}, var(--scene-grass-deep) ${landTop}px)`
  return {
    W,
    // 地面和樹的幾張 svg 位置與座標都一樣，從 <main> 頂端畫到底部
    canvas: {
      style: { top: '0px', height: `${H}px` },
      viewBox: `0 0 ${W} ${H}`,
    },
    frame,
    sea,
    grove,
    // 海紋鋪滿紙的底與上岸的海岸之間，上下會被紙和草地蓋住；上面淺色那段不畫，海變藍才慢慢出現
    waves: { top: `${seaTop}px`, height: `${landTop - seaTop}px`, maskImage: water.mask },
    petals: grove.petals,
    // 交通內容下方的樹和落花另外放一張畫布，常見問題展開時整張往下移
    trees: [
      { key: 'above', trees: grove.trees },
      { key: 'below', trees: grove.below.trees, below: true },
    ],
    belowPetals: grove.below.petals,
    fallers: cached('fallers', { W, zone: grove.sakura, count: W >= 768 ? 40 : 22 }, drawFallers),
    /*
     * 海是 <main> 的背景：由上往下從淡黃變成藍，一路變到上岸的地方（seaGradient）。
     * 婚紗的紙和上岸後的草地是 svg 畫的，草地只畫到收合時的 <main> 底部；常見問題展開多出來的那段露出背景，接著草地最下面的顏色。
     * 顆粒疊在最上層；svg 的色塊不透明，蓋在上面的地方不會疊兩層顆粒（紙、草地自己鋪）。
     * 最上面撕紙邊那一段（tear）背景不畫，撕進去的缺口才露得出後面的首屏。
     * 不支援 color-mix 的舊瀏覽器整條 background-image 會失效、連海都不見：先給一個沒有 veil 的（none 佔住那一層），Vue 會留最後一個有效的
     */
    style: {
      backgroundImage: [`none, ${seaBack}`, `${water.veil}, ${seaBack}`],
      backgroundSize: `auto, ${tile}px ${tile}px, auto`,
      paddingTop: `${frame.tear}px`,
      backgroundClip: 'content-box',
    },
  }
}

/*
 * 海由上往下從淡黃變成藍，漸層拉滿整片海：從紙的下緣（horizon）到上岸（landTop，差不多就是回覆那一區的最後）。
 * 紙的下緣是淡黃，到桌曆（card）上緣變成偏白的淡米色，桌曆後面慢慢變成淡藍，
 * 到回覆（next 是回覆內容的上緣）是原本的亮藍，回覆那一段再慢慢變成海的藍，一直到岸邊。
 * 每個畫面只看得到其中一小段在變，不要擠在一小段（試過，分成好幾條色帶，太突兀）。
 * 桌曆的黃框壓在黃上會不見，桌曆上緣已經是淡米色。藍直接接黃會混成灰綠，中間墊淡米色。
 * 之前試過：金黃到藍（擠在紙和桌曆之間）、粉紅到藍、藍黃粉、藍到淺紫（再到粉紅）、藍到淡黃，換成淡黃到藍
 */
function seaGradient({ seaTop, horizon, card, next, landTop }) {
  // 淺色的那幾段：[顏色, 位置]；紙的下緣往下捲時會落後（hem-lag），從紙的底（seaTop）就開始是淡黃
  const glow = [
    ['yellow', seaTop],
    ['yellow', horizon],
    ['cream', card.top],
    ['pale', card.bottom],
  ]
  // 顆粒是整片海共用的一層背景，沒辦法只在一段調淡：淺色那段上面再蓋一層同色、55% 不透明的漸層，顆粒只透出 45%
  const veil = (name) => `color-mix(in srgb, var(--scene-sea-${name}) 55%, transparent)`
  return {
    veil: `linear-gradient(transparent ${seaTop}px, ${glow.map(([c, y]) => `${veil(c)} ${y}px`).join(', ')}, transparent ${next}px)`,
    stops: [
      ...glow.map(([c, y]) => `var(--scene-sea-${c}) ${y}px`),
      `var(--scene-sea-light) ${next}px`,
      `var(--scene-sea) ${landTop}px`,
    ].join(', '),
    // 海紋（座標從 seaTop 起算）在淺色那段不畫，桌曆上緣到回覆上緣慢慢出現；深藍的短線畫在淺色上像刮痕
    mask: `linear-gradient(transparent ${card.top - seaTop}px, #000 ${next - seaTop}px)`,
  }
}

/*
 * 海與草地的交界（上岸的海岸）：一道橫跨畫面、接近水平的平緩弧線，中間微微往上拱、兩側往下（y 是弧線的平均高度），
 * 跟首屏的海和草地一樣是比較水平的分界（原本拱得很高，像一座圓圓的山丘，已經壓平）；
 * 邊緣只帶一點手繪的小抖動，像撕開的紙邊，不描邊，靠兩邊的顏色分出交界
 */
const arcRise = (W) => Math.min(40, Math.max(14, W * 0.026))
function arcAt(W, y) {
  const rise = arcRise(W)
  return (x) => y + rise * (0.5 - Math.sin((Math.PI * x) / W))
}
// 回覆與交通之間上岸：海在上、草地在下；海岸排在中間偏上，草地只留一條空的草地和一點空白
const coastLine = (W, gap) => arcAt(W, gap.top + gap.h * 0.45)
// 左右各多畫 40，手繪抖動時畫面邊緣才不會露出缺口
const edgeXs = (W) => Array.from({ length: Math.ceil((W + 80) / 16) + 1 }, (_, i) => -40 + i * 16)
const polyline = (xs, fn) => `M${xs.map((x) => `${x} ${fn(x).toFixed(1)}`).join('L')}`

/* ---------- 草地上共用的東西：樹叢、落花 ---------- */
/*
 * 一叢樹（跟首屏右下角的樹叢同一種畫法，見 puffyTree.js）：樹冠疊得很緊、後高前低堆成一座小丘，
 * 只有前排的樹幹從樹冠底下露出一小截，後排的樹幹整根藏在後面就不畫。
 * 每個樹冠是 [水平位置, 樹冠中心離地的高度, 橫半徑, 縱半徑, 顏色]，以 r 為單位；顏色是三種顏色裡的第幾種，
 * 相鄰（疊在一起）的樹冠一定換一種，才分得出一棵棵。mark 是點墨色短弧的樹冠（一叢只點一兩筆），leaf 是長一小撮花瓣的樹冠
 */
const CLUMPS = {
  // 小叢：後面一棵、前面兩棵；上緣約在 2.5r 高、左右各約 1.4r（half、height 是連同波浪邊算的寬度的一半與高度）
  small: {
    half: 1.4,
    height: 2.6,
    crowns: [
      [0, 1.72, 0.86, 0.76, 0],
      [-0.62, 1, 0.7, 0.62, 1],
      [0.62, 0.94, 0.72, 0.64, 2],
    ],
    back: 1,
    mark: [0],
    leaf: 1,
  },
  // 大叢：中間最後面一棵最高、兩側各一棵、最前面兩棵最低，堆成一座小丘；上緣約在 2.85r 高、左右各約 1.7r。
  // 只有最後面那棵的樹幹整根藏住，兩側的樹幹從前面兩棵的外側露出一小截
  big: {
    half: 1.7,
    height: 2.95,
    crowns: [
      [0.1, 2.05, 0.9, 0.8, 0],
      [-0.85, 1.35, 0.72, 0.64, 1],
      [0.95, 1.45, 0.7, 0.62, 2],
      [-0.45, 0.85, 0.7, 0.62, 2],
      [0.5, 0.9, 0.66, 0.58, 1],
    ],
    back: 1,
    mark: [0, 4],
    leaf: 3,
  },
}
// 大多是三種粉紅的櫻花叢，偶爾一叢首屏那種薄荷綠、綠、深綠的樹
const SAKURA = ['sakura', 'sakura-pale', 'sakura-rose']
const GREENS = ['mint', 'green', 'deep']

/*
 * 樹叢的樹幹底部在 (x, y)、大小 r；左右隨機翻面。
 * 每個樹冠照實際大小畫，不用 transform 縮放：顆粒圖樣跟著座標走，縮放的話顆粒會跟著變大變小
 */
function clump(id, x, y, r, kind) {
  const { half, crowns, back, mark, leaf } = CLUMPS[kind]
  const palette = noise(id, 5) < 0.85 ? SAKURA : GREENS
  const shift = Math.floor(noise(id, 6) * 3)
  const flip = noise(id, 8) > 0.5 ? 1 : -1
  const trees = crowns.map(([dx, h, sx, sy, c], k) => {
    const tone = palette[(shift + c) % 3]
    const rx = r * sx
    // 墨色短弧、花瓣長在樹冠朝外的那一側（puffyTree 把它們放在樹枝的另一側），才不會被旁邊的樹冠蓋住
    const branch = dx * flip > 0 ? -1 : 1
    const { layers, mark: markPath } = puffyTree({
      x: x + dx * flip * r,
      y,
      rx,
      ry: r * sy,
      height: r * h,
      branch,
      // 櫻花樹長一小撮白色的花瓣、薄荷綠的樹長黃綠色的葉子，綠色、深綠的樹不長
      leaves: k === leaf && tone !== 'green' && tone !== 'deep' ? 3 + Math.floor(noise(id, 10 + k) * 3) : 0,
      bumps: 10 + Math.floor(noise(id, 20 + k) * 4),
      mark: mark.includes(k),
      seed: id * 61 + k * 7,
    })
    return {
      id: `${id}-${k}`,
      tone,
      // 後排的樹幹整根藏在前排的樹冠後面，不畫
      layers: k < back ? layers.filter((l) => l.part !== 'trunk') : layers,
      mark: markPath,
      // 墨色短弧的線寬跟著樹冠的大小（首屏的樹約是樹冠寬的 4.5%）
      markWidth: Math.max(1.4, rx * 0.045).toFixed(1),
    }
  })
  return { id, x, y, r, half: half * r, trees }
}

/*
 * 上岸的地方兩側的樹：照首屏的樹（OpeningScene.vue 的 trees）的位置、大小與畫法，左邊三棵、右邊一小叢和靠右緣的一大叢，
 * 框住中間空著的草地，像首屏的兩組樹框住新人。顏色換成櫻花：首屏的薄荷綠、綠、深綠依序換成淡粉紅、粉紅、玫瑰粉紅，
 * 相鄰的樹冠一樣是不同的顏色。座標、seed 都跟首屏一樣（首屏的畫布座標，2079 寬），畫出來的形狀才一模一樣
 */
const OPENING_W = 2079
/*
 * 樹幹底部在首屏畫布座標裡的高度。首屏的樹幹底藏在紙底下（TREE_GROUND 是 2560，紙的上緣在 2530），這裡樹幹底露出來踩在草地上，
 * 照首屏那樣整根露出來的話樹幹太長、樹冠又被上方的空間限制住，看起來像棒棒糖，所以樹幹短一點
 */
const COAST_GROUND = 2500
const COAST_GROUPS = [
  {
    // 左邊三棵，由後往前：中間的、右邊小一點的、最左邊大棵的
    side: 'left',
    trees: [
      { tone: 'sakura-pale', x: 330, cy: 2345, rx: 105, ry: 92, over: true, branch: -1, leaves: 4, seed: 310 },
      { tone: 'sakura', x: 505, cy: 2400, rx: 70, ry: 62, seed: 300 },
      { tone: 'sakura-rose', x: 135, cy: 2355, rx: 130, ry: 110, over: true, leaves: 5, bumps: 13, seed: 320 },
    ],
  },
  {
    // 右邊往左一點的一小叢，站得比較遠所以小一號；手機上兩側的樹往中間擠，這叢不畫（narrow: false），中間才空得出海面和草地
    side: 'right',
    narrow: false,
    trees: [
      { tone: 'sakura', x: 1550, cy: 2370, rx: 72, ry: 64, seed: 330 },
      { tone: 'sakura-pale', x: 1485, cy: 2425, rx: 56, ry: 50, mark: false, seed: 331 },
      { tone: 'sakura-rose', x: 1610, cy: 2440, rx: 58, ry: 52, mark: false, seed: 332 },
    ],
  },
  {
    // 靠右緣的一大叢，超出畫面一點，像還有樹長到畫面外
    side: 'right',
    trees: [
      { tone: 'sakura-rose', x: 1990, cy: 2255, rx: 120, ry: 108, bumps: 13, mark: false, seed: 340 },
      { tone: 'sakura', x: 2110, cy: 2290, rx: 110, ry: 100, mark: false, seed: 341 },
      { tone: 'sakura-pale', x: 1870, cy: 2340, rx: 92, ry: 82, seed: 342 },
      { tone: 'sakura-rose', x: 1790, cy: 2405, rx: 62, ry: 55, mark: false, seed: 343 },
      { tone: 'sakura', x: 1960, cy: 2385, rx: 88, ry: 78, mark: false, seed: 344 },
      { tone: 'sakura-pale', x: 2070, cy: 2410, rx: 85, ry: 76, seed: 345 },
    ],
  },
]
// 樹冠最高的地方（連同波浪邊往外鼓的部分）
const COAST_TOP = Math.min(...COAST_GROUPS.flatMap((g) => g.trees.map((t) => t.cy - t.ry * 1.15)))
// 手機上左邊那組只裁掉最左邊大樹的外側一點（首屏畫布單位），大樹才露得出來
const COAST_CROP = 80

// 地上的一片落花
const petal = (x, y, i, wide) => ({
  y,
  cls: `petal-${i % 3}`,
  transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(noise(i, 74) * 360)}) scale(${((wide ? 0.6 : 0.45) * (0.7 + noise(i, 75) * 0.5)).toFixed(2)})`,
})

// 每叢樹底下再落一圈，散在樹幹周圍的草地上、偏右（下風處），大叢落得多、散得開；ok(x, y) 決定那裡落不落得下
function petalsUnder(clumps, ok, wide) {
  const list = []
  for (const { id, x, y, r, half } of clumps) {
    for (let j = 0; j < Math.round((half / r) * 5); j++) {
      const i = id * 11 + j
      const a = noise(i, 76) * Math.PI * 2
      const d = 0.5 + noise(i, 77) * 0.8
      const px = x + Math.cos(a) * d * half * 0.9 + r * 0.2
      const py = y + Math.sin(a) * d * r * 0.3 + r * 0.05
      if (ok(px, py)) list.push(petal(px, py, i, wide))
    }
  }
  return list
}

/* ---------- 婚紗：一張滿版的紙、蓋在海上的紙的下緣 ---------- */
/*
 * 婚紗那一區整塊是一張奶油白的紙（--scene-paper），照片直接排在紙上，不加外框（之前的粉紅外框和框裡的圓角紙已經拿掉）。
 * 紙剛好就是婚紗那一區，一個畫面高（見 ScenicSection 的 scenic--sky）：
 * 上緣是 <main> 的頂端，跟首屏之間不做過渡，往下捲時直接蓋上來；捲到婚紗、紙佔滿畫面時，上下剛好貼齊畫面。
 * 上緣是一道撕開的紙邊（tornEdge），只往下撕進去 tear，缺口露出後面的首屏（首屏落後捲動，會墊在紙的上緣後面）；
 * 不往上凸，一開始首屏佔滿畫面時才看不到紙。
 * 紙的下緣（hem，原位就是婚紗那一區的底）像一張紙的下襬蓋在海上：下緣是一道手繪的弧線，兩個角是方的，
 * 兩側貼著婚紗那一區的底、中間往下垂 sag（跟上岸的海岸中間往上拱一上一下呼應）；
 * 弧線上再疊一道波紋，紙和海的交界像海面的浪。波紋只往下起伏、波長剛好整除畫面寬，兩端貼在波峰上，
 * 才不會在畫面的兩個下角往上縮、露出海。
 * 佔滿畫面時連畫面的兩個下角都蓋住，不會露出後面的海；垂下去的那段落在畫面外，捲下去才看得到弧度。
 * 下緣比婚紗那一區的底再往下多畫 HEM_OVER，手繪的小抖動才不會在畫面下緣露出一條海。
 * 紙佔滿畫面之後再往下捲，下緣這張比頁面慢一點，捲到畫面頂端時比原位低 down，
 * 照片、海、資訊照正常速度捲上來，海像是從紙底下滑進去。
 * down 照紙下面那段海面算，往下錯得少一點，不會碰到資訊。
 * 上半截只畫到 sheetBottom，一直被下緣這張蓋著；
 * 下緣這張往上多畫 down，往下錯開的時候跟上半截中間才不會露出海。
 * 兩側直的那段畫在畫面外 3px，手繪的小抖動才不會在畫面邊緣露出一條海
 */
const HEM_OVER = 6
// 波紋：寬螢幕大約 130px 一個浪；手機的浪短一點、起伏小一點，一個畫面才不會只有三個浪
const hemWave = (W) => {
  const wide = W >= 768
  return { len: W / Math.max(3, Math.round(W / (wide ? 130 : 100))), amp: wide ? 10 : 7 }
}
// 紙的下緣（原位）在 x 這裡的高度
const hemAt = (W, horizon, sag) => {
  const { len, amp } = hemWave(W)
  return (x) =>
    horizon + HEM_OVER + sag * Math.max(0, Math.sin((Math.PI * x) / W)) + (amp * (1 - Math.cos((2 * Math.PI * x) / len))) / 2
}
function drawFrame({ W, horizon, below }) {
  // below 是資訊內容的頂端，紙和資訊中間是一段海面
  const gap = below - horizon
  // 垂多深照畫面寬算，也不超過那段海面的四分之一；垂下去的部分扣掉再算錯開多少，往下錯開時才碰不到資訊
  const sag = Math.min(gap * 0.25, Math.min(64, Math.max(20, W * 0.045)))
  const down = Math.round((gap - sag) * 0.25)
  const sheetBottom = horizon - 40
  const hemTop = sheetBottom - down - 4
  const edgeAt = hemAt(W, horizon, sag)
  // 取點要比波紋密，浪才是圓的
  const n = Math.ceil((W + 6) / 6)
  const xs = Array.from({ length: n + 1 }, (_, i) => -3 + ((W + 6) * i) / n)
  const hem = sketchBand(`M-3 ${hemTop}${polyline(xs, edgeAt).replace('M', 'L')}L${W + 3} ${hemTop}`, hemTop, stroke(6))
  const hemHeight = horizon + HEM_OVER + sag + hemWave(W).amp + 4 - hemTop
  // 撕紙邊只撕進去一點點，手機再淺一點
  const tear = W >= 768 ? 7 : 5
  return {
    // 海從紙上半截的底開始，上面那段一直被下緣這張蓋著
    seaTop: sheetBottom,
    horizon,
    tear,
    fill: `${tornEdge(-40, W + 40, { depth: tear, seed: 8 })}L${W + 40} ${sheetBottom}H-40Z`,
    /*
     * 外層（box）停在下緣原本的高度、只有 1px 高，當捲動時間軸：從畫面下緣進來到從上緣離開；
     * 紙佔滿畫面時下緣剛好碰到畫面下緣，時間軸從這裡開始；裡面那張（sheet）照時間軸從原位錯到往下 down
     */
    hem: {
      horizon,
      sag,
      down,
      fill: hem.fill,
      viewBox: `0 ${hemTop} ${W} ${hemHeight}`,
      box: { top: `${horizon}px`, '--hem-down': `${down}px` },
      sheet: { top: `${hemTop - horizon}px`, height: `${hemHeight}px` },
    },
  }
}

/* ---------- 海：海鷗 ---------- */
/*
 * 海上只放海鷗，不放雲：資訊那一段空著，資訊與回覆之間先飛來一隻海鷗，
 * 回覆那一段越往下越多（兩側一兩隻，表單下方一小群）
 */
function drawSea({ W, rsvp, gaps: [gap2, gap3] }) {
  const wide = W >= 768
  // 海鷗以中心點定位
  const at = (x, y, w, extra = {}) => ({ left: `${(x - w / 2).toFixed(0)}px`, top: `${(y - w / 2).toFixed(0)}px`, width: `${w}px`, ...extra })
  const gullSize = wide ? 76 : 52
  // 寬 w 的海鷗連同滑翔，翅膀最高到中心往上 0.45w、身體最低到中心往上 0.15w 再往下 2px
  const gullUp = (w) => w * 0.45
  const gullDown = (w) => 2 - w * 0.15
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
  const along = (b, t) => b.top + (b.bottom - b.top) * t

  // 資訊與回覆之間：先飛來一隻海鷗，排在右邊
  const gulls = [[W * 0.8, gap2.top + gap2.h * 0.5, 0.9]]

  /*
   * 回覆那一區：表單兩側夠寬時，左上一隻海鷗、右下兩隻，跟資訊與回覆之間那隻左右錯開。
   * 表單下方到上岸前那段海面，夾在上岸的地方兩側的櫻花樹中間（見 COAST_GROUPS）再放一小群，
   * 排在表單和海岸正中間；兩側有海鷗的話下方空著（原本放一隻海鷗，已經拿掉）
   */
  const roomy = rsvp.left > 200
  if (roomy) {
    gulls.push([rsvp.left * 0.5, along(rsvp, 0.3), 0.9], ...flock(W - rsvp.left * 0.5, along(rsvp, 0.7), 2, 0.8))
  } else {
    // 整群都要排在表單下方、海岸上方；放不下就不放
    const coastAt = coastLine(W, gap3)
    const k = wide ? 0.85 : 0.8
    const birds = flock(W * 0.5, 0, 3, k)
    const top = Math.max(...birds.map(([, dy, s]) => gap3.top + 12 + gullUp(gullSize * s) - dy))
    const bottom = Math.min(...birds.map(([x, dy, s]) => coastAt(x) - 10 - gullDown(gullSize * s) - dy))
    if (bottom > top) gulls.push(...flock(W * 0.5, (top + bottom) / 2, 3, k))
  }

  return {
    gulls: gulls.map(([x, y, k], i) =>
      at(x, y, gullSize * k, { '--delay': `${(-noise(i, 91) * 3).toFixed(1)}s`, '--drift': `${(5 + noise(i, 92) * 3).toFixed(1)}s` }),
    ),
  }
}

/* ---------- 岸上：海岸、越往下越多的櫻花樹叢 ---------- */
function drawGrove({ W, H, gap, block }) {
  const wide = W >= 768
  const xs = edgeXs(W)
  const coastAt = coastLine(W, gap)
  const top = Math.floor(Math.min(...xs.map(coastAt)))
  const landTop = Math.ceil(Math.max(...xs.map(coastAt)))
  // 草地一路畫到 <main> 底部，整片是同一道漸層（靠海亮、往下深）；常見問題展開多出來的那段由 <main> 的背景接手
  const coast = sketchBand(polyline(xs, coastAt), H, stroke(16))

  /*
   * 上岸後的草地往下一點空出一條橫的草地，其他的樹都避開，兩側那幾叢樹框住中間這塊空地，
   * 像首屏的兩組樹框住新人（原本是小貓散步的路，小貓拿掉後留白照原本的位置）
   */
  const feet = landTop + (wide ? 40 : 26)
  const lane = { top: feet - (wide ? 87 : 62), bottom: feet + 10 }

  /*
   * 上岸的地方兩側的樹（見 COAST_GROUPS）：照首屏的畫布座標縮放 k 倍，左邊那組貼齊畫面左緣、右邊兩叢貼齊右緣；
   * 樹幹底部踩在海岸線下方一點的草地上，樹冠高過海岸線疊在海面上；
   * 寬螢幕最大約是首屏的八成五（首屏的樹放在這裡太搶眼），樹冠也不能碰到回覆的內容，放不下就縮小。
   * 手機上縮到最小還是比畫面寬，兩組各自貼著畫面兩側往中間挪，多出來的寬度從中間收掉：
   * 左邊只裁掉最左邊大樹的外側一點（COAST_CROP），右邊那一大叢本來就超出畫布，不另外裁，兩側才看得到大樹，跟小樹有大有小；
   * 往中間擠之後右邊那一小叢不畫（narrow: false）。原本左右平均裁掉，最大的幾棵整個裁到畫面外，只剩一樣小的樹
   */
  const ground = landTop + (wide ? 22 : 14)
  const k = Math.min(Math.max(0.26, Math.min(0.6, (W / OPENING_W) * 0.85)), (ground - gap.top - 12) / (COAST_GROUND - COAST_TOP))
  const over = Math.max(0, OPENING_W * k - W)
  const crop = Math.min(COAST_CROP * k, over)
  const coastGroups = COAST_GROUPS.map(({ side, trees }, g) => {
    const id = 5000 + g * 11
    const sx = (x) => (side === 'left' ? x * k - crop : W - (OPENING_W - x) * k)
    const list = trees.map(({ tone, x, cy, rx, ry, ...rest }, i) => {
      const { layers, mark } = puffyTree({ ...rest, x: sx(x), y: ground, rx: rx * k, ry: ry * k, height: (COAST_GROUND - cy) * k })
      return { id: `${id}-${i}`, tone, layers, mark, markWidth: Math.max(1.4, rx * k * 0.045).toFixed(1) }
    })
    const left = Math.min(...trees.map((t) => sx(t.x - t.rx)))
    const right = Math.max(...trees.map((t) => sx(t.x + t.rx)))
    const height = (COAST_GROUND - Math.min(...trees.map((t) => t.cy - t.ry * 1.15))) * k
    // 跟其他樹叢一樣記下中心、寬度的一半和 r（高度約 2.6r），落花和其他樹叢照這些避開
    return { id, x: (left + right) / 2, y: ground, r: height / 2.6, half: (right - left) / 2, trees: list }
  }).filter((_, g) => !over || COAST_GROUPS[g].narrow !== false)

  /*
   * 其他樹叢：把岸上的草地切成大格子，每格隨機放一叢（格子裡的點是整叢的中間），大叢小叢各半，
   * 越往下放的機率越高（約兩成到五成半），整體疏疏落落；
   * 整叢都要在草地上、不超出 <main> 底部（超出會把頁面撐高），樹冠和樹幹底部也不能躲在內容後面，
   * 也不能跟別叢（包括上岸的地方兩側那幾叢）擠在一起、蓋住中間那條空的草地
   */
  // 格子的寬度把畫面平均分成幾欄，兩側的欄才不會只剩半格
  const cols = Math.max(1, Math.round(W / (wide ? 280 : 150)))
  const cell = [W / cols, wide ? 210 : 130]
  const clumps = [...coastGroups]
  for (let row = 0; top + row * cell[1] < H; row++) {
    for (let col = 0; col < cols; col++) {
      const id = row * 97 + col * 13 + 7
      const r = (wide ? 50 : 30) * (0.85 + noise(id, 4) * 0.3)
      const kind = noise(id, 12) < 0.5 ? 'big' : 'small'
      const half = CLUMPS[kind].half * r
      const height = CLUMPS[kind].height * r
      // 靠畫面兩側的樹叢可以超出畫面一點，像還有樹長到畫面外，但最多切掉兩成，不然只露出一小條看起來像畫錯
      const x = Math.min(W - half * 0.6, Math.max(half * 0.6, (col + 0.5 + (noise(id, 1) - 0.5) * 0.7) * cell[0]))
      const y = top + (row + 0.5 + (noise(id, 2) - 0.5) * 0.6) * cell[1]
      const depth = Math.min(1, (y - top) / (H - top))
      if (noise(id, 3) > 0.2 + 0.35 * depth) continue
      const foot = y + height / 2
      const crownTop = foot - height
      if (crownTop < Math.max(coastAt(x - half), coastAt(x), coastAt(x + half)) + 8 || foot + r * 0.2 > H - 4) continue
      const near = { left: block.left - r * 0.35, right: block.right + r * 0.35, top: block.top - r * 0.35, bottom: block.bottom + r * 0.35 }
      if ([-0.7, 0, 0.7].some((u) => inside(near, x + u * half, foot) || inside(near, x + u * half, foot - r * 1.4))) continue
      // 交通內容（地圖、常見問題）的兩側也不種，旁邊保持乾淨，樹只長在內容下方
      if (crownTop < block.bottom && foot > block.top) continue
      if (clumps.some((c) => Math.abs(c.x - x) < (c.half + half) * 1.1 && Math.abs(c.y - foot) < (c.r + r) * 1.6)) continue
      if (foot > lane.top && crownTop < lane.bottom) continue
      clumps.push(clump(id, x, foot, r, kind))
    }
  }

  // 地上的落花，越往下越多；每叢樹底下再落一圈
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
  petals.push(...petalsUnder(clumps, onGrass, wide))

  // 常見問題展開時，內容下方的樹叢、落花跟著往下移；整叢照樹幹底部分，同一叢不會被拆到兩張畫布。H 和 block 量的是收合時的版面
  const isBelow = (item) => item.y > block.bottom
  // 照樹幹底部由上往下畫，前面（下面）那叢才會擋住後面的；同一叢裡的樹冠已經照由後往前排好
  clumps.sort((a, b) => a.y - b.y)
  const crowns = (list) => list.flatMap((c) => c.trees)
  return {
    top,
    landTop,
    grass: coast.fill,
    trees: crowns(clumps.filter((c) => !isBelow(c))),
    petals: petals.filter((p) => !isBelow(p)),
    below: { trees: crowns(clumps.filter(isBelow)), petals: petals.filter(isBelow) },
    // 落花飄的範圍：從海岸到 <main> 底部，底下留一段讓花瓣淡出，不會落到頁面外面
    sakura: { top, bottom: H - 80 },
  }
}

/* ---------- 量版面、重畫 ---------- */
let observer = null
let timer = 0
let lastKey = ''

// 內容下方的東西往下移多少；直接改 CSS 變數，不經過 Vue 重新渲染
function applyStretch(stretch) {
  root.value.style.setProperty('--stretch', `${stretch}px`)
}

function update() {
  const { stretch, ...layout } = measure()
  applyStretch(stretch)
  const key = JSON.stringify(layout)
  if (key === lastKey) return
  lastKey = key
  scene.value = draw(layout)
  if (riseByScript) nextTick(applyRise)
}

/*
 * 跟著捲動的紙的下緣：支援捲動時間軸的瀏覽器直接用 CSS 做（見樣式的 hem-lag），不支援的才在這裡照捲動距離算：
 * 下緣從畫面下緣進來到從上緣離開走到哪裡（0–1，跟 CSS 的 view() 一樣），換算成錯開多少（--hem-shift）。
 * 減少動態效果時不做，紙的下緣停在原位
 */
const riseByScript =
  !CSS.supports('animation-timeline: scroll()') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
let riseFrame = 0
const clamp01 = (t) => Math.min(1, Math.max(0, t))
function applyRise() {
  riseFrame = 0
  const hem = root.value.querySelector('.journey__hem')
  if (hem && scene.value) {
    const { top, height } = hem.getBoundingClientRect()
    const at = clamp01((window.innerHeight - top) / (window.innerHeight + height))
    hem.firstElementChild.style.setProperty('--hem-shift', `${(scene.value.frame.hem.down * at).toFixed(1)}px`)
  }
}
function onRiseScroll() {
  if (!riseFrame) riseFrame = requestAnimationFrame(applyRise)
}

// 內容高度變動（字型載入、表單切換）時常常連續變好幾次，等停下來再重畫
function schedule() {
  clearTimeout(timer)
  timer = setTimeout(update, 120)
}

onMounted(() => {
  update()
  const main = root.value.parentElement
  // 常見問題展開收合的動畫每一格都跟上，內容下方的樹才會貼著內容一起移動；收合時的版面沒變，等一下的重畫會直接略過
  observer = new ResizeObserver(() => {
    applyStretch(stretchOf(main))
    schedule()
  })
  observer.observe(main)
  // 交通那一區被撐到一個畫面高時，展開不會改變 <main> 的大小，所以也直接盯著會展開的元素
  main.querySelectorAll('[data-stretch]').forEach((el) => observer.observe(el))
  document.fonts?.ready.then(schedule)
  if (riseByScript) {
    window.addEventListener('scroll', onRiseScroll, { passive: true })
    window.addEventListener('resize', onRiseScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(timer)
  window.removeEventListener('scroll', onRiseScroll)
  window.removeEventListener('resize', onRiseScroll)
  cancelAnimationFrame(riseFrame)
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
      <!-- 海紋：深藍色的斜短線慢慢往左流；上下會被紙和上岸的草地蓋住 -->
      <div class="journey__waves" :style="scene.waves">
        <div class="journey__waves-flow" :style="{ backgroundImage: wavesImage }"></div>
      </div>

      <!--
        地面：婚紗那一區的紙（上半截，下半截在 hem）、上岸後的草地。
        紙的顆粒淡一點，才不會髒；紙不透明，蓋掉 <main> 背景的顆粒
      -->
      <svg class="journey__land" :style="scene.canvas.style" :viewBox="scene.canvas.viewBox" preserveAspectRatio="none">
        <path class="journey__paper" :d="scene.frame.fill" />
        <path class="journey__grain journey__grain--soft" :d="scene.frame.fill" />
        <path class="journey__grove" :d="scene.grove.grass" />
        <path class="journey__grain" :d="scene.grove.grass" />

        <path v-for="(p, i) in scene.petals" :key="`p${i}`" :class="p.cls" :d="PETAL" :transform="p.transform" />
      </svg>

      <svg class="journey__land journey__below" :style="scene.canvas.style" :viewBox="scene.canvas.viewBox" preserveAspectRatio="none">
        <path v-for="(p, i) in scene.belowPetals" :key="`bp${i}`" :class="p.cls" :d="PETAL" :transform="p.transform" />
      </svg>

      <!--
        樹叢照樹幹底部由上往下畫，前面（下面）的才會擋住後面的；同一叢的樹冠由後往前畫。
        跟首屏的樹一樣，每一層畫完馬上鋪一次顆粒，疊在上面的那層會蓋掉下面的顆粒；白色的花瓣很淺，顆粒淡一點
      -->
      <svg
        v-for="group in scene.trees"
        :key="group.key"
        class="journey__land"
        :class="{ journey__below: group.below }"
        :style="scene.canvas.style"
        :viewBox="scene.canvas.viewBox"
        preserveAspectRatio="none"
      >
        <g v-for="t in group.trees" :key="t.id" :class="`journey__tree journey__tree--${t.tone}`">
          <template v-for="layer in t.layers" :key="layer.part">
            <path :class="`journey__tree-${layer.part}`" :d="layer.d" :stroke-width="layer.width" />
            <path
              :class="[layer.width ? 'journey__grain-line' : 'journey__grain', { 'journey__grain--soft': layer.part === 'leaf' }]"
              :d="layer.d"
              :stroke-width="layer.width"
            />
          </template>
          <path v-if="t.mark" class="journey__tree-mark" :d="t.mark" :stroke-width="t.markWidth" />
        </g>
      </svg>

      <!--
        婚紗那張紙的下緣（見 script 的 drawFrame）：蓋在海上，往下捲時比頁面慢一點
      -->
      <div class="journey__hem" :style="scene.frame.hem.box">
        <svg class="journey__hem-sheet" :style="scene.frame.hem.sheet" :viewBox="scene.frame.hem.viewBox" preserveAspectRatio="none">
          <path class="journey__paper" :d="scene.frame.hem.fill" />
          <path class="journey__grain journey__grain--soft" :d="scene.frame.hem.fill" />
        </svg>
      </div>

      <SeaGull v-for="(style, i) in scene.sea.gulls" :key="`g${i}`" class="journey__gull" :style="style" />

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

/* 交通內容下方的樹和落花：常見問題展開多高就往下移多少，畫布的下緣剛好落在 <main> 底部 */
.journey__below {
  transform: translateY(var(--stretch, 0px));
}

/* ---------- 噴槍畫的質感：漸層與顆粒都在 PaintDefs ---------- */
/* 婚紗那一區的紙：平塗，再鋪一層淡顆粒 */
.journey__paper {
  fill: var(--scene-paper);
}

/*
 * 紙的下緣：外層停在下緣原本的高度、1px 高，當捲動時間軸；裡面那張跟著捲動往下錯開（見 hem-lag）。
 * 不支援捲動時間軸的瀏覽器由 JS 算 --hem-shift；減少動態效果時停在原位
 */
.journey__hem {
  position: absolute;
  left: 0;
  width: 100%;
  height: 1px;
}

.journey__hem-sheet {
  position: absolute;
  left: 0;
  display: block;
  width: 100%;
  transform: translateY(var(--hem-shift, 0px));
}

.journey__grove {
  fill: url(#paint-shade-grove);
}

.journey__grain {
  fill: url(#paint-grain);
}

/* 線條（樹枝）上的顆粒 */
.journey__grain-line {
  stroke: url(#paint-grain);
}

/* 很淺的顏色（奶油白的紙、白色花瓣）顆粒淡一點，才不會髒髒灰灰的 */
.journey__grain--soft {
  opacity: 0.45;
}

/* ---------- 草地 ---------- */
.petal-0 {
  fill: #f4aac0;
}

.petal-1 {
  fill: #fff;
}

.petal-2 {
  fill: #f8c8d6;
}

/* ---------- 樹（見 puffyTree.js）：顏色跟首屏的樹一樣在 SHADES 的 tree-*；樹枝細，用樹幹漸層的中間色 ---------- */
.journey__tree--sakura .journey__tree-crown {
  fill: url(#paint-shade-tree-sakura);
}

.journey__tree--sakura-pale .journey__tree-crown {
  fill: url(#paint-shade-tree-sakura-pale);
}

.journey__tree--sakura-rose .journey__tree-crown {
  fill: url(#paint-shade-tree-sakura-rose);
}

.journey__tree--mint .journey__tree-crown {
  fill: url(#paint-shade-tree-mint);
}

.journey__tree--green .journey__tree-crown {
  fill: url(#paint-shade-tree-green);
}

.journey__tree--deep .journey__tree-crown {
  fill: url(#paint-shade-tree-deep);
}

.journey__tree-trunk {
  fill: url(#paint-shade-trunk);
}

.journey__tree-branch,
.journey__grain-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.journey__tree-branch {
  stroke: #8b5a2e;
}

/* 櫻花樹上的一小撮是白色花瓣；薄荷綠的樹跟首屏一樣是黃綠色的葉子 */
.journey__tree-leaf {
  fill: #fff;
}

.journey__tree--mint .journey__tree-leaf {
  fill: #cfe36a;
}

.journey__tree-mark {
  fill: none;
  stroke: #2b2523;
  stroke-linecap: round;
}

/* ---------- 海 ---------- */
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

/* ---------- 海鷗、飄落的花瓣 ---------- */
.journey__gull,
.journey__faller {
  position: absolute;
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
  /* 紙的下緣：從畫面下緣進來（紙剛好佔滿畫面）到從上緣離開，從原位錯到往下 --hem-down，比頁面捲得慢一點 */
  .journey__hem {
    view-timeline: --journey-hem block;
  }

  @supports (animation-timeline: view()) {
    .journey__hem-sheet {
      animation: hem-lag linear both;
      animation-timeline: --journey-hem;
    }
  }

  /* 每秒約 16px，跟原本的流速差不多 */
  .journey__waves-flow {
    animation: drift 30s linear infinite;
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

@keyframes hem-lag {
  from {
    transform: none;
  }
  to {
    transform: translateY(var(--hem-down));
  }
}

@keyframes drift {
  to {
    transform: translateX(-488.4px);
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
