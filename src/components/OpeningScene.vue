<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { wedding } from '../config.js'
import mountainUrl from '../assets/mountain.svg'
import seaUrl from '../assets/sea.svg'
import cloudUrl from '../assets/cloud.svg'
import coupleUrl from '../assets/couple.svg'
import { brush, circle, sketch, sketchBand } from '../utils/sketch.js'
import { SEA_MARKS } from '../utils/seaMarks.js'
import DrawnCouple from './DrawnCouple.vue'

const props = defineProps({
  // true：山、海、雲與人物改用程式畫的版本（手繪線條、會流動）；false：原本的插畫圖檔
  drawn: { type: Boolean, default: false },
})

const scene = ref(null)
const ready = ref(false)

/*
 * 程式畫版本的構圖：畫布座標與原插畫相同（2079×2943），名字、日期、人物的位置計算可以共用。
 * 形狀不描邊，邊緣帶一點手繪的不規則；再疊幾筆同色系深一點或淺一點的粗筆觸（marks）帶出亮面與陰影
 */
const art = props.drawn ? drawCover() : null

function drawCover() {
  const BOTTOM = 3000
  const opt = (seed, extra) => ({ step: 10, amp: 5, wavelength: 160, seed, ...extra })
  const puffs = (list, seed) =>
    list.map(([cx, cy, r], i) => sketch(circle(cx, cy, r), opt(seed + i, { amp: 4, wavelength: 110 })))
  const blob = (d, seed) => sketch(d, opt(seed, { amp: 3, wavelength: 100 }))
  const band = (edge, bottom, seed) => sketchBand(edge, bottom, opt(seed)).fill
  // 細筆觸：一筆兩端收尖的主線，旁邊再補一筆短一點、細一點的，像鉛筆來回描過
  const marks = (list, seed, width) => {
    const stroke = { step: 6, amp: 2.5, wavelength: 60 }
    return list.flatMap((d, i) => [
      brush(d, opt(seed + i, { ...stroke, width })),
      brush(d, opt(seed + i + 50, { ...stroke, width: width * 0.7, from: 0.2, to: 0.75, offset: width * 1.8 })),
    ])
  }

  return {
    // 雲只放右半邊：日期在左上角，白字才不會疊在白雲上
    clouds: puffs([[2039, 1800, 170], [1829, 1740, 200], [1609, 1790, 165], [1469, 1800, 130]], 10),
    cloudMarks: marks(
      ['M1929 1765C1989 1772 2049 1770 2109 1760', 'M1729 1696C1779 1702 1829 1700 1879 1690', 'M1479 1750C1539 1757 1599 1755 1649 1745'],
      110,
      6,
    ),
    // 遠山中間壓低成山谷：人物剛好被兩側的山框住。山的位置偏低，湖面只留窄窄一條
    mountainFar: band(
      'M-80 1940C120 1900 220 1830 340 1840S520 1910 640 1920S860 1960 1000 1960S1250 1950 1400 1910S1560 1850 1700 1840S1960 1900 2160 1910',
      2100,
      30,
    ),
    mountainFarMarks: marks(
      [
        'M200 1895C250 1875 290 1862 330 1858',
        'M380 1870C430 1880 470 1895 520 1910',
        'M1480 1910C1540 1890 1600 1872 1660 1865',
        'M1760 1870C1820 1880 1870 1892 1920 1905',
      ],
      120,
      5,
    ),
    mountain: band(
      'M-80 1990C160 1970 260 1930 400 1945S640 2010 800 2000S1060 1980 1220 1985S1480 2010 1640 2000S1940 1950 2160 1960',
      2100,
      31,
    ),
    mountainMarks: marks(
      ['M300 1975C350 1968 400 1968 450 1976', 'M1100 2010C1150 2003 1200 2003 1250 2008', 'M1880 1990C1930 1982 1980 1980 2030 1984'],
      130,
      5,
    ),
    sea: band('M-80 2060L2160 2060', BOTTOM, 32),
    // 海平線附近的反光
    seaMarks: marks(
      [
        'M140 2095C200 2093 260 2094 320 2096',
        'M560 2118C600 2116 640 2117 680 2119',
        'M1330 2102C1400 2100 1470 2101 1540 2103',
        'M1800 2130C1840 2128 1880 2129 1920 2131',
      ],
      140,
      4,
    ),
    islands: [
      'M1380 2202C1420 2152 1500 2132 1580 2156S1690 2192 1730 2202Z',
      'M1760 2272C1800 2232 1880 2222 1960 2242S2120 2266 2160 2272Z',
      'M1020 2150C1050 2126 1100 2120 1150 2132S1210 2146 1230 2150Z',
    ].map((d, i) => blob(d, 40 + i)),
    islandMarks: marks(
      ['M1440 2166C1490 2152 1540 2150 1590 2160', 'M1830 2240C1870 2232 1910 2232 1950 2238', 'M1060 2138C1090 2130 1120 2129 1150 2134'],
      150,
      4,
    ),
    bushBack: sketch('M260 1900C380 1860 520 1900 600 1990S640 2140 560 2190L260 2220Z', opt(50)),
    bushFront: sketch('M-80 1700C180 1690 330 1780 380 1920S380 2160 300 2260L-80 2300Z', opt(51)),
    bushMarks: marks(
      ['M40 1750C120 1745 200 1770 260 1820', 'M30 1830C90 1830 150 1850 200 1890', 'M330 1930C390 1915 450 1925 500 1960'],
      160,
      6,
    ),
    slopeBack: band('M-80 2065C400 2010 800 2080 1200 2180S1900 2330 2160 2355', BOTTOM, 52),
    slopeBackMarks: marks(['M300 2045C450 2035 600 2045 750 2070', 'M1300 2210C1450 2240 1600 2275 1750 2305'], 170, 6),
    slopeFront: band('M-80 2125C420 2080 820 2150 1220 2250S1880 2400 2160 2425', BOTTOM, 53),
    patchesLight: [
      'M100 2300C400 2260 700 2310 900 2380C700 2420 400 2420 100 2380Z',
      'M1300 2520C1500 2500 1700 2530 1850 2580C1650 2610 1450 2600 1300 2560Z',
    ].map((d, i) => blob(d, 60 + i)),
    patchesDeep: [
      'M-80 2650C300 2600 600 2640 800 2700C600 2760 300 2760 -80 2730Z',
      'M1200 2760C1500 2720 1800 2740 2160 2790V2860C1800 2840 1500 2840 1200 2800Z',
    ].map((d, i) => blob(d, 70 + i)),
    // 草坡上緣的亮面，與下方的陰影
    slopeLightMarks: marks(
      ['M80 2140C250 2122 420 2125 600 2148', 'M1350 2300C1480 2328 1600 2350 1720 2370', 'M700 2350C800 2345 900 2355 1000 2370'],
      180,
      6,
    ),
    slopeDeepMarks: marks(
      [
        'M250 2520C380 2510 510 2515 640 2532',
        'M1450 2660C1580 2650 1710 2655 1840 2672',
        'M600 2820C730 2812 860 2818 990 2835',
        'M100 2900C200 2895 300 2898 400 2906',
      ],
      190,
      5,
    ),
    bushesRight: puffs([[2079, 2330, 130], [1990, 2385, 110]], 80),
    bushesRightMarks: marks(['M1960 2290C2010 2272 2060 2270 2100 2280', 'M1900 2370C1940 2358 1980 2356 2010 2362'], 200, 5),
    bushRightFront: puffs([[1900, 2445, 80]], 90),
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
 * 名字寫在對話框裡，像兩人各自喊出自己的名字。座標是人物畫布（960×864），尖角從框的下緣彎彎地伸向本人；
 * 框的寬度照字數算，字級 48 = 人物寬度的 5%、字距 0.12 個字寬（CSS 也用同樣的比例）。
 * 位置分兩組：wide 是橫式螢幕，兩個框分在人物兩側；直式螢幕新郎左邊剛好是日期那一欄，新郎的框改放到頭頂上方（tall）。
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
    // 頭頂上方、舉起的手右邊，尖角斜斜指向帽簷前面
    tall: { cx: 385, cy: 45, base: [395, 432], tip: [448, 138] },
  },
  // 捧花右上方，尖角從捧花和頭中間穿過去
  { name: wedding.bride, tilt: 5, wide: { cx: 830, cy: 55, base: [748, 802], tip: [675, 255] } },
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

  // 尖角往下彎：彎的方向取跟尖角方向垂直、朝下的那一側
  const mid = [(b1 + b2) / 2, y1]
  const [dx, dy] = [tip[0] - mid[0], tip[1] - mid[1]]
  const len = Math.hypot(dx, dy)
  const sign = dx >= 0 ? 1 : -1
  const bow = [(-dy / len) * sign, (dx / len) * sign]
  const bend = (from, k) => {
    const [mx, my] = lerp(from, tip, 0.5)
    return [mx + bow[0] * len * k, my + bow[1] * len * k]
  }
  // 從右往左走下緣：右邊的基點先接到尖角，再回到左邊的基點；外側（尖角背對本人的那一側）那條彎得多一點
  const [right, left] = [[b2, y1], [b1, y1]]
  const [outer, inner] = [0.2, 0.12]
  const tail =
    `L${pt(right)}Q${pt(bend(right, sign > 0 ? inner : outer))} ${pt(tip)}` +
    `Q${pt(bend(left, sign > 0 ? outer : inner))} ${pt(left)}`

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

// 跟 CSS 的橫式斷點（4/5）一致：直式螢幕的日期在左上角
const wideQuery = window.matchMedia('(min-aspect-ratio: 4/5)')
const layout = ref(wideQuery.matches ? 'wide' : 'tall')
const onLayoutChange = (e) => (layout.value = e.matches ? 'wide' : 'tall')
onMounted(() => wideQuery.addEventListener('change', onLayoutChange))
onUnmounted(() => wideQuery.removeEventListener('change', onLayoutChange))

const [year, month, day] = wedding.dateISO.split('-')

// 日期與名字的手繪外框濾鏡（跟快捷按鈕同一組參數）；名字的字比較小，抖動幅度小一點才讀得清楚
const sketchFilters = [
  { id: 'date', wobble: 0.035, scale: 3, grain: 0.7, grainScale: 1, seed: 11 },
  { id: 'names', wobble: 0.035, scale: 2, grain: 0.7, grainScale: 1, seed: 17 },
  { id: 'horizon', wobble: 0.025, scale: 5, grain: 0.5, grainScale: 1.5, seed: 23 },
]

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
    document.fonts.load('600 1em "Fredoka"', 'We Are Married SAVE THE DATE'),
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
  <div class="cover" :class="{ 'is-ready': ready }">
    <!-- 日期與名字的手繪外框：跟快捷按鈕（SiteNav）一樣，先把線抖得有點歪，再用細碎的雜訊把邊緣磨毛，像蠟筆畫的 -->
    <svg class="cover__filters" aria-hidden="true">
      <!-- horizon 用在插畫畫布裡，單位是畫布座標（約 0.5–0.9 倍螢幕像素），雜訊頻率調低、位移調大，看起來才跟按鈕一樣 -->
      <filter
        v-for="f in sketchFilters"
        :id="`cover-sketch-${f.id}`"
        :key="f.id"
        x="-10%"
        y="-20%"
        width="120%"
        height="140%"
      >
        <feTurbulence type="fractalNoise" :baseFrequency="f.wobble" numOctaves="2" :seed="f.seed" result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" :scale="f.scale" xChannelSelector="R" yChannelSelector="G" result="drawn" />
        <feTurbulence type="fractalNoise" :baseFrequency="f.grain" :seed="f.seed + 2" result="grain" />
        <feDisplacementMap in="drawn" in2="grain" :scale="f.grainScale" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
    <section
      ref="scene"
      class="scene"
      :class="{ 'is-ready': ready, 'scene--drawn': drawn }"
      role="img"
      :aria-label="`We Are Married：${wedding.groom}與${wedding.bride}牽手在山海之間的插畫，${wedding.date}`"
    >
      <!--
        程式畫的版本：畫布大小與構圖照原本的插畫（2079×2943），名字、日期、人物的位置計算可以共用
      -->
      <template v-if="drawn">
        <!-- 後層（靜態）：雲、遠山、海 -->
        <svg class="scene__canvas" viewBox="0 0 2079 2943" aria-hidden="true">
          <g class="scene__part scene__part--clouds">
            <path v-for="(d, i) in art.clouds" :key="i" class="fill-cloud" :d="d" />
            <path v-for="(d, i) in art.cloudMarks" :key="`m${i}`" class="brush-cloud" :d="d" />
          </g>
          <!--
            日出：遠山中間的山谷升起一顆太陽，日期沿著太陽外圍排成圓弧，SAVE THE DATE 寫在太陽裡；
            整組在山的後面，太陽下半部被山擋住，人物在前面。直式螢幕的山谷被人物擋滿，改用左上角的日期
          -->
          <g class="scene__part scene__part--date scene__sun-date">
            <path class="scene__sun" :d="art.sun" />
            <g class="scene__sun-shift">
              <text class="scene__sun-tag" x="1060" y="1790" text-anchor="middle">SAVE THE DATE</text>
              <path id="cover-sun-arc" class="scene__sun-arc" d="M693 2010A367 367 0 0 1 1427 2010" />
              <text class="scene__sun-num" filter="url(#cover-sketch-horizon)">
                <textPath href="#cover-sun-arc" startOffset="50%" text-anchor="middle">{{ year }}/{{ month }}/{{ day }}</textPath>
              </text>
            </g>
          </g>
          <g class="scene__part scene__part--mountains">
            <path class="fill-mountain-far" :d="art.mountainFar" />
            <path
              v-for="(d, i) in art.mountainFarMarks"
              :key="`f${i}`"
              class="brush-mountain-far"
              :d="d"
            />
            <path class="fill-mountain" :d="art.mountain" />
            <path v-for="(d, i) in art.mountainMarks" :key="`n${i}`" class="brush-mountain" :d="d" />
          </g>
          <g class="scene__part scene__part--sea">
            <path class="fill-sea" :d="art.sea" />
            <path v-for="(d, i) in art.seaMarks" :key="i" class="brush-sea-light" :d="d" />
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

        <!-- 前層（靜態）：小島、樹叢、草坡與字樣 -->
        <svg class="scene__canvas" viewBox="0 0 2079 2943" aria-hidden="true">
          <defs>
            <!-- 草叢：圖樣大一點、位置打散，才不會看出一格一格重複 -->
            <pattern id="cover-grass" width="700" height="500" patternUnits="userSpaceOnUse">
              <path
                class="scene__tuft"
                d="M90 80q5-15 15-22M100 83q3-12-3-22M430 60q5-15 15-22M440 63q3-12-3-22M250 190q5-15 15-22M260 193q3-12-3-22M600 230q5-15 15-22M610 233q3-12-3-22M140 330q5-15 15-22M150 333q3-12-3-22M480 370q5-15 15-22M490 373q3-12-3-22M330 455q5-15 15-22M340 458q3-12-3-22M660 470q5-15 15-22M670 473q3-12-3-22"
              />
            </pattern>
          </defs>
          <g class="scene__part scene__part--sea">
            <path v-for="(d, i) in art.islands" :key="i" class="fill-bush" :d="d" />
            <path v-for="(d, i) in art.islandMarks" :key="`m${i}`" class="brush-bush-light" :d="d" />
          </g>
          <g class="scene__part scene__part--land">
            <!-- 後面那叢先畫，左緣的直線才會被前面的大樹叢蓋住 -->
            <path class="fill-bush" :d="art.bushBack" />
            <path class="fill-bush-deep" :d="art.bushFront" />
            <path v-for="(d, i) in art.bushMarks" :key="`bm${i}`" class="brush-bush-light" :d="d" />
            <path class="fill-grass-deep" :d="art.slopeBack" />
            <path v-for="(d, i) in art.slopeBackMarks" :key="`sb${i}`" class="brush-grass-mid" :d="d" />
            <path class="fill-grass" :d="art.slopeFront" />
            <path v-for="(d, i) in art.patchesLight" :key="`pl${i}`" class="fill-grass-light" :d="d" />
            <path v-for="(d, i) in art.patchesDeep" :key="`pd${i}`" class="fill-grass-deep" :d="d" />
            <path fill="url(#cover-grass)" :d="art.slopeFront" />
            <path v-for="(d, i) in art.slopeLightMarks" :key="`sl${i}`" class="brush-grass-light" :d="d" />
            <path v-for="(d, i) in art.slopeDeepMarks" :key="`sd${i}`" class="brush-grass-deep" :d="d" />
            <path v-for="(d, i) in art.bushesRight" :key="`br${i}`" class="fill-bush" :d="d" />
            <path
              v-for="(d, i) in art.bushesRightMarks"
              :key="`brm${i}`"
              class="brush-bush-light"
              :d="d"
            />
            <path v-for="(d, i) in art.bushRightFront" :key="`bd${i}`" class="fill-bush-deep" :d="d" />
            <text class="scene__title scene__title--shadow" x="1047.5" y="420" text-anchor="middle">We Are Married</text>
            <text class="scene__title" x="1039.5" y="410" text-anchor="middle">We Are Married</text>
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
/* 只放濾鏡定義，不佔版面 */
.cover__filters {
  position: absolute;
  width: 0;
  height: 0;
}

/* 首屏共用的尺寸 */
.cover {
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --vh: 1vh;
  --scene-h: max(calc(95 * var(--vh)), 320px);
  /* 疊在插畫底部的快捷按鈕（SiteNav）：離底距離與按鈕高度 */
  --nav-bottom: 16px;
  --nav-h: 40px;
  /* 日期離左右兩側的距離 */
  --side: max(16px, 6vw);

  position: relative;
}

/* 手機網址列會伸縮，用 svh 才不會讓首屏高度跳動 */
@supports (height: 1svh) {
  .cover {
    --vh: 1svh;
  }
}

.scene {
  /* 山海雲圖層裁切時對準的高度位置；直式螢幕裁掉下方草地，保留上方「We Are Married」字樣 */
  --focus-y: 0.25;
  /* 山海雲圖層以 cover 鋪滿後的實際高度（畫布 2079×2943） */
  --canvas-h: max(var(--scene-h), 100vw * 2943 / 2079);
  --couple-w: min(88vw, calc(53 * var(--vh)));
  /* 底部留空間給快捷按鈕（再加 8px 間隔），人物才不會被擋住 */
  --couple-bottom: calc(4% + var(--nav-bottom) + var(--nav-h) + 8px);
  /* 直式螢幕插畫「We Are Married」字樣的下緣（畫布高度 14.8% 處），扣掉圖層裁切掉的上緣 */
  --title-bottom: calc(var(--canvas-h) * 0.148 - (var(--canvas-h) - var(--scene-h)) * var(--focus-y));

  position: relative;
  /* 圖層的 z-index 只在插畫內部比較，下方區塊的交界（山丘）才能疊到插畫底部上 */
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
  top: calc((var(--canvas-h) - var(--scene-h)) * var(--focus-y) * -1);
  left: 50%;
  width: calc(var(--canvas-h) * 2079 / 2943);
  height: var(--canvas-h);
  transform: translateX(-50%);
}

/* 程式畫版本的天空是平塗的單一顏色 */
.scene--drawn {
  background: var(--scene-sky);
}

/* 會動的那一層獨立成一個圖層，動畫時只重畫這一層 */
.scene__canvas--motion {
  will-change: transform;
}

/* SVG 裡的尺寸與位移都以畫布座標為單位；圓體白字，下面墊一層往右下錯開的淡藍色，像印刷時版沒對齊的效果 */
.scene__title {
  fill: #fff;
  font-family: 'Fredoka', var(--font-sans);
  font-size: 170px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.scene__title--shadow {
  fill: #8fc4ea;
}

/* 日出的太陽：平塗的淡黃色，不描邊 */
.scene__sun {
  fill: #ffe9a6;
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

.scene__tuft {
  fill: none;
  stroke: rgba(45, 110, 45, 0.4);
  stroke-width: 4px;
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

/* 對話框：白底配粗粗的深色手繪框（跟快捷按鈕同一組抖動濾鏡），字跟著一起抖 */
.scene__say {
  position: absolute;
  inset: 0;
  filter: url(#cover-sketch-names);
}

.scene__say-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
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
 * 直式螢幕上方正中間是插畫的「We Are Married」字樣，日期接在字樣下方（右側有愛心和小鳥，下方是人物舉起的手）
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
  filter: url(#cover-sketch-date);
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

/* 夠寬的橫式螢幕：日期改成山谷裡升起的太陽（再窄一點的話，人物會擋住整個山谷） */
@media (min-aspect-ratio: 6/5) {
  .scene__date {
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

  /* 愛心往上飄時影子跟著縮小變淡 */
  .scene__heart-shadow {
    animation: shadow-breathe 3.2s ease-in-out infinite alternate;
  }

  .scene.is-ready .scene__couple-shadow {
    animation: shadow-breathe-loop 3.6s ease-in-out 2.9s infinite;
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

  .scene.is-ready .scene__couple {
    animation: emerge 1.4s var(--ease-out) 1.5s both;
  }

  /* 進場結束（1.5s + 1.4s）後開始上下浮動 */
  .scene.is-ready .scene__couple-body {
    animation: float 3.6s ease-in-out 2.9s infinite;
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
    animation: write 0.55s ease-in-out calc(2.5s + var(--order) * 0.3s) both;
  }

  /* 對話框先從尖角彈出來，再一個字一個字寫名字；新郎喊完，換新娘的對話框跳出來 */
  .scene__say {
    opacity: 0;
  }

  .cover.is-ready .scene__say {
    animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) calc(2.3s + var(--order) * 0.3s) both;
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
