<script setup>
import { brush, circle, sketch } from '../utils/sketch.js'

/*
 * 在櫻花林下散步的小貓（畫布 120×84，面朝右、腳踩在 y=78），照喜帖上那隻：灰色虎斑、白嘴邊白襪子，
 * 尾巴一圈一圈的深色條紋往上翹，臉轉向畫面。走路時對角的兩隻腳一起前後擺，身體跟著上下晃、尾巴慢慢搖；
 * 往左走時由外層整個左右翻過來
 */
const opt = (seed, extra) => ({ step: 3, amp: 0.5, wavelength: 20, seed, ...extra })
const shape = (d, seed) => sketch(d, opt(seed))
const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`

// 一隻短短的腳：上端藏在身體裡，下端是圓圓的白色腳掌
const leg = (x, seed) => shape(`M${x - 4.5} 54L${x + 4.5} 54L${x + 4.5} 73Q${x + 5} 77.5 ${x} 77.5Q${x - 5} 77.5 ${x - 4.5} 73Z`, seed)

// 遠側的兩隻腳顏色暗一點；a、b 兩組是對角的腳，一前一後交替
const legs = {
  far: [
    ['cat-leg-a', leg(46, 1)],
    ['cat-leg-b', leg(82, 2)],
  ],
  near: [
    ['cat-leg-b', leg(37, 3)],
    ['cat-leg-a', leg(73, 4)],
  ],
}

// 尾巴：從屁股往上翹、尾巴尖往前勾；描邊畫出來，再用虛線疊一圈一圈的條紋
const tail = 'M32 44C22 42 15 33 16 23C17 15 22 11 27 13'

const body = [
  ['cat-gray', shape('M28 46C27 36 36 30 52 30C66 30 80 29 88 34C95 39 95 52 86 56C78 59 50 59 38 57C31 56 28 52 28 46Z', 10)],
  // 後腿的大腿
  ['cat-gray', shape(ellipse(38, 49, 11, 8.5), 11)],
  // 胸口一塊白
  ['cat-white', shape('M80 37C88 39 93 47 89 55C85 58 79 57 77 52C75 46 76 40 80 37Z', 12)],
  // 背上的虎斑
  ['cat-stripe', ['M48 31Q50 37 47 42', 'M58 30.5Q60 36 57 41', 'M68 30.5Q70 35 67.5 39.5', 'M33 41Q38 43 40 48'].map((d, i) => brush(d, opt(20 + i, { width: 3.4 }))).join('')],
]

const head = [
  ['cat-gray', shape('M82 25L84 8.5L94 16Z', 30) + shape('M97 15L107.5 8L109.5 24Z', 31)],
  ['cat-ear', shape('M85 20L86 12.5L91 16.5Z', 32) + shape('M100 15L105.8 11L106.5 20Z', 33)],
  ['cat-gray', shape(ellipse(95.5, 29, 16.5, 14.5), 34)],
  // 額頭中間一道白，往下變成白色的嘴邊
  ['cat-white', shape('M95.5 20C97.5 25 99.5 28 102 31.5C106.5 34 107 40 101.5 42.8C98 44.5 93 44.5 89.5 42.8C84 40 84.5 34 89 31.5C91.5 28 93.5 25 95.5 20Z', 35)],
  ['cat-stripe', ['M89 17.5Q90 20.5 89 23', 'M102 17.5Q101 20.5 102 23'].map((d, i) => brush(d, opt(36 + i, { width: 2.2 }))).join('')],
  ['cat-blush', circle(87.5, 37.5, 2.4) + circle(103.5, 37.5, 2.4)],
  ['cat-eye', circle(89.8, 30, 2.1) + circle(101.2, 30, 2.1)],
  ['cat-shine', circle(90.4, 29.3, 0.7) + circle(101.8, 29.3, 0.7)],
  ['cat-ear', 'M93.6 34.6L97.4 34.6L95.5 36.9Z'],
]

// 嘴巴和鬍鬚用細線描
const lines = 'M95.5 36.9Q94 39.2 92.2 38.2M95.5 36.9Q97 39.2 98.8 38.2M86 36.4L75 34.4M86 38.8L76 39.8M105 36.4L116 34.4M105 38.8L115 39.8'
</script>

<template>
  <svg viewBox="0 0 120 84" aria-hidden="true">
    <ellipse class="cat-shadow" cx="62" cy="78.5" rx="36" ry="4.5" />
    <path v-for="([cls, d], i) in legs.far" :key="`f${i}`" class="cat-leg cat-leg--far" :class="cls" :d="d" />
    <!-- 身體壓低一點，腳才短短的 -->
    <g transform="translate(0 5)">
      <g class="cat-tail">
        <path class="cat-tail-base" :d="tail" />
        <path class="cat-tail-stripes" :d="tail" />
      </g>
      <g class="cat-body">
        <path v-for="([cls, d], i) in body" :key="`b${i}`" :class="cls" :d="d" />
        <g class="cat-head">
          <path v-for="([cls, d], i) in head" :key="`h${i}`" :class="cls" :d="d" />
          <path class="cat-lines" :d="lines" />
        </g>
      </g>
    </g>
    <path v-for="([cls, d], i) in legs.near" :key="`n${i}`" class="cat-leg" :class="cls" :d="d" />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.cat-shadow {
  fill: rgba(40, 90, 30, 0.22);
}

.cat-gray {
  fill: #8b8f96;
}

.cat-stripe {
  fill: #5a5e66;
}

.cat-white,
.cat-leg,
.cat-shine {
  fill: #fdfbf7;
}

.cat-leg--far {
  fill: #e4ded5;
}

.cat-ear {
  fill: #f4a7a9;
}

.cat-blush {
  fill: rgba(244, 167, 169, 0.55);
}

.cat-eye {
  fill: #2f2b2b;
}

.cat-lines {
  fill: none;
  stroke: #4a4646;
  stroke-width: 0.8;
  stroke-linecap: round;
}

.cat-tail-base,
.cat-tail-stripes {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
}

.cat-tail-base {
  stroke: #8b8f96;
}

.cat-tail-stripes {
  stroke: #5a5e66;
  stroke-dasharray: 3.5 4.5;
  stroke-dashoffset: -3;
  stroke-linecap: butt;
}

/* 腳以大腿根為軸前後擺；尾巴以屁股為軸 */
.cat-leg {
  transform-box: fill-box;
  transform-origin: 50% 0;
}

.cat-tail {
  transform-origin: 32px 44px;
}

.cat-head {
  transform-origin: 90px 40px;
}

@media (prefers-reduced-motion: no-preference) {
  .cat-leg {
    animation: cat-step 0.5s ease-in-out infinite alternate;
  }

  .cat-leg-b {
    animation-delay: -0.5s;
  }

  /* 每踏一步身體輕輕一晃 */
  .cat-body {
    animation: cat-bob 0.25s ease-in-out infinite alternate;
  }

  .cat-tail {
    animation: cat-tail 1.6s ease-in-out infinite alternate;
  }

  .cat-head {
    animation: cat-head 2.4s ease-in-out infinite alternate;
  }
}

@keyframes cat-step {
  from {
    transform: rotate(22deg);
  }
  to {
    transform: rotate(-22deg);
  }
}

@keyframes cat-bob {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-1.2px);
  }
}

@keyframes cat-tail {
  from {
    transform: rotate(-8deg);
  }
  to {
    transform: rotate(10deg);
  }
}

@keyframes cat-head {
  from {
    transform: rotate(-3deg);
  }
  to {
    transform: rotate(4deg);
  }
}
</style>
