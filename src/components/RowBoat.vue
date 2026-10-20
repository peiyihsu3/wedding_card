<script setup>
import { brush, sketch } from '../utils/sketch.js'

/*
 * 停在碼頭邊的小船（畫布 260×170，船頭朝右）：斜斜往下看得到船裡的木頭和一塊座板，一支槳擱在船尾，
 * 一條繩子綁在左邊的碼頭上。船身跟著水波輕輕搖，最下面一道海水蓋住船底，看起來船是浮在水裡
 */
const opt = (seed, extra) => ({ step: 4, amp: 0.8, wavelength: 30, seed, ...extra })

// 船舷：近的一側往下彎，遠的一側往上拱，中間露出船裡
const nearRim = 'M10 106C70 118 180 116 250 94'
const farRim = 'M10 106C60 98 180 92 250 94'
const hull = [
  ['boat-inside', sketch(`${farRim}C180 116 70 118 10 106Z`, opt(559))],
  ['boat-seat', sketch('M118 100L148 99L149 108L119 110Z', opt(564, { amp: 0.4 }))],
  ['boat-rim', brush(farRim, opt(565, { width: 4, amp: 0.4 }))],
  ['boat-hull', sketch(`${nearRim}C248 112 238 128 222 140C200 152 170 154 130 154C90 154 58 152 40 144C26 136 14 124 10 106Z`, opt(560))],
  ['boat-stripe', brush('M22 124C80 134 176 132 238 112', opt(561, { width: 7 }))],
  ['boat-rim', brush(nearRim, opt(562, { width: 7, amp: 0.5 }))],
  ['boat-shine', brush('M200 118C212 114 224 108 232 100', opt(563, { width: 3 }))],
  // 擱在船尾的槳，槳葉泡在水裡
  ['boat-wood', brush('M80 88C66 108 50 130 30 150', opt(540, { width: 5 }))],
  ['boat-wood', sketch('M22 140C30 136 40 142 38 152C36 162 24 164 18 158C14 152 16 144 22 140Z', opt(541))],
]

// 船身上的小愛心
const heart = 'M0 8C-6 4-10 0-10-4C-10-8-6-10-3-9C-1.5-8.5-0.5-7.5 0-6C0.5-7.5 1.5-8.5 3-9C6-10 10-8 10-4C10 0 6 4 0 8Z'

// 綁在碼頭木樁上的繩子
const rope = 'M16 108C8 116 0 114-6 104'

// 船底的海水與浪花：顏色和海一樣，蓋住船身下緣
const water = sketch('M-10 146C30 140 60 150 100 146S170 140 210 147S250 144 270 146V172H-10Z', opt(570, { amp: 1.2 }))
const ripples = [
  'M0 148C10 144 22 144 34 148',
  'M226 146C236 142 246 142 258 146',
  'M60 160C76 156 92 156 108 160',
  'M150 162C162 158 176 158 190 162',
].map((d, i) => brush(d, opt(580 + i, { width: 3 })))
</script>

<template>
  <svg viewBox="0 0 260 170" aria-hidden="true">
    <ellipse class="boat-shadow" cx="134" cy="156" rx="118" ry="10" />
    <path class="boat-rope" :d="rope" />
    <g class="boat-body">
      <path v-for="([cls, d], i) in hull" :key="i" :class="cls" :d="d" />
      <path class="boat-heart" :d="heart" transform="translate(132 138) scale(0.55)" />
    </g>
    <path class="boat-water" :d="water" />
    <path v-for="(d, i) in ripples" :key="`r${i}`" class="boat-ripple" :d="d" />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.boat-shadow {
  fill: rgba(15, 60, 130, 0.3);
}

.boat-hull {
  fill: #fff6e8;
}

.boat-inside {
  fill: #b98a5c;
}

.boat-seat {
  fill: #d8b183;
}

.boat-rim,
.boat-wood {
  fill: #c89b6c;
}

.boat-stripe,
.boat-heart {
  fill: #e58f9e;
}

.boat-shine {
  fill: #fff;
}

.boat-rope {
  fill: none;
  stroke: #e8d3a8;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.boat-water {
  fill: var(--scene-sea);
}

.boat-ripple {
  fill: rgba(255, 255, 255, 0.85);
}

/* 船身以船底中間為軸輕輕搖 */
.boat-body {
  transform-box: view-box;
  transform-origin: 130px 150px;
}

@media (prefers-reduced-motion: no-preference) {
  .boat-body {
    animation: boat-rock 4.2s ease-in-out infinite alternate;
  }
}

@keyframes boat-rock {
  from {
    transform: translateY(-2px) rotate(-2deg);
  }
  to {
    transform: translateY(3px) rotate(2deg);
  }
}
</style>
