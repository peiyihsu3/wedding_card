<script setup>
import { brush, sketch } from '../utils/sketch.js'

/*
 * 天空裡的小飛機（畫布 320×180，機頭朝右、微微往上爬）：黃色機身配粉紅色機翼，駕駛艙蓋著圓圓的玻璃罩。
 * 機尾拖著一道粉紅色的虛線，在後面繞出一顆愛心
 */
const opt = (seed, extra) => ({ step: 4, amp: 0.8, wavelength: 30, seed, ...extra })

const trail =
  'M98 104C82 110 66 114 52 112C34 100 18 84 20 66C22 48 42 44 52 58C62 44 82 48 84 66C86 84 70 100 52 112C38 122 18 128 -24 126'

// 機尾上的小愛心
const heart = 'M0 8C-6 4-10 0-10-4C-10-8-6-10-3-9C-1.5-8.5-0.5-7.5 0-6C0.5-7.5 1.5-8.5 3-9C6-10 10-8 10-4C10 0 6 4 0 8Z'

const back = [
  ['plane-wing', sketch('M100 98L86 60C88 54 96 54 100 58L126 92Z', opt(640))],
  ['plane-wing-deep', sketch('M82 104C86 98 116 98 126 104C116 110 88 110 82 104Z', opt(641))],
  ['plane-ink', brush('M182 120L188 142', opt(642, { width: 3.5 }))],
  ['plane-wheel', sketch('M181 146a8 8 0 1 0 16 0a8 8 0 1 0 -16 0Z', opt(643))],
  ['plane-nose', sketch('M186 146a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z', opt(644))],
]

const front = [
  ['plane-body', sketch('M96 100C98 88 126 80 172 78C220 76 256 82 268 96C272 104 268 114 256 118C222 126 152 126 114 116C102 112 96 108 96 100Z', opt(650))],
  ['plane-body-deep', brush('M116 116C160 124 220 122 256 114', opt(651, { width: 6 }))],
  ['plane-stripe', brush('M104 104C150 109 220 109 266 102', opt(652, { width: 6 }))],
  ['plane-shine', brush('M238 86C249 88 258 92 264 98', opt(653, { width: 3 }))],
  // 駕駛艙的玻璃罩：一道亮面、中間一根框
  ['plane-glass', sketch('M152 82C158 64 176 56 198 56C220 56 236 66 242 82Z', opt(655, { amp: 0.5 }))],
  ['plane-shine', brush('M164 74C170 66 180 61 192 60', opt(656, { width: 3.5 }))],
  ['plane-rim', brush('M198 57C199 66 199 74 198 81', opt(657, { width: 3 }))],
  ['plane-rim', brush('M150 82C176 77 214 77 244 82', opt(654, { width: 4.5 }))],
  ['plane-nose', sketch('M260 100a10 10 0 1 0 20 0a10 10 0 1 0 -20 0Z', opt(658))],
  ['plane-wing', sketch('M150 112C170 104 222 104 238 110C234 126 176 132 152 122Z', opt(659))],
  ['plane-wing-light', brush('M160 112C180 108 210 108 230 111', opt(660, { width: 3 }))],
]
</script>

<template>
  <svg viewBox="0 0 320 180" aria-hidden="true">
    <path class="plane-trail" :d="trail" />
    <g class="plane-fly">
      <g transform="rotate(-6 200 100)">
        <path v-for="([cls, d], i) in back" :key="`b${i}`" :class="cls" :d="d" />
        <path class="plane-decal" :d="heart" transform="translate(101 74) scale(0.42)" />
        <path v-for="([cls, d], i) in front" :key="`f${i}`" :class="cls" :d="d" />
        <path class="plane-prop" d="M281 100m-3.5 0a3.5 28 0 1 0 7 0a3.5 28 0 1 0 -7 0Z" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* 粉紅色的虛線：短短的一點一點，圓頭 */
.plane-trail {
  fill: none;
  stroke: #f08aa0;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 1 10;
}

.plane-body {
  fill: #ffd65a;
}

.plane-body-deep {
  fill: #efbd3a;
}

.plane-rim {
  fill: #c8902e;
}

.plane-stripe {
  fill: #e58f9e;
}

.plane-shine,
.plane-decal {
  fill: #fff;
}

.plane-wing {
  fill: #f39bb0;
}

.plane-wing-deep {
  fill: #e58f9e;
}

.plane-wing-light {
  fill: #fbd0da;
}

.plane-glass {
  fill: #dff1fc;
}

.plane-nose {
  fill: #fff3dc;
}

.plane-ink,
.plane-prop {
  fill: #6b4f45;
}

.plane-wheel {
  fill: #5a4a44;
}

/* 飛機上下飄、螺旋槳轉（壓扁再展開），虛線往後流 */
.plane-fly {
  transform-box: view-box;
  transform-origin: 200px 100px;
}

.plane-prop {
  transform-box: fill-box;
  transform-origin: center;
}

@media (prefers-reduced-motion: no-preference) {
  .plane-fly {
    animation: plane-fly 3.8s ease-in-out infinite alternate;
  }

  .plane-prop {
    animation: prop-spin 0.16s linear infinite alternate;
  }

  .plane-trail {
    animation: trail-flow 1.4s linear infinite;
  }
}

@keyframes plane-fly {
  from {
    transform: translateY(4px) rotate(1.5deg);
  }
  to {
    transform: translateY(-6px) rotate(-1.5deg);
  }
}

@keyframes prop-spin {
  to {
    transform: scaleY(0.15);
  }
}

/* 虛線從機尾往後流走，一次移動一格（1 + 10） */
@keyframes trail-flow {
  to {
    stroke-dashoffset: -11;
  }
}
</style>
