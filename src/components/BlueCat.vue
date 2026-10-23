<script setup>
import { computed, useId } from 'vue'
import { CAT, catPaw } from '../utils/blueCat.js'

/*
 * 藍白貓（形狀在 utils/blueCat.js）：首屏偷看新人的那隻，直式螢幕改趴在快捷按鈕上。
 * 頭和腳掌分開畫，中間夾著擋住下巴的東西（樹叢、按鈕）；這裡只畫形狀，出場、探頭的動作由用的地方決定。
 * 座標是首屏畫布，要放在 viewBox 用首屏畫布座標的 svg 裡
 */
const props = defineProps({
  // head：頭；paws：兩隻腳掌
  part: { type: String, default: 'head' },
  // 腳掌搭在哪裡：[[x, y, 斜度], …]
  paws: { type: Array, default: () => [] },
  // 顆粒圖樣（PaintDefs）：要照這張 svg 縮放的比例，一個雜訊點才會剛好是一個實體像素
  grain: { type: String, default: 'paint-grain-cover' },
})

// 同一頁可能同時有好幾隻貓，裁切範圍的 id 各自分開
const id = useId()
const fill = computed(() => `url(#${props.grain})`)
const pawShapes = computed(() => props.paws.map(([x, y, deg], i) => catPaw(x, y, deg, 86 + i)))
// 顆粒鋪在貓這一塊，再用各部位的形狀裁出來
const grainBox = { x: 340, y: 1800, width: 140, height: 140 }
</script>

<template>
  <!-- 毛、白毛各自畫完馬上鋪顆粒，白毛蓋掉底下毛的顆粒；五官很小，不鋪顆粒 -->
  <g v-if="part === 'head'">
    <defs>
      <clipPath :id="`${id}-fur`">
        <path v-for="(d, i) in CAT.fur" :key="i" :d="d" />
      </clipPath>
      <clipPath :id="`${id}-head`"><path :d="CAT.fur[2]" /></clipPath>
      <clipPath :id="`${id}-white`"><path :d="CAT.white" /></clipPath>
      <clipPath :id="`${id}-mole`"><path :d="CAT.mole" /></clipPath>
    </defs>
    <path v-for="(d, i) in CAT.fur" :key="`f${i}`" class="cat__fur" :d="d" />
    <rect v-bind="grainBox" :fill="fill" :clip-path="`url(#${id}-fur)`" />
    <path v-for="(d, i) in CAT.ears" :key="`e${i}`" class="cat__ear" :d="d" />
    <g :clip-path="`url(#${id}-head)`">
      <path class="cat__white" :d="CAT.white" />
      <rect v-bind="grainBox" :fill="fill" opacity="0.45" :clip-path="`url(#${id}-white)`" />
    </g>
    <!-- 黃綠的圓眼睛：圓圓的墨色瞳孔和亮點都偏右，眼睛看向新人 -->
    <circle class="cat__eye" cx="395" cy="1859" r="4" />
    <circle class="cat__eye" cx="420" cy="1859" r="4" />
    <circle class="cat__pupil" cx="396" cy="1859.3" r="2.3" />
    <circle class="cat__pupil" cx="421" cy="1859.3" r="2.3" />
    <circle class="cat__shine" cx="396.8" cy="1858.2" r="0.9" />
    <circle class="cat__shine" cx="421.8" cy="1858.2" r="0.9" />
    <path class="cat__nose" d="M404 1868L412 1868L408 1872.5Z" />
    <!-- 嘴巴底下一塊灰藍的毛（跟頭一樣是漸層，畫完鋪顆粒），鼻子底下一個小小的 ω 嘴巴 -->
    <path class="cat__fur" :d="CAT.mole" />
    <rect v-bind="grainBox" :fill="fill" :clip-path="`url(#${id}-mole)`" />
    <path class="cat__mouth" d="M408 1872.5Q406.6 1875.6 404 1874.6M408 1872.5Q409.4 1875.6 412 1874.6" />
  </g>
  <!-- 腳掌畫在擋住下巴的東西上面，鋪自己的顆粒，底下的顆粒被腳掌蓋掉，不會疊兩層 -->
  <g v-else>
    <defs>
      <clipPath :id="`${id}-paws`">
        <path v-for="(p, i) in pawShapes" :key="i" :d="p.d" />
      </clipPath>
    </defs>
    <path v-for="(p, i) in pawShapes" :key="`p${i}`" class="cat__white" :d="p.d" />
    <rect v-bind="grainBox" :fill="fill" opacity="0.45" :clip-path="`url(#${id}-paws)`" />
    <path v-for="(p, i) in pawShapes" :key="`t${i}`" class="cat__toe" :d="p.toes" />
  </g>
</template>

<style scoped>
/* 毛和白毛是漸層（PaintDefs 的 cat-fur、cat-white），眼睛是黃綠漸層（cat-eye），其他五官平塗；眼睛不描邊（描墨線像戴了黑框） */
.cat__fur {
  fill: url(#paint-shade-cat-fur);
}

.cat__white {
  fill: url(#paint-shade-cat-white);
}

.cat__ear {
  fill: #f4b3bd;
}

.cat__eye {
  fill: url(#paint-shade-cat-eye);
}

.cat__pupil {
  fill: #2b2523;
}

.cat__shine {
  fill: #fff;
}

.cat__nose {
  fill: #ee8e9e;
}

.cat__mouth {
  fill: none;
  stroke: #2b2523;
  stroke-width: 1.3;
  stroke-linecap: round;
}

.cat__toe {
  fill: none;
  stroke: #2b2523;
  stroke-width: 1.1;
  stroke-linecap: round;
}
</style>
