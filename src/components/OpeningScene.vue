<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { wedding } from '../config.js'
import mountainUrl from '../assets/mountain.svg'
import seaUrl from '../assets/sea.svg'
import cloudUrl from '../assets/cloud.svg'
import coupleUrl from '../assets/couple.svg'
import { circle, sketch, sketchBand } from '../utils/sketch.js'
import { SEA_MARKS } from '../utils/seaMarks.js'
import { GRAIN_SIZE, grainDot } from '../utils/grain.js'
import { puffyTree } from '../utils/puffyTree.js'
import { vPauseOffscreen } from '../utils/offscreen.js'
import { bubblePath } from '../utils/speechBubble.js'
import { CAT_SAY } from '../utils/blueCat.js'
import DrawnCouple from './DrawnCouple.vue'
import BlueCat from './BlueCat.vue'

const props = defineProps({
  // true：山、海、雲與人物改用程式畫的版本（手繪線條、會流動）；false：原本的插畫圖檔
  drawn: { type: Boolean, default: false },
})

// 畫布座標裡一格顆粒圖樣該多大，交給共用的 PaintDefs 畫 paint-grain-cover；
// 進場開始時通知一聲，快捷按鈕上的貓跟首屏的貓同一拍出場（見 SiteNav）
const emit = defineEmits(['grain-tile', 'ready'])

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
 * 首屏的循環動畫（海紋、人物浮動、捧花、貓）捲走就停（見 utils/offscreen.js）。
 * 首屏落後捲動，往下捲一個首屏高、紙蓋滿畫面時，首屏的下半截其實還在畫面的上半部，只是被紙蓋住；
 * 那時首屏的下緣剛好在畫面高度的 LAG 處，所以只拿畫面在那條線以下的部分來判斷，紙一蓋滿就停。
 * 再多扣 1%：剛好捲到婚紗那一區時首屏的下緣正好貼著那條線，貼著也算在畫面上。
 * 瀏覽器會把百分比換成整數像素（小數捨去），多扣不到 1px 會被捨掉；多扣 1% 是紙的上緣離畫面頂端剩十幾 px 時就停，那一條看不出來
 */
const coverMargin = `${-(LAG * 100 + 1)}% 0px 0px 0px`

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
  // 樹冠、樹枝、葉子的位置只跟樹冠中心有關，兩種版式只差在樹幹的長度
  const grow = (list) =>
    list.map(({ cy, tall = true, ...t }) => {
      const [wide, high] = [TREE_GROUND.wide, TREE_GROUND.tall].map((y) => puffyTree({ ...t, y, height: y - cy }))
      return { tone: t.tone, tall, mark: wide.mark, layers: { wide: wide.layers, tall: high.layers } }
    })

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

/*
 * 名字拆成單字（驚嘆號要另外收緊），字直接印在對話框裡、跟著框一起彈出來（原本一個字一個字手寫出來，已經拿掉）。
 * order 是對話框第幾拍跳出來（一拍 0.25s，見樣式的 scene__say）：新郎、新娘各佔一拍，新郎的框彈完就換新娘
 * （原本照手寫的節奏，名字有幾個字就等幾拍，拿掉手寫後中間空等太久）
 */
const speakers = SPEAKERS.map(({ name, tilt, wide, tall = wide }, order) => {
  const chars = Array.from(`${name}！`).map((char) => ({ char, punct: char === '！' }))
  // 一個字（含字距）1.12 個字寬，收緊的驚嘆號 0.47，左右再留 0.8 個字寬
  const w = chars.reduce((sum, c) => sum + (c.punct ? 0.35 : 1) + SAY_TRACK, 0) * SAY_SIZE + SAY_SIZE * 1.6
  const place = ({ cx, cy, base, tip }) => ({
    bubble: bubblePath(cx, cy, w, SAY_SIZE * 2.1, tilt, base, tip),
    left: `${(cx / VIEW.w) * 100}%`,
    top: `${(cy / VIEW.h) * 100}%`,
    // 對話框從尖角那裡彈出來
    origin: `${(tip[0] / VIEW.w) * 100}% ${(tip[1] / VIEW.h) * 100}%`,
  })
  return { order, chars, wide: place(wide), tall: place(tall) }
})

/*
 * 偷看的藍白貓也喊一聲「喵！」：等新娘喊完，貓才從稜線後面冒出來，對話框跟著跳出來
 * （order 接在兩人後面多停一拍，貓出場的時間也照這個 order 算，見樣式的 scene__cat）。
 * 框的形狀和位置見 utils/blueCat.js 的 CAT_SAY（首屏畫布座標），字級跟貓一樣照畫布縮放。
 * 直式螢幕看不到首屏的貓，改成快捷按鈕上的貓在喊（見 SiteNav）
 */
const catSay = {
  order: speakers.length + 1,
  chars: CAT_SAY.chars,
  bubble: CAT_SAY.bubble,
  left: `${(CAT_SAY.at[0] / 2079) * 100}%`,
  top: `${(CAT_SAY.at[1] / 2943) * 100}%`,
  fontSize: `calc(var(--canvas-h) * ${CAT_SAY.size} / 2943)`,
  origin: `${(CAT_SAY.tip[0] / 2079) * 100}% ${(CAT_SAY.tip[1] / 2943) * 100}%`,
}

// 橫式首屏的貓搭在後面那叢樹叢的稜線上，跟著稜線往右下斜一點
const CAT_PAWS = [
  [384, 1887, 5],
  [431, 1893, 5],
]

// 跟 CSS 的直式斷點（6/5）一致：平板跟手機一樣是直式的構圖，新郎的對話框換位置、樹冠抬高；首屏的貓只在橫式畫
const wideQuery = window.matchMedia('(min-aspect-ratio: 6/5)')
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
  emit('ready')
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
      v-pause-offscreen="coverMargin"
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
            整組在山的後面，太陽下半部被山擋住，人物在前面
          -->
          <g class="scene__part scene__part--date">
            <path class="scene__sun" :d="art.sun" />
            <rect class="scene__grain scene__grain--soft" clip-path="url(#cover-grain-sun)" width="100%" height="100%" />
            <g class="scene__sun-shift">
              <text class="scene__sun-tag" x="1060" y="1790" text-anchor="middle">SAVE THE DATE</text>
              <path id="cover-sun-arc" class="scene__sun-arc" d="M693 2010A367 367 0 0 1 1427 2010" />
              <!--
                圓點左右用 dx 留空隙；圓點的字比數字小（跟數字一樣大太搶眼），
                字縮小後圓點會跟著往下掉，dy 往上提到數字的中線，下一段再拉回來
              -->
              <text class="scene__sun-num" filter="url(#paint-sketch-horizon)">
                <textPath href="#cover-sun-arc" startOffset="50%" text-anchor="middle">{{ year }}<tspan class="scene__sun-dot" dx="24" dy="-20">·</tspan><tspan dx="24" dy="20">{{ month }}</tspan><tspan class="scene__sun-dot" dx="24" dy="-20">·</tspan><tspan dx="24" dy="20">{{ day }}</tspan></textPath>
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

        <!--
          中層（會動）：海紋。外框跟畫布一樣大小、一樣裁切，裡面那張 svg 只畫海面（畫布 2070 以下），比畫布寬一格圖樣，
          整張往左移一格就能無縫循環。動的是 svg 本身，畫好一次交給 GPU 搬；
          原本動的是 svg 裡面的形狀，手機（尤其 Safari）每一格都要重畫整片海，會發熱
        -->
        <div class="scene__canvas scene__sea" aria-hidden="true">
          <svg class="scene__sea-flow" viewBox="0 2070 3120 873">
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
            <rect x="0" y="2070" width="3120" height="873" fill="url(#cover-sea-marks)" />
          </svg>
        </div>

        <!-- 前層（靜態）：樹叢、草坡 -->
        <svg class="scene__canvas" viewBox="0 0 2079 2943" aria-hidden="true">
          <defs>
            <clipPath id="cover-grain-land">
              <path :d="art.bushBack" />
              <path :d="art.bushFront" />
              <path :d="art.slopeBack" />
              <path :d="art.slopeFront" />
            </clipPath>
          </defs>
          <g class="scene__part scene__part--land">
            <!--
              藍白貓躲在左邊兩座樹叢中間的凹口，從後面那叢的稜線後面探出頭，臉轉向右邊，從遠方偷看新人（頭只比新郎的頭大一點）。
              比樹叢先畫，下半個頭被後面那叢蓋住。直式螢幕這一段被裁掉，不畫（改成快捷按鈕上的貓，見 SiteNav）。
              外層管出場（從稜線後面冒出來），內層管之後的探頭、縮頭，兩個動畫才不會搶同一個 transform
            -->
            <g v-if="layout === 'wide'" class="scene__cat" :style="{ '--order': catSay.order }">
              <g class="scene__cat-bob"><BlueCat /></g>
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
            <g v-if="layout === 'wide'" class="scene__cat-paws" :style="{ '--order': catSay.order }">
              <BlueCat part="paws" :paws="CAT_PAWS" />
            </g>
          </g>
        </svg>

        <!-- 藍白貓的對話框：疊在風景上，跟畫布一樣大小、一樣裁切，尖角才會一直對著貓 -->
        <div v-if="layout === 'wide'" class="scene__canvas scene__cat-say">
          <div class="scene__say" :style="{ '--order': catSay.order, transformOrigin: catSay.origin }">
            <svg class="scene__say-frame" viewBox="0 0 2079 2943" aria-hidden="true">
              <path class="scene__say-bubble" :d="catSay.bubble" />
            </svg>
            <p class="scene__say-text" :style="{ left: catSay.left, top: catSay.top, fontSize: catSay.fontSize }">
              <span
                v-for="(c, i) in catSay.chars"
                :key="i"
                class="scene__char"
                :class="{ 'scene__char--punct': c.punct }"
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
      <!-- 直排的大字日期只有原本的插畫用；程式畫的版本一律是太陽外圍的日期 -->
      <p v-if="!drawn" class="scene__date">
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
                v-for="(c, i) in s.chars"
                :key="i"
                class="scene__char"
                :class="{ 'scene__char--punct': c.punct }"
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
  --nav-h: 48px;
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

/* 海紋：外框照畫布裁切，裡面那張照畫布座標擺在 2070 以下、寬 3120（比畫布多一格圖樣 780） */
.scene__sea {
  overflow: hidden;
}

.scene__sea-flow {
  position: absolute;
  top: calc(2070 / 2943 * 100%);
  left: 0;
  width: calc(3120 / 2079 * 100%);
  height: calc(873 / 2943 * 100%);
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

.scene__sun-dot {
  font-size: 96px;
}

.scene__sun-tag {
  fill: #2b2523;
  font-family: 'Fredoka', var(--font-sans);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.35em;
}

/* 流動的海紋：深藍色的斜短線（同 SEA_MARK_COLOR），線寬以圖樣的座標計 */
.scene__sea-mark {
  fill: none;
  stroke: #2a7fc6;
  stroke-width: 2.4px;
  stroke-linecap: round;
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
 * 原本的插畫（?painted）才有的大字日期：年、月、日直排放大，下方接小字 SAVE THE DATE，放在左上角、靠左對齊；疊在雲上、人物後面。
 * 圓體粗字、黃色字加深色外框，行距與字距放寬一點。
 * 直式螢幕上方正中間是「We Are Married」字樣，日期接在字樣下方（右側有愛心和小鳥，下方是人物舉起的手）
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
 * 直式一路用到長寬比 6/5：平板（連偏方的視窗）跟手機同一套，不另外排一個版本（原本 4/5～6/5 改放左上角的直排日期和天空的愛心、小鳥，已經拿掉）。
 * 整張畫布太寬，放大到畫面寬度剛好看得到中間 900 單位（太陽外圍的日期約 680 寬，兩側留一點空）。
 * 畫布的底貼齊首屏的底；比較寬的直式螢幕（平板）放不下整段，改成日期的上緣（畫布 1500）離畫面頂端留一點空，裁掉下方的草地。
 * 人物照畫布擺：上緣（對話框）對準畫布 1865，跟桌機一樣對話框和舉起的手疊在太陽前面，日期排在上方的天空，
 * 腳下留一段草地。偏方的視窗看得到的畫布矮，畫布 1865 到快捷按鈕之間放不下人物時把人物縮小，
 * 往上推會撞到日期；縮到這樣還放不下（很矮的視窗）才往上推
 */
@media not all and (min-aspect-ratio: 6/5) {
  .scene--drawn {
    --canvas-h: max(var(--scene-h), 100vw * 2943 / 900);
    --canvas-top: clamp(
      var(--scene-h) - var(--canvas-h),
      3 * var(--vh) - var(--canvas-h) * 1500 / 2943,
      0px
    );
    /* 寬度用的百分比是畫面寬，按鈕離底的 4% 改寫成首屏高度 */
    --couple-w: min(
      88vw,
      53 * var(--vh),
      (var(--scene-h) * 0.96 - var(--nav-bottom) - var(--nav-h) - 8px - var(--canvas-top) - var(--canvas-h) * 1865 / 2943) *
        960 / 864
    );
    --couple-bottom: max(
      4% + var(--nav-bottom) + var(--nav-h) + 8px,
      var(--scene-h) - var(--canvas-top) - var(--canvas-h) * 1865 / 2943 - var(--couple-w) * 864 / 960
    );
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
}

/* 橫式螢幕：畫面放不下整張插畫，改成對準雲、海與山丘（程式畫的版本 6/5 以下另外對準，見上面的直式螢幕） */
@media (min-aspect-ratio: 4/5) {
  .scene {
    --focus-y: 0.78;
  }

  /* 原本的插畫：上方字樣被裁掉，日期直接放在左上角 */
  .scene__date {
    top: max(32px, calc(9 * var(--vh)));
    font-size: clamp(40px, min(7vw, calc(9 * var(--vh))), 96px);
  }
}

/* 原本的插畫在夠寬的橫式螢幕不放日期 */
@media (min-aspect-ratio: 6/5) {
  .scene__date {
    display: none;
  }
}

/* 偏方的橫式螢幕（例如平板橫放）人物比較大，舉起的手會碰到日期，日期往上移一點（畫布座標）；太陽留在原處，不會露出更多 */
@media (min-aspect-ratio: 6/5) and (max-aspect-ratio: 8/5) {
  .scene__sun-shift {
    transform: translateY(-150px);
  }
}

/* 寬螢幕的快捷按鈕離底比較遠 */
@media (min-width: 768px) {
  .cover {
    --nav-bottom: 24px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  /*
   * 首屏和樹那一層跟著捲動移動，獨立成圖層，捲動時只要搬動、不必重畫。
   * 支援捲動時間軸的瀏覽器本來就會這樣做；不支援的由 script 每一格改位移，沒有這行的話每一格都要重畫整個首屏
   */
  .cover,
  .scene__canvas--trees {
    will-change: transform;
  }

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

  /*
   * 程式畫的版本：風景（雲、山、海、草坡、樹叢）一開始就在原位，不升起也不淡入（原本依序從下面升上來，已經拿掉）；
   * 進場只動樹、人物、太陽和日期、貓，整段約 1.5s 跑完（原本約 4s，等太久）：
   * 樹和人物一起升起（0～0.7s），太陽和日期跟著從山後面升上來，對話框依序跳出來，貓最後探頭。之後海紋流動
   */
  .scene__canvas--trees .scene__part,
  .scene__part--date {
    opacity: 0;
  }

  .scene.is-ready .scene__canvas--trees .scene__part {
    animation: rise-in-part 0.7s var(--ease-out) both;
  }

  /* 日期跟在人物後面，像日出一樣從山後面升上來 */
  .scene.is-ready .scene__part--date {
    animation: sun-rise 1.2s var(--ease-out) 0.2s both;
  }

  /* 貓所在的樹叢一開始就看得到，圖和字型還沒載完、進場還沒開始前先把貓藏起來，不然會先看到貓趴在稜線上 */
  .scene:not(.is-ready) .scene__cat,
  .scene:not(.is-ready) .scene__cat-paws {
    visibility: hidden;
  }

  /* 海紋只有桌機會流：平板、手機（比 1024px 窄）停在原位，省一點循環動畫 */
  @media (min-width: 1024px) {
    .scene__sea-flow {
      animation: sea-flow 44s linear infinite;
      animation-play-state: var(--loop, running);
    }
  }

  /*
   * 藍白貓等兩人都喊完才出場：頭從稜線後面冒出來，白腳掌接著搭上稜線，「喵！」的對話框跟著跳出來。
   * 時間都照貓的對話框的 --order 算（對話框在 0.5s + order × 0.25s 跳出來），頭比對話框早一點開始冒；
   * 出場後頭慢慢縮回去一點又探出來，像在偷看，腳掌搭在稜線上不動
   */
  .scene.is-ready .scene__cat {
    animation: cat-appear 0.3s var(--ease-out) calc(0.25s + var(--order) * 0.25s) both;
  }

  .scene.is-ready .scene__cat-paws {
    animation: cat-paws 0.18s var(--ease-out) calc(0.45s + var(--order) * 0.25s) both;
  }

  .scene.is-ready .scene__cat-bob {
    animation: cat-peek 3.4s ease-in-out calc(0.65s + var(--order) * 0.25s) infinite alternate;
    animation-play-state: var(--loop, running);
  }

  .scene.is-ready .scene__couple-shadow {
    animation: shadow-breathe-loop 3.6s ease-in-out 0.7s infinite;
    animation-play-state: var(--loop, running);
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
   * 人物跟樹一起出場（原本等樹升起後 1.5s 才出來）。人物 0.7s 浮出來，快浮好時（0.5s）對話框連同名字 0.25s 彈出來，
   * 每 0.25s 一拍（見 script 的 order）
   */
  .scene.is-ready .scene__couple {
    animation: emerge 0.7s var(--ease-out) both;
  }

  /* 進場結束（0.7s）後開始上下浮動 */
  .scene.is-ready .scene__couple-body {
    animation: float 3.6s ease-in-out 0.7s infinite;
    animation-play-state: var(--loop, running);
  }

  /* 對話框連同名字從尖角彈出來；新郎喊完，換新娘的對話框跳出來 */
  .scene__say {
    opacity: 0;
  }

  .cover.is-ready .scene__say {
    animation: pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) calc(0.5s + var(--order) * 0.25s) both;
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

/* 海紋往左移一格（圖樣寬 780，是整張 3120 的 1/4）就能無縫循環 */
@keyframes sea-flow {
  to {
    transform: translateX(-25%);
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
