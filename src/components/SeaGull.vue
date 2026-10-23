<script setup>
import { vPauseOffscreen } from '../utils/offscreen.js'
</script>

<template>
  <!--
    白色的海鷗，翅尖灰、嘴橘，平塗不描邊；大小與位置由外層決定。
    翅膀拍動、身體左右滑翔，--delay、--drift 由外層打散，一群裡每隻的節奏才不會一樣。
    翅膀和身體分成兩張疊在一起的 svg（座標一樣），拍翅膀、滑翔動的都是元素本身，畫好一次交給 GPU 搬，不必每一格重畫
  -->
  <div v-pause-offscreen class="gull" aria-hidden="true">
    <div class="gull__body">
      <svg class="gull__wings" viewBox="0 0 60 50">
        <path class="gull__white" d="M29 16C24 8 14 5 3 8C11 9 19 13 25 19ZM31 16C36 8 46 5 57 8C49 9 41 13 35 19Z" />
        <path class="gull__tip" d="M3 8C7 6.5 11 6 14 6.5C11 7.8 8.5 8.5 6.5 9.2ZM57 8C53 6.5 49 6 46 6.5C49 7.8 51.5 8.5 53.5 9.2Z" />
      </svg>
      <svg class="gull__torso" viewBox="0 0 60 50">
        <ellipse class="gull__white" cx="30" cy="17" rx="5.5" ry="4" />
        <circle class="gull__white" cx="35" cy="14.5" r="3.4" />
        <path class="gull__beak" d="M38 14l4.5 1.2-4.5 1.2z" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
/* 身體那張撐出大小，翅膀疊在同一個位置、排在身體後面 */
.gull__body {
  position: relative;
}

.gull__wings,
.gull__torso {
  display: block;
  width: 100%;
  overflow: visible;
}

.gull__torso {
  position: relative;
  height: auto;
}

/* 翅膀以肩膀（30, 16）為軸上下拍 */
.gull__wings {
  position: absolute;
  inset: 0;
  height: 100%;
  transform-origin: 50% 32%;
}

.gull__white {
  fill: #fff;
}

.gull__tip {
  fill: #8796a5;
}

.gull__beak {
  fill: #f5a34a;
}

@media (prefers-reduced-motion: no-preference) {
  /* 海鷗拍翅膀，同時慢慢左右滑翔 */
  .gull__wings {
    animation: flap 0.7s ease-in-out var(--delay, 0s) infinite alternate;
    animation-play-state: var(--loop, running);
  }

  .gull__body {
    animation: glide var(--drift, 6s) ease-in-out var(--delay, 0s) infinite alternate;
    animation-play-state: var(--loop, running);
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
</style>
