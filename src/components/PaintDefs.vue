<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { GRAIN_SIZE, grainDot, grainImage } from '../utils/grain.js'
import { NAV_CAT } from '../utils/blueCat.js'

/*
 * 全站共用的插畫質感定義，整頁只放一份（App.vue），其他 svg 用 url(#paint-…) 參照：
 * 手繪抖動濾鏡（大字、對話框）、噴槍畫的漸層（SHADES）、顆粒圖樣
 */
defineProps({
  // 首屏畫布座標裡一格顆粒圖樣的大小：首屏畫布會跟著螢幕縮放，由首屏量出畫布大小後換算（見 OpeningScene）
  coverGrain: { type: Number, default: GRAIN_SIZE },
})

// 手繪外框濾鏡（跟快捷按鈕同一組參數）：日期等大字；名字的字比較小，抖動幅度小一點才讀得清楚
const SKETCH_FILTERS = [
  { id: 'date', wobble: 0.035, scale: 3, grain: 0.7, grainScale: 1, seed: 11 },
  { id: 'names', wobble: 0.035, scale: 2, grain: 0.7, grainScale: 1, seed: 17 },
  // 用在首屏的畫布裡，單位是畫布座標（約 0.5–0.9 倍螢幕像素），雜訊頻率調低、位移調大，看起來才跟按鈕一樣
  { id: 'horizon', wobble: 0.025, scale: 5, grain: 0.5, grainScale: 1.5, seed: 23 },
]

/*
 * 噴槍畫的質感：每塊山、雲、海、草坡、樹都是同色系的漸層（大致上亮下暗），再整片疊一層細細的顆粒。
 * 這裡是風景顏色的唯一來源；顏色可以直接寫 CSS 變數（例如全站共用的草地色 --scene-grass）。
 * 漸層預設照各形狀自己的外框由上往下（from、to 是外框的比例）；首屏的雲是好幾個圓疊成的，
 * 改用首屏畫布座標讓整朵雲共用一道漸層，圓和圓之間才不會看出接縫
 */
const SHADES = [
  { id: 'cloud', units: 'userSpaceOnUse', from: [0, 1580], to: [0, 1990], stops: [[0.4, '#fff'], [1, '#cfe5f8']] },
  { id: 'sun', stops: [[0, '#fff1bd'], [0.35, '#ffd96e']] },
  // 遠山、近山、海的外框都往下延伸到看不見的地方，漸層只排在露出來的那一段
  // 遠山右邊的山腳一路露到湖面，漸層排到湖面為止；近山整座比遠山深一階，稜線疊在遠山前面才分得出是兩座山
  { id: 'mountain-far', from: [0.3, 0], to: [0.5, 0.85], stops: [[0, '#a9d4f6'], [1, '#76b2ea']] },
  { id: 'mountain', from: [0.3, 0], to: [0.5, 0.75], stops: [[0, '#6cafeb'], [1, '#3f86d4']] },
  { id: 'sea', stops: [[0, '#4cb1f2'], [0.35, '#1e85dc']] },
  // 樹叢：右上亮、左下暗
  { id: 'bush', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#4bb262'], [1, '#1c7838']] },
  { id: 'bush-deep', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#33984f'], [1, '#115c29']] },
  // 首屏的草坡：下半段比 --scene-grass（#7cc447）亮一階
  { id: 'grass', stops: [[0, '#97d765'], [0.5, '#8bd157']] },
  { id: 'grass-deep', stops: [[0, '#76bf4c'], [0.45, '#5aa535']] },
  { id: 'grass-light', stops: [[0, '#9edb6a'], [1, '#82c64f']] },
  // 往下捲、上岸後的草地：靠海那段比較亮，往下慢慢變深，最下面跟 <main> 的底色（--scene-grass-deep）接上
  { id: 'grove', stops: [[0, 'var(--scene-grass-light)'], [0.3, 'var(--scene-grass)'], [1, 'var(--scene-grass-deep)']] },
  // 樹：樹冠跟樹叢一樣右上亮、左下暗，樹幹上亮下暗。櫻花樹三種粉紅，深淺不同
  { id: 'tree-mint', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#aee3d1'], [1, '#6fbea4']] },
  { id: 'tree-green', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#46b86c'], [1, '#1f7f44']] },
  { id: 'tree-deep', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#25874d'], [1, '#0e5a2d']] },
  { id: 'tree-sakura', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#ffc4d5'], [1, '#ee88a8']] },
  { id: 'tree-sakura-pale', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#ffdbe6'], [1, '#f5a6bf']] },
  { id: 'tree-sakura-rose', from: [0.8, 0], to: [0.2, 1], stops: [[0, '#ffb1c8'], [1, '#e26f96']] },
  { id: 'trunk', stops: [[0, '#a06d3b'], [1, '#6f4420']] },
  // 首屏躲在樹叢後面偷看的藍白貓：灰藍的毛上亮下暗，比後面的遠山灰、深一點才分得開；
  // 耳朵和頭共用首屏畫布座標的漸層，接在一起的地方才不會有接縫。白毛帶一點冷調，往下稍微暗一點
  { id: 'cat-fur', units: 'userSpaceOnUse', from: [0, 1832], to: [0, 1900], stops: [[0, '#8593ab'], [1, '#5e6b85']] },
  { id: 'cat-white', stops: [[0, '#fff'], [1, '#e4eaf2']] },
  // 眼睛是黃色帶綠：上緣黃、往下很快變黃綠再變綠（一樣上亮下暗）。眼睛只有幾個像素大，綠要佔大半才看得出來（上半黃、下半黃綠太黃）
  { id: 'cat-eye', stops: [[0, '#fcd23c'], [0.45, '#c3d13a'], [1, '#86c23c']] },
]

/*
 * 顆粒圖樣：一個雜訊點大約是螢幕的一個實體像素。
 * paint-grain 給座標就是 CSS 像素的 svg 用（往下捲的風景）；paint-grain-cover 給首屏的畫布用；
 * paint-grain-cat 給快捷按鈕上的貓用（首屏畫布座標、固定縮成 NAV_CAT.scale 倍）。
 * 縮放瀏覽器會改變裝置像素比，跟著重算
 */
const grainUrl = grainImage()
const screenTile = ref(GRAIN_SIZE * grainDot())

/*
 * 方格紙（回覆區的明信片）：白底上一格一格的淡黃細線（跟桌曆的黃框同一系、淡一些，但不能太淡，細線在白底上才看得出來），線寬也是一個實體像素，才會細細的不搶字。
 * 線畫在圖樣的上緣、左緣，線寬給兩倍，超出圖樣的那一半會被裁掉，剩下剛好一個實體像素
 */
const GRID_CELL = 18
const hairline = ref(grainDot())

const onResize = () => {
  screenTile.value = GRAIN_SIZE * grainDot()
  hairline.value = grainDot()
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <!-- 只放定義，不佔版面 -->
  <svg class="paint-defs" aria-hidden="true">
    <!-- 先把線抖得有點歪，再用細碎的雜訊把邊緣磨毛，像蠟筆畫的 -->
    <filter
      v-for="f in SKETCH_FILTERS"
      :id="`paint-sketch-${f.id}`"
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
    <linearGradient
      v-for="s in SHADES"
      :id="`paint-shade-${s.id}`"
      :key="s.id"
      :gradientUnits="s.units"
      :x1="(s.from ?? [0, 0])[0]"
      :y1="(s.from ?? [0, 0])[1]"
      :x2="(s.to ?? [0, 1])[0]"
      :y2="(s.to ?? [0, 1])[1]"
    >
      <!-- 用 style 指定顏色，才能寫 CSS 變數 -->
      <stop v-for="([offset, color], i) in s.stops" :key="i" :offset="offset" :style="{ stopColor: color }" />
    </linearGradient>
    <pattern id="paint-grain" patternUnits="userSpaceOnUse" :width="screenTile" :height="screenTile">
      <image :href="grainUrl" :width="screenTile" :height="screenTile" />
    </pattern>
    <pattern id="paint-grain-cover" patternUnits="userSpaceOnUse" :width="coverGrain" :height="coverGrain">
      <image :href="grainUrl" :width="coverGrain" :height="coverGrain" />
    </pattern>
    <pattern
      id="paint-grain-cat"
      patternUnits="userSpaceOnUse"
      :width="screenTile / NAV_CAT.scale"
      :height="screenTile / NAV_CAT.scale"
    >
      <image :href="grainUrl" :width="screenTile / NAV_CAT.scale" :height="screenTile / NAV_CAT.scale" />
    </pattern>
    <pattern id="paint-grid-paper" patternUnits="userSpaceOnUse" :width="GRID_CELL" :height="GRID_CELL">
      <rect :width="GRID_CELL" :height="GRID_CELL" fill="#fff" />
      <path
        :d="`M0 0H${GRID_CELL}M0 0V${GRID_CELL}`"
        fill="none"
        stroke="#f5dc8c"
        :stroke-width="hairline * 2"
      />
    </pattern>
  </svg>
</template>

<style scoped>
.paint-defs {
  position: absolute;
  width: 0;
  height: 0;
}
</style>
