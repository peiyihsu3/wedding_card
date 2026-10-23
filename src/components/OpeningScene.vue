<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { wedding } from '../config.js'
import mountainUrl from '../assets/mountain.svg'
import seaUrl from '../assets/sea.svg'
import cloudUrl from '../assets/cloud.svg'
import coupleUrl from '../assets/couple.svg'
import { brush, circle, sketch, sketchBand } from '../utils/sketch.js'
import { SEA_MARKS } from '../utils/seaMarks.js'
import { GRAIN_SIZE, grainDot } from '../utils/grain.js'
import { puffyTree } from '../utils/puffyTree.js'
import DrawnCouple from './DrawnCouple.vue'

const props = defineProps({
  // true：山、海、雲與人物改用程式畫的版本（手繪線條、會流動）；false：原本的插畫圖檔
  drawn: { type: Boolean, default: false },
})

// 畫布座標裡一格顆粒圖樣該多大，交給共用的 PaintDefs 畫 paint-grain-cover
const emit = defineEmits(['grain-tile'])

const scene = ref(null)
const ready = ref(false)

/*
 * 往下捲時首屏也往上走，但只走捲動距離的一半，像落後一拍；下面的風景照正常速度捲上來，
 * 婚紗那一區的紙（見 JourneyBackdrop 的 drawFrame）一路蓋過首屏的山和人物，捲過一個首屏高時剛好整個蓋住。
 * 樹不落後：樹那一層把落後的距離補回來，照正常速度跟著紙一起捲走，像長在紙的上緣（見樣式的 trees-lead）。
 * 支援捲動時間軸的瀏覽器直接用 CSS 做（見樣式的 cover-lag），不會跟捲動差一格而抖動；
 * 不支援的才在這裡照捲動距離補位移。減少動態效果時不做，首屏照正常速度捲走
 */
const LAG = 0.5
const cover = ref(null)
const trees = ref(null)
const lagByScript =
  !CSS.supports('animation-timeline: scroll()') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
let lagFrame = 0
function applyLag() {
  lagFrame = 0
  const shift = Math.min(window.scrollY, cover.value.offsetHeight) * LAG
  cover.value.style.transform = `translateY(${shift.toFixed(1)}px)`
  if (trees.value) trees.value.style.translate = `0 ${(-shift).toFixed(1)}px`
}
function onLagScroll() {
  if (!lagFrame) lagFrame = requestAnimationFrame(applyLag)
}
onMounted(() => {
  if (!lagByScript) return
  applyLag()
  window.addEventListener('scroll', onLagScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onLagScroll)
  cancelAnimationFrame(lagFrame)
})

/*
 * 程式畫版本的構圖：畫布座標與原插畫相同（2079×2943），名字、日期、人物的位置計算可以共用。
 * 形狀不描邊，邊緣帶一點手繪的不規則；亮面與陰影靠漸層與顆粒（見 PaintDefs 的 SHADES），不另外畫線
 */
const art = props.drawn ? drawCover() : null

function drawCover() {
  const BOTTOM = 3000
  /*
   * 樹幹底部：比樹那一層對齊首屏下緣的 2530 低一點（見下面的 trees）。
   * 直式螢幕的樹抬到快捷按鈕上方（見樣式的直式螢幕），樹幹要再長一些才藏得到紙底下；
   * 橫式不跟著拉長，樹幹的漸層照整根的長度排，拉長了露出來那一截會變淡
   */
  const TREE_GROUND = { wide: 2560, tall: 2700 }
  const opt =(seed, extra) => ({ step: 10, amp: 5, wavelength: 160, seed, ...extra })
  const puffs = (list, seed) =>
    list.map(([cx, cy, r], i) => sketch(circle(cx, cy, r), opt(seed + i, { amp: 4, wavelength: 110 })))
  const blob = (d, seed) => sketch(d, opt(seed, { amp: 3, wavelength: 100 }))
  const band = (edge, bottom, seed) => sketchBand(edge, bottom, opt(seed)).fill
  // 貓很小，抖動跟著縮小，不然耳朵、腳掌會抖得變形
  const small = (d, seed) => sketch(d, { step: 3, amp: 1, wavelength: 28, seed })
  const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`
  /*
   * 貓搭在稜線上的白腳掌，像一顆蒜頭：上面圓圓胖胖，垂過稜線的下緣分成三顆腳趾（中間那顆垂得最低），
   * 腳趾之間的凹口往上點一筆墨色短線，像蒜瓣的分線。跟著稜線的斜度轉 deg 度
   */
  const paw = (cx, cy, deg, seed) => {
    const a = (deg * Math.PI) / 180
    const p = (x, y) =>
      `${(cx + x * Math.cos(a) - y * Math.sin(a)).toFixed(2)} ${(cy + x * Math.sin(a) + y * Math.cos(a)).toFixed(2)}`
    return {
      d: sketch(
        `M${p(-9, 1)}C${p(-9, -5)} ${p(-4, -6.5)} ${p(0, -6.5)}C${p(4, -6.5)} ${p(9, -5)} ${p(9, 1)}` +
          `C${p(9, 6)} ${p(5, 7)} ${p(3, 4.6)}C${p(2.4, 7.6)} ${p(-2.4, 7.6)} ${p(-3, 4.6)}C${p(-5, 7)} ${p(-9, 6)} ${p(-9, 1)}Z`,
        { step: 1.5, amp: 0.4, wavelength: 12, seed },
      ),
      toes: `M${p(3, 4.4)}Q${p(3.1, 2.6)} ${p(2.3, 1.2)}M${p(-3, 4.4)}Q${p(-3.1, 2.6)} ${p(-2.3, 1.2)}`,
    }
  }
  // 樹冠、樹枝、葉子的位置只跟樹冠中心有關，兩種版式只差在樹幹的長度
  const grow = (list) =>
    list.map(({ cy, tall = true, ...t }) => {
      const [wide, high] = [TREE_GROUND.wide, TREE_GROUND.tall].map((y) => puffyTree({ ...t, y, height: y - cy }))
      return { tone: t.tone, tall, mark: wide.mark, layers: { wide: wide.layers, tall: high.layers } }
    })
  const catPaws = [paw(384, 1887, 5, 86), paw(431, 1893, 5, 87)]

  return {
    // 雲只放右半邊：日期在左上角，白字才不會疊在白雲上
    clouds: puffs([[2039, 1800, 170], [1829, 1740, 200], [1609, 1790, 165], [1469, 1800, 130]], 10),
    /*
     * 遠山、近山是前後兩座山，稜線不平行，不要畫成兩條上下平移的色帶：
     * 遠山中間壓低成山谷（太陽從這裡露出來，人物剛好被兩側的山框住），右邊拉成一座大山；
     * 近山是一座矮一點的圓山，山頂跟遠山錯開、偏左（再左一點會躲在新娘的對話框後面），左坡陡右坡緩，往右一路降到水面底下，
     * 右邊就是遠山的山腳直接接湖面。兩座山中間露出來的遠山時寬時窄，才看得出是兩座山
     */
    mountainFar: band(
      'M-80 1870C100 1840 200 1825 330 1825C560 1825 780 1980 1040 1980C1300 1980 1480 1770 1740 1770C1950 1770 2050 1840 2160 1860',
      2100,
      30,
    ),
    mountain: band(
      'M-80 1990C200 1970 400 1945 560 1945C760 1945 900 2035 1080 2035C1260 2035 1320 1900 1450 1900C1590 1900 1760 2075 1980 2080C2070 2082 2110 2085 2160 2085',
      2100,
      31,
    ),
    sea: band('M-80 2060L2160 2060', BOTTOM, 32),
    /*
     * 藍白貓：躲在左邊兩座樹叢中間的凹口，從後面那叢（bushBack）的稜線後面探出頭，臉轉向右邊，從遠方偷看新人。
     * 頭的下半藏在樹叢後面，兩隻白色的腳掌搭在稜線上；灰藍的毛是人字臉：額頭中間一道白往下分開變成白色的嘴邊，
     * 到下巴整個變白，嘴巴底下一塊灰藍的花紋。頭探得夠高，嘴巴和花紋才露在稜線上面（白色往下延伸到稜線後面，看不出下緣）。
     * 在遠方，頭只比新郎的頭大一點；直式螢幕這一段被裁掉，看不到
     */
    cat: {
      /*
       * 頭和兩隻耳朵（臉轉向右邊，右耳比較靠右後方）。耳朵短短寬寬，耳尖只修掉一點、留一點尖角
       * （又高又尖的三角形太兇；又高又窄像兔子；耳尖整個修成大圓弧又太軟）
       */
      fur: [
        small('M374 1862C373 1853 377 1844 384 1837.5Q386.5 1834.5 388.5 1837.5C392 1841 395.5 1844 399 1846Z', 80),
        small('M407 1846C411 1842 415 1839 420 1836.5Q424 1834 426.5 1837C429.5 1842 431 1852 430 1864Z', 81),
        small(ellipse(402, 1874, 31, 30), 82),
      ],
      ears: [
        small('M381 1853C381 1847 383 1842 386 1840Q387.5 1838.6 388.6 1840.2C390.5 1842.5 392 1845 393 1847Z', 83),
        small('M413 1845C416 1842 419 1840.5 422 1839Q424 1838 425 1840C426.5 1843.5 426.8 1848 426.5 1854Z', 84),
      ],
      /*
       * 人字臉的白：額頭一道白往下分開，夾著兩隻眼睛；過了臉頰往兩側散開、超出頭的輪廓，下巴才整個是白的
       * （白嘴邊直直往下的話，左邊的灰一路延伸到下巴）。超出去的部分用頭的形狀裁掉（cover-cat-head）
       */
      white: small(
        'M408 1846C411 1854 415 1860 423 1864C428 1866.5 433 1869 440 1872L440 1910L362 1910L362 1881C372 1877 383 1870 394 1864C401 1860 405 1854 408 1846Z',
        85,
      ),
      /*
       * 嘴巴底下一塊跟頭一樣灰藍的毛，偏右、跟嘴巴隔一點。像一顆斜斜往右上翹的豆子，邊緣抖得很少，看起來像長在臉上的花紋
       * （墨色的小圓點太小又像張開的嘴；大一倍、邊緣抖得多像貼上去的一塊；上平下圓擺在嘴巴正下方，又像張開的嘴）
       */
      mole: sketch(
        'M407.5 1882.6C406.6 1880.4 408.4 1878.4 411.2 1878.2C413.2 1878 414.4 1877 416.4 1877.2C418.6 1877.5 419.6 1879.6 418.6 1881.6C417.6 1883.8 415 1884.8 412.4 1885C410.2 1885.2 408.3 1884.6 407.5 1882.6Z',
        { step: 1.5, amp: 0.4, wavelength: 12, seed: 88 },
      ),
      paws: catPaws.map((p) => p.d),
      toes: catPaws.map((p) => p.toes),
    },
    bushBack: sketch('M260 1900C380 1860 520 1900 600 1990S640 2140 560 2190L260 2220Z', opt(50)),
    bushFront: sketch('M-80 1700C180 1690 330 1780 380 1920S380 2160 300 2260L-80 2300Z', opt(51)),
    slopeBack: band('M-80 2065C400 2010 800 2080 1200 2180S1900 2330 2160 2355', BOTTOM, 52),
    slopeFront: band('M-80 2125C420 2080 820 2150 1220 2250S1880 2400 2160 2425', BOTTOM, 53),
    // 草地上的色塊：靠左的從畫布外面開始，其他的兩端收成尖角，才不會露出一條直直的邊
    patchesLight: [
      'M-80 2310C400 2260 700 2310 900 2380C700 2420 400 2420 -80 2390Z',
      'M1260 2540C1500 2500 1700 2530 1850 2580C1650 2610 1450 2600 1260 2540Z',
    ].map((d, i) => blob(d, 60 + i)),
    patchesDeep: [
      'M-80 2650C300 2600 600 2640 800 2700C600 2760 300 2760 -80 2730Z',
      'M1160 2780C1500 2720 1800 2740 2160 2790V2860C1800 2840 1500 2840 1160 2780Z',
    ].map((d, i) => blob(d, 70 + i)),
    /*
     * 樹獨立一層，跟著婚紗那張紙一起捲（見樣式的 scene__canvas--trees）：那一層的 2530 固定對齊首屏下緣，也就是紙的上緣。
     * cy 是樹冠中心的高度；樹幹一律長到 TREE_GROUND，比紙的上緣再低一點，藏在紙底下（直式螢幕的樹抬高、樹幹拉長，見 TREE_GROUND）。
     * 樹幹的底露出來的話，捲動時草地落後、樹不落後，看起來會像樹在草地上滑
     *
     * 左右兩組分開放，直式螢幕只看得到畫布中間一段，兩組各自往中間挪，貼著畫面兩側（見樣式的 scene__trees）；
     * 挪過去之後靠中間的樹會擠在人物腳下，標 tall: false 的直式螢幕不畫，中間才空得出草地
     *
     * 左下角的三棵樹，由後往前畫：中間的薄荷綠、右邊小一點的綠樹、最左邊大棵的深綠樹。樹都站在人物左邊
     */
    trees: {
      left: grow([
        { tone: 'mint', x: 330, cy: 2345, rx: 105, ry: 92, over: true, branch: -1, leaves: 4, seed: 310 },
        { tone: 'green', x: 505, cy: 2400, rx: 70, ry: 62, tall: false, seed: 300 },
        { tone: 'deep', x: 135, cy: 2355, rx: 130, ry: 110, over: true, leaves: 5, bumps: 13, seed: 320 },
      ]),
      /*
       * 右下角的樹擠成一叢一叢，由後往前畫：往左一點一小叢（站得比較遠所以小一號，跟右邊那叢中間隔一段草地），
       * 靠右緣一大叢（超出畫布一點，像還有樹長到畫面外）。同一叢的樹冠疊得很緊、後高前低堆成一座小丘，
       * 樹幹藏在後面只露出一小截；相鄰的樹冠換不同的綠，才分得出一棵棵。墨色短弧一叢只點一兩筆，線條才不會太多
       */
      right: grow([
        { tone: 'green', x: 1550, cy: 2370, rx: 72, ry: 64, tall: false, seed: 330 },
        { tone: 'mint', x: 1485, cy: 2425, rx: 56, ry: 50, mark: false, tall: false, seed: 331 },
        { tone: 'deep', x: 1610, cy: 2440, rx: 58, ry: 52, mark: false, tall: false, seed: 332 },
        { tone: 'deep', x: 1990, cy: 2255, rx: 120, ry: 108, bumps: 13, mark: false, seed: 340 },
        { tone: 'green', x: 2110, cy: 2290, rx: 110, ry: 100, mark: false, seed: 341 },
        { tone: 'mint', x: 1870, cy: 2340, rx: 92, ry: 82, seed: 342 },
        { tone: 'deep', x: 1790, cy: 2405, rx: 62, ry: 55, mark: false, seed: 343 },
        { tone: 'green', x: 1960, cy: 2385, rx: 88, ry: 78, mark: false, seed: 344 },
        { tone: 'mint', x: 2070, cy: 2410, rx: 85, ry: 76, seed: 345 },
      ]),
    },
    // 太陽：圓心在山谷下方，只從山後露出一小塊；日期的圓弧與太陽同圓心、半徑大很多，弧度平緩比較好讀
    sun: sketch(circle(1060, 2010, 190), opt(210, { amp: 3, wavelength: 120 })),
    heartShine: brush('M1350 864q4-14 18-16', { width: 6, step: 3, amp: 0.5, seed: 101 }),
    heart: blob(
      'M1330 870C1330 835 1375 830 1380 860C1385 830 1430 835 1430 870C1430 900 1390 925 1380 940C1370 925 1330 900 1330 870Z',
      100,
    ),
  }
}

/*
 * 噴槍畫的質感：形狀填同色系的漸層、上面鋪一層顆粒，漸層與顆粒圖樣都在共用的 PaintDefs。
 * 顆粒以螢幕像素計：量出畫布實際的高度，換算圖樣在畫布座標裡該多大（手機上一個畫布單位不到 0.3 像素）
 */
const canvas = ref(null)
const grainObserver = new ResizeObserver(([entry]) => {
  if (entry.contentRect.height) emit('grain-tile', (GRAIN_SIZE * grainDot() * 2943) / entry.contentRect.height)
})
onMounted(() => canvas.value && grainObserver.observe(canvas.value))
onUnmounted(() => grainObserver.disconnect())

/*
 * 名字寫在對話框裡，像兩人各自喊出自己的名字。座標是人物畫布（960×864），尖角從框的下緣彎彎地伸向本人；
 * 框的寬度照字數算，字級 48 = 人物寬度的 5%、字距 0.12 個字寬（CSS 也用同樣的比例）。
 * 兩個框分在人物兩側。直式螢幕（tall）的人物幾乎跟畫面一樣寬，兩側只剩人物寬度的 6/88（約 65 個單位），
 * 新郎的框照橫式（wide）擺會貼到畫面左緣，往右下挪一點、塞進舉起的手左下方。
 * tilt 讓框的上緣歪一點（正值左低右高），兩個框歪的方向相反
 */
const SAY_SIZE = 48
const SAY_TRACK = 0.12
const VIEW = { w: 960, h: 864 }
const SPEAKERS = [
  {
    name: wedding.groom,
    tilt: -5,
    // 舉起的手左邊；臉被手隔開，尖角指向肩膀
    wide: { cx: 82, cy: 110, base: [118, 155], tip: [215, 205] },
    // 一樣在舉起的手左邊，手機上離畫面左緣還留約 8px（放在頭頂上方試過，看起來像新娘在喊）
    tall: { cx: 98, cy: 125, base: [134, 171], tip: [220, 214] },
  },
  // 捧花右上方，尖角往左下指向新娘的頭，根部收窄成跟新郎的差不多（伸到捧花和頭中間試過，太長）
  { name: wedding.bride, tilt: 5, wide: { cx: 830, cy: 55, base: [760, 792], tip: [712, 195] } },
]

const lerp = ([ax, ay], [bx, by], t) => [ax + (bx - ax) * t, ay + (by - ay) * t]
const pt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`

/*
 * 手繪漫畫的對話框：圓角很大的四邊形，四個角的圓弧大小不一（尖角那一側的下角最小，留位置給尖角），
 * 上、左、右三邊微微往外鼓，上緣再歪一點。下緣在 base 兩點之間開口接到尖角 tip，
 * 尖角的兩邊都往下彎：先往下掉、再勾向本人，像一根彎彎的刺
 */
function bubblePath(cx, cy, w, h, tilt, [b1, b2], tip) {
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
function roundBubblePath(cx, cy, rx, ry, [a1, a2], tip) {
  const at = (deg) => [cx + rx * Math.cos((deg * Math.PI) / 180), cy + ry * Math.sin((deg * Math.PI) / 180)]
  const [left, right] = [at(a1), at(a2)]
  // 從左邊的基點順時針繞過上緣到右邊的基點（大弧），再接尖角
  return `M${pt(left)}A${rx} ${ry} 0 1 1 ${pt(right)}${bubbleTail(left, right, tip)}Z`
}

// 名字拆成單字，order 決定第幾個寫出來；兩人之間多停一拍，那一拍讓新娘的對話框跳出來
let order = 0
const speakers = SPEAKERS.map(({ name, tilt, wide, tall = wide }) => {
  const start = order
  const chars = Array.from(`${name}！`).map((char) => ({ char, order: order++, punct: char === '！' }))
  order++
  // 一個字（含字距）1.12 個字寬，收緊的驚嘆號 0.47，左右再留 0.8 個字寬
  const w = chars.reduce((sum, c) => sum + (c.punct ? 0.35 : 1) + SAY_TRACK, 0) * SAY_SIZE + SAY_SIZE * 1.6
  const place = ({ cx, cy, base, tip }) => ({
    bubble: bubblePath(cx, cy, w, SAY_SIZE * 2.1, tilt, base, tip),
    left: `${(cx / VIEW.w) * 100}%`,
    top: `${(cy / VIEW.h) * 100}%`,
    // 對話框從尖角那裡彈出來
    origin: `${(tip[0] / VIEW.w) * 100}% ${(tip[1] / VIEW.h) * 100}%`,
  })
  return { order: start, chars, wide: place(wide), tall: place(tall) }
})

/*
 * 偷看的藍白貓也喊一聲「喵！」：等新娘的名字寫完，貓才從稜線後面冒出來，對話框跟著跳出來
 * （order 接在兩人後面多停兩拍，貓出場的時間也照這個 order 算，見樣式的 scene__cat）。
 * 座標是首屏畫布（2079×2943），框在貓頭右邊、跟嘴巴差不多高，短短的尖角從左下指向嘴巴旁邊的臉頰
 * （放在貓頭正上方、尖角指向兩耳中間試過，離嘴巴太遠，不像貓在說話；再往右上會在平板上貼到新郎的對話框）。
 * 框是圓圓的小橢圓，剛好包住兩個字（跟名字一樣的圓角四邊形試過，字少框大，太空）；
 * 字級 26 個畫布單位，跟貓一樣照畫布縮放，比名字小一點，像從遠方傳來的。尖角的畫法跟名字的對話框一樣，框線一樣粗
 */
const CAT_SAY = 26
const catSay = (() => {
  const start = order + 2
  const chars = Array.from('喵！').map((char, i) => ({ char, order: start + 1 + i, punct: char === '！' }))
  const [cx, cy, tip] = [472, 1838, [435, 1867]]
  return {
    order: start,
    chars,
    bubble: roundBubblePath(cx, cy, 31, 27, [150, 124], tip),
    left: `${(cx / 2079) * 100}%`,
    top: `${(cy / 2943) * 100}%`,
    fontSize: `calc(var(--canvas-h) * ${CAT_SAY} / 2943)`,
    origin: `${(tip[0] / 2079) * 100}% ${(tip[1] / 2943) * 100}%`,
  }
})()

// 跟 CSS 的橫式斷點（4/5）一致：直式螢幕新郎的對話框換位置
const wideQuery = window.matchMedia('(min-aspect-ratio: 4/5)')
const layout = ref(wideQuery.matches ? 'wide' : 'tall')
const onLayoutChange = (e) => {
  layout.value = e.matches ? 'wide' : 'tall'
}
onMounted(() => wideQuery.addEventListener('change', onLayoutChange))
onUnmounted(() => wideQuery.removeEventListener('change', onLayoutChange))

const [year, month, day] = wedding.dateISO.split('-')

// 圖檔不小，等圖片與字型都載入後才開始進場動畫，避免動畫跑完圖或字才突然出現
onMounted(async () => {
  const images = Array.from(scene.value.querySelectorAll('img'))
  await Promise.all([...images.map(waitForLoad), loadFonts()])
  ready.value = true
})

function loadFonts() {
  if (!document.fonts) return Promise.resolve()
  return Promise.all([
    document.fonts.load('1em "Huninn"', `${wedding.groom}${wedding.bride}！`),
    document.fonts.load('700 1em "Fredoka"', '0123456789/'),
    document.fonts.load('600 1em "Fredoka"', 'SAVE THE DATE'),
  ]).catch(() => {})
}

function waitForLoad(img) {
  if (img.complete) return Promise.resolve()
  return new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true })
    img.addEventListener('error', resolve, { once: true })
  })
}
</script>

<template>
  <!-- 日期、名字的手繪外框濾鏡與插畫的漸層、顆粒都在共用的 PaintDefs（paint-…） -->
  <div ref="cover" class="cover" :class="{ 'is-ready': ready }">
    <section
      ref="scene"
      class="scene"
      :class="{ 'is-ready': ready, 'scene--drawn': drawn }"
      role="img"
      :aria-label="`${wedding.groom}與${wedding.bride}牽手在山海之間的插畫，${wedding.date}`"
    >
      <!--
        程式畫的版本：畫布大小與構圖照原本的插畫（2079×2943），名字、日期、人物的位置計算可以共用
      -->
      <template v-if="drawn">
        <!-- 後層（靜態）：雲、遠山、海 -->
        <svg ref="canvas" class="scene__canvas" viewBox="0 0 2079 2943" aria-hidden="true">
          <!-- 顆粒整片鋪滿，再用每一組形狀合起來的範圍裁出來：形狀重疊的地方顆粒才不會疊兩層 -->
          <defs>
            <clipPath id="cover-grain-clouds">
              <path v-for="(d, i) in art.clouds" :key="i" :d="d" />
            </clipPath>
            <clipPath id="cover-grain-sun"><path :d="art.sun" /></clipPath>
            <clipPath id="cover-grain-mountains">
              <path :d="art.mountainFar" />
              <path :d="art.mountain" />
            </clipPath>
            <clipPath id="cover-grain-sea"><path :d="art.sea" /></clipPath>
          </defs>
          <g class="scene__part scene__part--clouds">
            <path v-for="(d, i) in art.clouds" :key="i" class="fill-cloud" :d="d" />
            <rect class="scene__grain scene__grain--soft" clip-path="url(#cover-grain-clouds)" width="100%" height="100%" />
          </g>
          <!--
            日出：遠山中間的山谷升起一顆太陽，日期沿著太陽外圍排成圓弧，SAVE THE DATE 寫在太陽裡；
            整組在山的後面，太陽下半部被山擋住，人物在前面。偏方的螢幕（長寬比 4/5～6/5）山谷被人物擋滿，改用左上角的日期
          -->
          <g class="scene__part scene__part--date scene__sun-date">
            <path class="scene__sun" :d="art.sun" />
            <rect class="scene__grain scene__grain--soft" clip-path="url(#cover-grain-sun)" width="100%" height="100%" />
            <g class="scene__sun-shift">
              <text class="scene__sun-tag" x="1060" y="1790" text-anchor="middle">SAVE THE DATE</text>
              <path id="cover-sun-arc" class="scene__sun-arc" d="M693 2010A367 367 0 0 1 1427 2010" />
              <!-- 圓點左右用 dx 留空隙；圓點本身比數字中線低，dy 往上提，下一段再拉回來 -->
              <text class="scene__sun-num" filter="url(#paint-sketch-horizon)">
                <textPath href="#cover-sun-arc" startOffset="50%" text-anchor="middle">{{ year }}<tspan dx="24" dy="-7">·</tspan><tspan dx="24" dy="7">{{ month }}</tspan><tspan dx="24" dy="-7">·</tspan><tspan dx="24" dy="7">{{ day }}</tspan></textPath>
              </text>
            </g>
          </g>
          <g class="scene__part scene__part--mountains">
            <path class="fill-mountain-far" :d="art.mountainFar" />
            <path class="fill-mountain" :d="art.mountain" />
            <rect class="scene__grain" clip-path="url(#cover-grain-mountains)" width="100%" height="100%" />
          </g>
          <g class="scene__part scene__part--sea">
            <path class="fill-sea" :d="art.sea" />
            <rect class="scene__grain" clip-path="url(#cover-grain-sea)" width="100%" height="100%" />
          </g>
        </svg>

        <!-- 中層（會動）：海紋、愛心、小鳥，獨立一層，動畫時不必重畫其他形狀 -->
        <svg class="scene__canvas scene__canvas--motion" viewBox="0 0 2079 2943" aria-hidden="true">
          <defs>
            <!-- 海紋：跟往下捲的海一樣是深藍色的斜短線，圖樣縮成 780 寬，橫式螢幕上的線條大小才跟下面的海差不多 -->
            <pattern
              id="cover-sea-marks"
              width="780"
              :height="(780 * SEA_MARKS.height) / SEA_MARKS.width"
              :viewBox="`0 0 ${SEA_MARKS.width} ${SEA_MARKS.height}`"
              patternUnits="userSpaceOnUse"
            >
              <path class="scene__sea-mark" :d="SEA_MARKS.d" />
            </pattern>
          </defs>
          <g class="scene__part scene__part--sea">
            <!-- 比畫布多一格圖樣寬，往左移一格就能無縫循環 -->
            <rect class="scene__sea-flow" x="0" y="2070" width="3120" height="1040" fill="url(#cover-sea-marks)" />
          </g>
          <g class="scene__part scene__part--sky">
            <ellipse class="scene__shadow scene__heart-shadow" cx="1380" cy="1020" rx="42" ry="9" />
            <g class="scene__heart">
              <path class="fill-heart" :d="art.heart" />
              <path class="brush-white" :d="art.heartShine" />
            </g>
            <ellipse class="scene__shadow" cx="1094" cy="1110" rx="24" ry="5" />
            <ellipse class="scene__shadow" cx="1157" cy="1166" rx="20" ry="4" />
            <path class="scene__bird" d="M1060 1000q18-18 32 0q14-18 32 0" />
            <path class="scene__bird" d="M1132 1058q14-14 25 0q11-14 25 0" />
          </g>
        </svg>

        <!-- 前層（靜態）：樹叢、草坡 -->
        <svg class="scene__canvas" viewBox="0 0 2079 2943" aria-hidden="true">
          <defs>
            <clipPath id="cover-grain-land">
              <path :d="art.bushBack" />
              <path :d="art.bushFront" />
              <path :d="art.slopeBack" />
              <path :d="art.slopeFront" />
            </clipPath>
            <clipPath id="cover-grain-cat-fur">
              <path v-for="(d, i) in art.cat.fur" :key="i" :d="d" />
            </clipPath>
            <clipPath id="cover-grain-cat-white"><path :d="art.cat.white" /></clipPath>
            <clipPath id="cover-cat-head"><path :d="art.cat.fur[2]" /></clipPath>
            <clipPath id="cover-grain-cat-mole"><path :d="art.cat.mole" /></clipPath>
            <clipPath id="cover-grain-cat-paws">
              <path v-for="(d, i) in art.cat.paws" :key="i" :d="d" />
            </clipPath>
          </defs>
          <g class="scene__part scene__part--land">
            <!--
              藍白貓比樹叢先畫，下半個頭被後面那叢蓋住。毛、白毛各自畫完馬上鋪顆粒，白毛蓋掉底下毛的顆粒；
              五官很小，不鋪顆粒
            -->
            <!-- 外層管出場（從稜線後面冒出來），內層管之後的探頭、縮頭，兩個動畫才不會搶同一個 transform -->
            <g class="scene__cat" :style="{ '--order': catSay.order }">
              <g class="scene__cat-bob">
              <path v-for="(d, i) in art.cat.fur" :key="`cf${i}`" class="scene__cat-fur" :d="d" />
              <rect class="scene__grain" clip-path="url(#cover-grain-cat-fur)" width="100%" height="100%" />
              <path v-for="(d, i) in art.cat.ears" :key="`ce${i}`" class="scene__cat-ear" :d="d" />
              <g clip-path="url(#cover-cat-head)">
                <path class="scene__cat-white" :d="art.cat.white" />
                <rect class="scene__grain scene__grain--soft" clip-path="url(#cover-grain-cat-white)" width="100%" height="100%" />
              </g>
              <circle class="scene__cat-blush" cx="388" cy="1871" r="3.5" />
              <circle class="scene__cat-blush" cx="427" cy="1871" r="3.5" />
              <!-- 黃綠眼睛：墨色瞳孔和亮點都偏右，眼睛看向新人 -->
              <ellipse class="scene__cat-eye" cx="395" cy="1859" rx="3.6" ry="4.2" />
              <ellipse class="scene__cat-eye" cx="420" cy="1859" rx="3.6" ry="4.2" />
              <ellipse class="scene__cat-pupil" cx="395.9" cy="1859.2" rx="1.8" ry="3" />
              <ellipse class="scene__cat-pupil" cx="420.9" cy="1859.2" rx="1.8" ry="3" />
              <circle class="scene__cat-shine" cx="396.4" cy="1857.6" r="1.1" />
              <circle class="scene__cat-shine" cx="421.4" cy="1857.6" r="1.1" />
              <path class="scene__cat-nose" d="M404 1868L412 1868L408 1872.5Z" />
              <!-- 嘴巴底下一塊灰藍的毛（跟頭一樣是漸層，畫完鋪顆粒），鼻子底下一個小小的 ω 嘴巴 -->
              <path class="scene__cat-fur" :d="art.cat.mole" />
              <rect class="scene__grain" clip-path="url(#cover-grain-cat-mole)" width="100%" height="100%" />
              <path class="scene__cat-mouth" d="M408 1872.5Q406.6 1875.6 404 1874.6M408 1872.5Q409.4 1875.6 412 1874.6" />
              </g>
            </g>
            <!-- 後面那叢先畫，左緣的直線才會被前面的大樹叢蓋住 -->
            <path class="fill-bush" :d="art.bushBack" />
            <path class="fill-bush-deep" :d="art.bushFront" />
            <path class="fill-grass-deep" :d="art.slopeBack" />
            <path class="fill-grass" :d="art.slopeFront" />
            <path v-for="(d, i) in art.patchesLight" :key="`pl${i}`" class="fill-grass-light" :d="d" />
            <path v-for="(d, i) in art.patchesDeep" :key="`pd${i}`" class="fill-grass-deep" :d="d" />
            <rect class="scene__grain" clip-path="url(#cover-grain-land)" width="100%" height="100%" />
            <!-- 貓的兩隻白腳掌搭在稜線上：畫在樹叢上面，鋪自己的顆粒，底下樹叢的顆粒被腳掌蓋掉，不會疊兩層 -->
            <g class="scene__cat-paws" :style="{ '--order': catSay.order }">
              <path v-for="(d, i) in art.cat.paws" :key="`cp${i}`" class="scene__cat-white" :d="d" />
              <rect class="scene__grain scene__grain--soft" clip-path="url(#cover-grain-cat-paws)" width="100%" height="100%" />
              <path v-for="(d, i) in art.cat.toes" :key="`ct${i}`" class="scene__cat-toe" :d="d" />
            </g>
          </g>
        </svg>

        <!-- 藍白貓的對話框：疊在風景上，跟畫布一樣大小、一樣裁切，尖角才會一直對著貓 -->
        <div class="scene__canvas scene__cat-say">
          <div class="scene__say" :style="{ '--order': catSay.order, transformOrigin: catSay.origin }">
            <svg class="scene__say-frame" viewBox="0 0 2079 2943" aria-hidden="true">
              <path class="scene__say-bubble" :d="catSay.bubble" />
            </svg>
            <p class="scene__say-text" :style="{ left: catSay.left, top: catSay.top, fontSize: catSay.fontSize }">
              <span
                v-for="c in catSay.chars"
                :key="c.order"
                class="scene__char"
                :class="{ 'scene__char--punct': c.punct }"
                :style="{ '--order': c.order }"
              >{{ c.char }}</span>
            </p>
          </div>
        </div>

        <!--
          最前層（跟著紙捲）：左下角、右下角的樹，只畫 2000 以下。跟山、草坡一樣是漸層加顆粒。每一層畫完馬上鋪一次顆粒，
          疊在上面的那層會蓋掉下面的顆粒，樹幹壓在樹冠上的地方才不會有兩層顆粒
        -->
        <svg ref="trees" class="scene__canvas scene__canvas--trees" viewBox="0 2000 2079 943" aria-hidden="true">
          <g class="scene__part scene__part--land">
            <g v-for="(group, side) in art.trees" :key="side" :class="`scene__trees scene__trees--${side}`">
              <g
                v-for="(t, i) in group"
                :key="i"
                :class="['scene__tree', `scene__tree--${t.tone}`, { 'scene__tree--wide-only': !t.tall }]"
              >
                <template v-for="layer in t.layers[layout]" :key="layer.part">
                  <path :class="`scene__tree-${layer.part}`" :d="layer.d" :stroke-width="layer.width" />
                  <path :class="layer.width ? 'scene__grain-line' : 'scene__grain'" :d="layer.d" :stroke-width="layer.width" />
                </template>
                <path v-if="t.mark" class="scene__tree-mark" :d="t.mark" />
              </g>
            </g>
          </g>
        </svg>
      </template>

      <!-- 原本的插畫：山、海、雲是同一張畫布切出的圖層，疊在同一個框裡就會對齊 -->
      <template v-else>
        <img class="scene__layer scene__layer--sea" :src="seaUrl" alt="" />
        <img class="scene__layer scene__layer--mountain" :src="mountainUrl" alt="" fetchpriority="high" />
        <img class="scene__layer scene__layer--cloud" :src="cloudUrl" alt="" />
      </template>
      <p class="scene__date">
        <span class="scene__date-num">{{ year }}</span>
        <span class="scene__date-num">{{ month }}</span>
        <span class="scene__date-num">{{ day }}</span>
        <span class="scene__date-tag">SAVE<br />THE<br />DATE</span>
      </p>
      <div class="scene__couple">
        <span class="scene__couple-shadow"></span>
        <!-- 人物和對話框一起浮動，尖角才會一直對著嘴巴 -->
        <div class="scene__couple-body">
          <DrawnCouple v-if="drawn" class="scene__couple-img" />
          <img v-else class="scene__couple-img" :src="coupleUrl" alt="" />
          <!-- 新郎、新娘各自的對話框；整組在 role="img" 裡，名字另外寫進 aria-label -->
          <div
            v-for="(s, i) in speakers"
            :key="i"
            class="scene__say"
            :style="{ '--order': s.order, transformOrigin: s[layout].origin }"
          >
            <svg class="scene__say-frame" viewBox="0 0 960 864" aria-hidden="true">
              <path class="scene__say-bubble" :d="s[layout].bubble" />
            </svg>
            <p class="scene__say-text" :style="{ left: s[layout].left, top: s[layout].top }">
              <span
                v-for="c in s.chars"
                :key="c.order"
                class="scene__char"
                :class="{ 'scene__char--punct': c.punct }"
                :style="{ '--order': c.order }"
              >{{ c.char }}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 首屏共用的尺寸 */
.cover {
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --vh: 1vh;
  /* 剛好一個畫面高：第一頁一開始看不到底下婚紗那張紙，往下捲才從畫面下緣進來（見 JourneyBackdrop 的 drawFrame） */
  --scene-h: max(calc(100 * var(--vh)), 320px);
  /* 疊在插畫底部的快捷按鈕（SiteNav）：離底距離與按鈕高度 */
  --nav-bottom: 16px;
  --nav-h: 40px;
  /* 日期離左右兩側的距離 */
  --side: max(16px, 6vw);

  /* 後面的 <main> 捲上來時蓋在首屏上面（DOM 順序在後） */
  position: relative;
}

/* 手機網址列會伸縮，用 svh 才不會讓首屏高度跳動 */
@supports (height: 1svh) {
  .cover {
    --vh: 1svh;
  }
}

.scene {
  /* 山海雲圖層裁切時對準的高度位置；直式螢幕裁掉下方草地，保留上方「We Are Married」字樣（程式畫的版本另外對準，見下面的直式螢幕） */
  --focus-y: 0.25;
  /* 山海雲圖層以 cover 鋪滿後的實際高度（畫布 2079×2943） */
  --canvas-h: max(var(--scene-h), 100vw * 2943 / 2079);
  /* 畫布的上緣：照 --focus-y 裁掉多出來的高度 */
  --canvas-top: calc((var(--canvas-h) - var(--scene-h)) * var(--focus-y) * -1);
  --couple-w: min(88vw, calc(53 * var(--vh)));
  /* 底部留空間給快捷按鈕（再加 8px 間隔），人物才不會被擋住 */
  --couple-bottom: calc(4% + var(--nav-bottom) + var(--nav-h) + 8px);
  /* 原本的插畫（?painted）直式螢幕「We Are Married」字樣的下緣（畫布高度 14.8% 處），扣掉圖層裁切掉的上緣 */
  --title-bottom: calc(var(--canvas-h) * 0.148 + var(--canvas-top));

  position: relative;
  /* 圖層的 z-index 只在插畫內部比較，下方區塊的交界（雲）才能疊到插畫底部上 */
  isolation: isolate;
  height: var(--scene-h);
  overflow: hidden;
  /* 插畫裡的白色字樣與雲需要淡藍色天空才看得清楚 */
  background: linear-gradient(180deg, #b4d8ee 0%, #d6eaf5 45%, #eef6f9 75%);
}

.scene__layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% calc(var(--focus-y) * 100%);
}

.scene__layer--sea {
  z-index: 1;
}

.scene__layer--mountain {
  z-index: 2;
}

.scene__layer--cloud {
  z-index: 3;
}

/* 程式畫的版本：整張畫布照插畫比例鋪滿，裁切方式跟圖檔版的 object-fit: cover、object-position 相同 */
.scene__canvas {
  position: absolute;
  z-index: 1;
  top: var(--canvas-top);
  left: 50%;
  width: calc(var(--canvas-h) * 2079 / 2943);
  height: var(--canvas-h);
  transform: translateX(-50%);
}

/* 程式畫版本的天空是平塗的單一顏色，比共用的天空色（--scene-sky）飽和一點，跟噴槍畫的山海配起來才不會太灰 */
.scene--drawn {
  background: #b3def7;
}

/* 噴槍畫的質感：形狀改填同色系的漸層（PaintDefs 的 SHADES），上面再鋪一層顆粒；雲和太陽很淺，顆粒淡一點才不會髒 */
.scene--drawn .fill-cloud {
  fill: url(#paint-shade-cloud);
}

.scene--drawn .fill-mountain-far {
  fill: url(#paint-shade-mountain-far);
}

.scene--drawn .fill-mountain {
  fill: url(#paint-shade-mountain);
}

.scene--drawn .fill-sea {
  fill: url(#paint-shade-sea);
}

.scene--drawn .fill-bush {
  fill: url(#paint-shade-bush);
}

.scene--drawn .fill-bush-deep {
  fill: url(#paint-shade-bush-deep);
}

.scene--drawn .fill-grass {
  fill: url(#paint-shade-grass);
}

.scene--drawn .fill-grass-deep {
  fill: url(#paint-shade-grass-deep);
}

.scene--drawn .fill-grass-light {
  fill: url(#paint-shade-grass-light);
}

.scene__grain {
  fill: url(#paint-grain-cover);
}

/* 線條（樹枝）上的顆粒 */
.scene__grain-line {
  stroke: url(#paint-grain-cover);
}

.scene__grain--soft {
  opacity: 0.45;
}

/* 偷看新人的藍白貓：毛和白毛是漸層（PaintDefs 的 cat-fur、cat-white），眼睛是黃綠漸層（cat-eye），其他五官平塗；眼睛描一圈墨色細線，才不會糊進灰藍的毛 */
.scene__cat-fur {
  fill: url(#paint-shade-cat-fur);
}

.scene__cat-white {
  fill: url(#paint-shade-cat-white);
}

.scene__cat-ear {
  fill: #f4b3bd;
}

.scene__cat-blush {
  fill: rgba(240, 130, 140, 0.45);
}

.scene__cat-eye {
  fill: url(#paint-shade-cat-eye);
  stroke: #2b2523;
  stroke-width: 0.9;
}

.scene__cat-pupil {
  fill: #2b2523;
}

.scene__cat-shine {
  fill: #fff;
}

.scene__cat-nose {
  fill: #ee8e9e;
}

.scene__cat-mouth {
  fill: none;
  stroke: #2b2523;
  stroke-width: 1.3;
  stroke-linecap: round;
}

.scene__cat-toe {
  fill: none;
  stroke: #2b2523;
  stroke-width: 1.1;
  stroke-linecap: round;
}

/* 會動的那一層獨立成一個圖層，動畫時只重畫這一層 */
.scene__canvas--motion {
  will-change: transform;
}

/*
 * 樹那一層只畫 2000 以下，捲動時移動的圖層小一點。樹跟著紙走（見 trees-lead），這一層不照其他畫布裁切：
 * 畫布座標 2530（桌機橫式首屏的下緣）固定對齊首屏下緣，各種螢幕的樹都站在紙的上緣，樹幹底部（script 的 TREE_GROUND）藏在紙底下
 */
.scene__canvas--trees {
  top: calc(var(--scene-h) - var(--canvas-h) * 530 / 2943);
  height: calc(var(--canvas-h) * 943 / 2943);
}

/* 日出的太陽：淡黃色的漸層，不描邊 */
.scene__sun {
  fill: url(#paint-shade-sun);
}

/* 日期排列用的圓弧，本身不畫出來 */
.scene__sun-arc {
  fill: none;
}

/* 太陽外圍的大字日期：跟左上角的日期同樣是圓體粗字、黃色字加手繪深色外框（外框先畫，框線才在字的外側） */
.scene__sun-num {
  fill: #ffd65a;
  stroke: #2b2523;
  stroke-width: 12px;
  stroke-linejoin: round;
  paint-order: stroke fill;
  font-family: 'Fredoka', var(--font-sans);
  font-size: 140px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.scene__sun-tag {
  fill: #2b2523;
  font-family: 'Fredoka', var(--font-sans);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.35em;
}

/* 直式螢幕看不到，橫式螢幕才出現 */
.scene__sun-date {
  display: none;
}

/* 流動的海紋：深藍色的斜短線（同 SEA_MARK_COLOR），線寬以圖樣的座標計 */
.scene__sea-mark {
  fill: none;
  stroke: #2a7fc6;
  stroke-width: 2.4px;
  stroke-linecap: round;
}

.scene__bird {
  fill: none;
  stroke: #6b86a0;
  stroke-width: 6px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 首屏的樹（見 puffyTree.js）：顏色照參考網站的樹，再做成漸層（PaintDefs 的 SHADES）；樹枝細，用樹幹漸層的中間色；線寬以畫布座標計 */
.scene__tree--mint .scene__tree-crown {
  fill: url(#paint-shade-tree-mint);
}

.scene__tree--green .scene__tree-crown {
  fill: url(#paint-shade-tree-green);
}

.scene__tree--deep .scene__tree-crown {
  fill: url(#paint-shade-tree-deep);
}

.scene__tree-trunk {
  fill: url(#paint-shade-trunk);
}

.scene__tree-branch,
.scene__grain-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.scene__tree-branch {
  stroke: #8b5a2e;
}

.scene__tree--mint .scene__tree-leaf {
  fill: #cfe36a;
}

.scene__tree--deep .scene__tree-leaf {
  fill: #4cbb6c;
}

.scene__tree-mark {
  fill: none;
  stroke: #2b2523;
  stroke-width: 4.5px;
  stroke-linecap: round;
}

/* 飄在空中的東西下方都有一塊平塗的影子，看起來才有浮起來的立體感 */
.scene__shadow {
  fill: rgba(40, 100, 150, 0.2);
  transform-box: fill-box;
  transform-origin: center;
}

.scene__couple {
  position: absolute;
  z-index: 4;
  right: 0;
  bottom: var(--couple-bottom);
  left: 0;
  width: var(--couple-w);
  margin: 0 auto;
}

.scene__couple-img {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
}

/* 人物跳起來時，腳下草地上的影子 */
.scene__couple-shadow {
  position: absolute;
  bottom: calc(var(--couple-w) * -0.025);
  left: 16%;
  width: 66%;
  height: calc(var(--couple-w) * 0.06);
  border-radius: 50%;
  background: rgba(35, 80, 30, 0.22);
}

.scene__couple-body {
  position: relative;
}

/* 對話框：白底配粗粗的深色手繪框（跟快捷按鈕同一組抖動濾鏡）；字不跟著抖，字小，抖起來像歪掉 */
.scene__say {
  position: absolute;
  inset: 0;
}

.scene__say-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: url(#paint-sketch-names);
}

/* 框線跟著人物縮放，手機上最細也比快捷按鈕的框線粗一點 */
.scene__say-bubble {
  fill: #fff;
  stroke: #2b2523;
  stroke-width: max(2.4px, calc(var(--couple-w) * 0.0065));
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

/*
 * 圓體黑字，字級跟著人物縮放才會剛好裝進框裡；粉圓只有一種字重，描一圈同色的邊加粗，字距放寬。
 * 字距會在最後一個字後面多出一段空白，前面縮排同樣寬度，字才會置中
 */
.scene__say-text {
  position: absolute;
  margin: 0;
  color: #2b2523;
  font-family: var(--font-sans);
  font-size: calc(var(--couple-w) * 0.05);
  line-height: 1.25;
  letter-spacing: 0.12em;
  text-indent: 0.12em;
  -webkit-text-stroke: 0.045em currentColor;
  white-space: nowrap;
  translate: -50% -50%;
}

.scene__char {
  display: inline-block;
}

/* 全形驚嘆號的筆畫只在字身正中間，左右各空了快半個字，收緊才不會像多了一格空白 */
.scene__char--punct {
  margin: 0 -0.35em 0 -0.3em;
}

/*
 * 大字日期：年、月、日直排放大，下方接小字 SAVE THE DATE，放在左上角、靠左對齊；疊在雲上、人物後面。
 * 圓體粗字、黃色字加深色外框，行距與字距放寬一點。
 * 原本的插畫（?painted）直式螢幕上方正中間是「We Are Married」字樣，日期接在字樣下方（右側有愛心和小鳥，下方是人物舉起的手）
 */
.scene__date {
  position: absolute;
  z-index: 3;
  top: calc(var(--title-bottom) + 20px);
  left: var(--side);
  margin: 0;
  color: #ffd65a;
  font-family: 'Fredoka', var(--font-sans);
  font-size: clamp(30px, min(13vw, calc(6 * var(--vh))), 64px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0.04em;
  /* 外框先畫、填色蓋在上面，框線才會畫在字的外側，不會吃掉黃色；字大，線比按鈕粗一點 */
  -webkit-text-stroke: 6px #2b2523;
  paint-order: stroke fill;
}

.scene__date-num {
  display: block;
  filter: url(#paint-sketch-date);
}

.scene__date-tag {
  display: block;
  margin-top: 14px;
  color: #2b2523;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  letter-spacing: 0.35em;
  -webkit-text-stroke: 0;
}

/*
 * 程式畫的版本在直式螢幕也照桌機的構圖：山谷裡升起的太陽與日期、山、海、人物，上方不放「We Are Married」字樣。
 * 整張畫布太寬，放大到畫面寬度剛好看得到中間 900 單位（太陽外圍的日期約 680 寬，兩側留一點空）。
 * 畫布的底貼齊首屏的底；比較寬的直式螢幕（平板）放不下整段，改成日期的上緣（畫布 1500）離畫面頂端留一點空，裁掉下方的草地。
 * 人物照畫布擺：上緣（對話框）對準畫布 1865，跟桌機一樣對話框和舉起的手疊在太陽前面，日期排在上方的天空，
 * 腳下留一段草地。快捷按鈕上方的空間不夠時才把人物往上推。
 * 天空的愛心和小鳥在日期上方很遠的地方，高的手機只露出一半（只看得到愛心的影子），跟桌機一樣不畫
 */
@media not all and (min-aspect-ratio: 4/5) {
  .scene--drawn {
    --canvas-h: max(var(--scene-h), 100vw * 2943 / 900);
    --canvas-top: clamp(
      var(--scene-h) - var(--canvas-h),
      3 * var(--vh) - var(--canvas-h) * 1500 / 2943,
      0px
    );
    --couple-bottom: max(
      4% + var(--nav-bottom) + var(--nav-h) + 8px,
      var(--scene-h) - var(--canvas-top) - var(--canvas-h) * 1865 / 2943 - var(--couple-w) * 864 / 960
    );
  }

  .scene--drawn .scene__part--sky {
    display: none;
  }

  /*
   * 樹站在畫布兩側，直式螢幕看不到；左右兩組各自往中間挪（畫布座標），貼著畫面兩側框住人物。用 translate，顆粒不會跟著縮放。
   * 手機的快捷按鈕幾乎跟畫面一樣寬，樹站在紙的上緣會被擋掉半個樹冠：樹冠的下緣（畫布約 2470）抬到按鈕上緣，
   * 樹幹拉長（script 的 TREE_GROUND.tall），從按鈕後面一路長到紙底下，捲動時才看不到樹幹的底
   */
  .scene--drawn .scene__canvas--trees {
    top: calc(var(--scene-h) - var(--nav-bottom) - var(--nav-h) - var(--canvas-h) * 470 / 2943);
  }

  .scene--drawn .scene__trees--left {
    transform: translateX(420px);
  }

  .scene--drawn .scene__trees--right {
    transform: translateX(-470px);
  }

  .scene--drawn .scene__tree--wide-only {
    display: none;
  }

  .scene--drawn .scene__date {
    display: none;
  }

  .scene--drawn .scene__sun-date {
    display: inline;
  }
}

/* 橫式螢幕：畫面放不下整張插畫，改成對準雲、海與山丘 */
@media (min-aspect-ratio: 4/5) {
  .scene {
    --focus-y: 0.78;
  }

  /* 上方字樣被裁掉，日期直接放在左上角 */
  .scene__date {
    top: max(32px, calc(9 * var(--vh)));
    font-size: clamp(40px, min(7vw, calc(9 * var(--vh))), 96px);
  }
}

/*
 * 夠寬的橫式螢幕：日期改成山谷裡升起的太陽（再窄一點的話，人物會擋住整個山谷）。
 * 天空的愛心和小鳥在畫面上緣外面，平板橫放時只露出小鳥的影子，不畫
 */
@media (min-aspect-ratio: 6/5) {
  .scene__date,
  .scene__part--sky {
    display: none;
  }

  .scene__sun-date {
    display: inline;
  }
}

/* 偏方的橫式螢幕（例如平板橫放）人物比較大，舉起的手會碰到日期，日期往上移一點（畫布座標）；太陽留在原處，不會露出更多 */
@media (min-aspect-ratio: 6/5) and (max-aspect-ratio: 8/5) {
  .scene__sun-shift {
    transform: translateY(-150px);
  }
}

/* 寬螢幕的快捷按鈕比較大 */
@media (min-width: 768px) {
  .cover {
    --nav-bottom: 24px;
    --nav-h: 48px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  /* 首屏跟著捲動慢半拍（見 script 的 LAG）：捲過一個首屏高的期間，往下補回一半的距離，之後停在那裡跟著頁面捲走 */
  @supports (animation-timeline: scroll()) {
    .cover {
      animation: cover-lag linear both;
      animation-timeline: scroll(root);
      animation-range: 0 var(--scene-h);
    }

    /* 樹那一層把首屏落後的距離補回來，照正常速度跟著紙一起捲走；用 translate，不會蓋掉置中用的 transform */
    .scene__canvas--trees {
      animation: trees-lead linear both;
      animation-timeline: scroll(root);
      animation-range: 0 var(--scene-h);
    }
  }

  .scene__layer,
  .scene__couple,
  .scene__date {
    opacity: 0;
  }

  /* 日期跟在人物後面浮上來 */
  .scene.is-ready .scene__date {
    animation: rise-in 1.2s var(--ease-out) 1.8s both;
  }

  /* 程式畫的版本：跟圖檔版一樣依序浮現（草坡與遠山 → 海 → 雲），之後海紋流動、雲飄、愛心浮、小鳥拍翅 */
  .scene__part {
    opacity: 0;
  }

  .scene.is-ready .scene__part {
    animation: rise-in-part 1.2s var(--ease-out) both;
  }

  .scene.is-ready .scene__part--sea {
    animation-delay: 0.45s;
  }

  .scene.is-ready .scene__part--clouds {
    animation-delay: 0.9s;
  }

  /* 日期跟在人物後面，像日出一樣從山後面慢慢升上來 */
  .scene.is-ready .scene__part--date {
    animation: sun-rise 2s var(--ease-out) 1.6s both;
  }

  .scene__sea-flow {
    animation: sea-flow 44s linear infinite;
  }

  .scene__heart {
    animation: heart-float 3.2s ease-in-out infinite alternate;
  }

  /*
   * 藍白貓等兩人的名字都寫完才出場：頭從稜線後面冒出來，白腳掌接著搭上稜線，「喵！」的對話框跟著跳出來。
   * 時間都照貓的對話框的 --order 算（對話框在 1.9s + order × 0.15s 跳出來），頭比對話框早一點開始冒；
   * 出場後頭慢慢縮回去一點又探出來，像在偷看，腳掌搭在稜線上不動
   */
  .scene.is-ready .scene__cat {
    animation: cat-appear 0.3s var(--ease-out) calc(1.65s + var(--order) * 0.15s) both;
  }

  .scene.is-ready .scene__cat-paws {
    animation: cat-paws 0.18s var(--ease-out) calc(1.85s + var(--order) * 0.15s) both;
  }

  .scene.is-ready .scene__cat-bob {
    animation: cat-peek 3.4s ease-in-out calc(2.05s + var(--order) * 0.15s) infinite alternate;
  }

  /* 愛心往上飄時影子跟著縮小變淡 */
  .scene__heart-shadow {
    animation: shadow-breathe 3.2s ease-in-out infinite alternate;
  }

  .scene.is-ready .scene__couple-shadow {
    animation: shadow-breathe-loop 3.6s ease-in-out 2.2s infinite;
  }

  .scene__bird {
    transform-box: fill-box;
    transform-origin: center;
    animation: bird-flap 0.9s ease-in-out infinite alternate;
  }

  .scene__bird + .scene__bird {
    animation-delay: -0.45s;
  }

  .scene.is-ready .scene__layer {
    animation: rise-in 1.2s var(--ease-out) both;
  }

  .scene.is-ready .scene__layer--sea {
    animation-delay: 0.45s;
  }

  .scene.is-ready .scene__layer--cloud {
    animation-delay: 0.9s;
  }

  /*
   * 人物在風景升起後（1.5s）出場。人物、名字的對話框和手寫、貓的出場都壓得很快（之前各慢一倍，等太久）：
   * 人物 0.7s 浮出來，對話框 0.25s 彈出來，一個字 0.28s 寫完、每 0.15s 接下一個字
   */
  .scene.is-ready .scene__couple {
    animation: emerge 0.7s var(--ease-out) 1.5s both;
  }

  /* 進場結束（1.5s + 0.7s）後開始上下浮動 */
  .scene.is-ready .scene__couple-body {
    animation: float 3.6s ease-in-out 2.2s infinite;
  }

  /* 手寫效果：遮罩從每個字的左上往右下掃過，一個字接一個字寫出來 */
  .scene__char {
    -webkit-mask-image: linear-gradient(to bottom right, #000 45%, transparent 55%);
    mask-image: linear-gradient(to bottom right, #000 45%, transparent 55%);
    -webkit-mask-size: 300% 300%;
    mask-size: 300% 300%;
    -webkit-mask-position: 85% 85%;
    mask-position: 85% 85%;
  }

  .cover.is-ready .scene__char {
    animation: write 0.28s ease-in-out calc(2s + var(--order) * 0.15s) both;
  }

  /* 對話框先從尖角彈出來，再一個字一個字寫名字；新郎喊完，換新娘的對話框跳出來 */
  .scene__say {
    opacity: 0;
  }

  .cover.is-ready .scene__say {
    animation: pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) calc(1.9s + var(--order) * 0.15s) both;
  }
}

@keyframes cover-lag {
  to {
    transform: translateY(calc(var(--scene-h) * 0.5));
  }
}

@keyframes trees-lead {
  to {
    translate: 0 calc(var(--scene-h) * -0.5);
  }
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 遮罩大小是字的 3 倍，位置 85% 時整個字被遮住、15% 時完全露出 */
@keyframes write {
  from {
    -webkit-mask-position: 85% 85%;
    mask-position: 85% 85%;
  }
  to {
    -webkit-mask-position: 15% 15%;
    mask-position: 15% 15%;
  }
}

/* 畫布座標：從山後面 360 的位置升上來，一開始就不透明，靠前面的山擋住 */
@keyframes sun-rise {
  from {
    opacity: 0;
    transform: translateY(360px);
  }
  15% {
    opacity: 1;
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes rise-in-part {
  from {
    opacity: 0;
    transform: translateY(160px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 海紋往左移一格（圖樣寬 780）就能無縫循環 */
@keyframes sea-flow {
  to {
    transform: translateX(-780px);
  }
}

@keyframes heart-float {
  to {
    transform: translateY(-24px);
  }
}

/* 以下是畫布單位。出場前整顆頭（連耳朵）藏在稜線後面 */
@keyframes cat-appear {
  from {
    transform: translateY(90px);
  }
}

@keyframes cat-paws {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

/* 縮回去時鼻子剛好藏到稜線後面，眼睛還露在外面 */
@keyframes cat-peek {
  to {
    transform: translateY(8px);
  }
}

@keyframes shadow-breathe {
  to {
    opacity: 0.55;
    transform: scaleX(0.75);
  }
}

/* 跟人物的 float 同步：人物在最高點（50%）時影子最小 */
@keyframes shadow-breathe-loop {
  0%,
  100% {
    transform: none;
  }
  50% {
    opacity: 0.6;
    transform: scaleX(0.85);
  }
}

@keyframes bird-flap {
  to {
    transform: scaleY(0.55);
  }
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(18%);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes emerge {
  from {
    opacity: 0;
    transform: translateY(8%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4%);
  }
}
</style>
