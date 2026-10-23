<script setup>
import { useId } from 'vue'

/*
 * 蠟筆框：先把圓角框抖成歪歪的線，再用細碎的雜訊把邊緣磨毛，像蠟筆畫的。
 * 墊在按鈕底下當外框，按鈕本身要 position: relative 與 isolation: isolate。
 * 框底下還有一層往下錯開的黃色厚邊，用來標示目前所在或已選取。
 * 狀態由按鈕用 CSS 變數切換：--crayon-face 框內底色、--crayon-shade 黃色厚邊的透明度（0 或 1）、
 * --crayon-stroke 線寬、--crayon-ink 線的顏色（填錯時換成紅色）
 */
defineProps({
  // 雜訊種子，每顆不同，並排的按鈕歪法才不會一模一樣
  seed: { type: Number, default: 1 },
  // 圓角，可以寫 '50%' 畫成圓形按鈕
  radius: { type: [Number, String], default: 12 },
})

// 同一頁有好幾個框，filter 的 id 要唯一
const id = useId()
</script>

<template>
  <svg class="crayon-frame" aria-hidden="true">
    <filter :id="id" x="-10%" y="-30%" width="120%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" :seed="seed" result="wobble" />
      <feDisplacementMap in="SourceGraphic" in2="wobble" scale="3" xChannelSelector="R" yChannelSelector="G" result="drawn" />
      <feTurbulence type="fractalNoise" baseFrequency="0.7" :seed="seed + 2" result="grain" />
      <feDisplacementMap in="drawn" in2="grain" scale="1" xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <rect class="crayon-frame__shade" y="5" width="100%" height="100%" :rx="radius" :filter="`url(#${id})`" />
    <rect class="crayon-frame__face" width="100%" height="100%" :rx="radius" :filter="`url(#${id})`" />
  </svg>
</template>

<style scoped>
/* 外框比按鈕內縮 1px，線條有一半畫在框外，大致貼齊按鈕邊緣 */
.crayon-frame {
  position: absolute;
  top: 1px;
  left: 1px;
  z-index: -1;
  width: calc(100% - 2px);
  height: calc(100% - 2px);
  overflow: visible;
}

.crayon-frame__face,
.crayon-frame__shade {
  stroke: var(--crayon-ink, #2b2523);
  stroke-width: var(--crayon-stroke, 2.2);
  transition: stroke 0.2s;
}

.crayon-frame__face {
  fill: var(--crayon-face, #fff);
  transition:
    fill 0.2s,
    stroke 0.2s;
}

.crayon-frame__shade {
  fill: #ffd65a;
  opacity: var(--crayon-shade, 0);
  transition:
    opacity 0.2s,
    stroke 0.2s;
}
</style>
