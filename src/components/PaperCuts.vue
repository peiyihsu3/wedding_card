<script setup>
import { noise } from '../utils/sakura.js'
import { blob, heart, sparkle } from '../utils/paperCut.js'

/*
 * 婚紗那一區紙的下緣附近，散著幾片小剪紙（參考 ITO FARM）：不規則的圓片、愛心、五道短條拼成的星星，
 * 每片在原地慢慢漂、轉一點角度。
 * 看起來隨機，其實位置是排好的，才不會壓到照片和指示點：
 * 中間那段（約 28%–72%，平板上中間那張照片比較寬）在指示點下面，壓得很低；兩側在旁邊縮圖的下面，可以高一點。
 * x 是區塊寬度的百分比，y 是從紙的下緣往上、佔 --band 的比例；wide 的只在寬螢幕出現，手機上太擠
 */
const PIECES = [
  { x: 8, y: 0.45, size: 54, kind: 'blob', color: 'blue', rot: -20 },
  { x: 12, y: 0.68, size: 56, kind: 'sparkle', color: 'yellow', rot: 8, wide: true },
  { x: 22, y: 0.02, size: 40, kind: 'heart', color: 'pink', rot: -14 },
  { x: 25, y: 0.55, size: 26, kind: 'blob', color: 'green', rot: 30, wide: true },
  { x: 38, y: 0, size: 40, kind: 'sparkle', color: 'yellow', rot: 20 },
  { x: 64, y: 0.06, size: 28, kind: 'blob', color: 'pink', rot: 50 },
  { x: 78, y: 0.7, size: 46, kind: 'heart', color: 'coral', rot: 12, wide: true },
  { x: 84, y: 0.12, size: 50, kind: 'blob', color: 'blue', rot: 35 },
  { x: 91, y: 0.7, size: 44, kind: 'sparkle', color: 'yellow', rot: -16, wide: true },
  { x: 94, y: 0.45, size: 26, kind: 'blob', color: 'green', rot: 0 },
]

const SHAPES = { blob, heart, sparkle }

// 淺的顏色（黃、粉紅）顆粒淡一點，才不會髒髒灰灰的
const COLORS = {
  blue: { fill: 'var(--scene-sea)' },
  green: { fill: 'var(--scene-grass)' },
  coral: { fill: '#f0794f' },
  yellow: { fill: '#ffd65a', soft: true },
  pink: { fill: '#f28bab', soft: true },
}

/*
 * 每片的畫布比剪紙大一點，抖出去的邊才不會被裁掉。
 * 兩層動作疊在一起：整片慢慢漂一段（左右 ±24px、往上 10–20px、轉 ±40 度，5–9 秒），
 * 剪紙本身再比較快地左右搖（±8–14 度，2.5–4 秒），像被風吹著輕輕晃。
 * 每片的幅度、快慢都不一樣，起點也錯開（負的 delay），不會一起動
 */
const pieces = PIECES.map((p, i) => {
  const box = Math.ceil(p.size * 1.3)
  const dur = 5 + noise(i, 81) * 4
  const swayDur = 2.5 + noise(i, 86) * 1.5
  return {
    ...p,
    ...COLORS[p.color],
    box,
    d: SHAPES[p.kind](p.size, box / 2, i * 13 + 7),
    style: {
      '--x': `${p.x}%`,
      '--y': p.y,
      '--box': `${box}px`,
      '--rot': `${p.rot}deg`,
      '--dx': `${((noise(i, 82) - 0.5) * 48).toFixed(1)}px`,
      '--dy': `${(-10 - noise(i, 83) * 10).toFixed(1)}px`,
      '--spin': `${((noise(i, 84) - 0.5) * 80).toFixed(1)}deg`,
      '--dur': `${dur.toFixed(1)}s`,
      '--delay': `${(-noise(i, 85) * dur).toFixed(1)}s`,
      '--sway': `${(8 + noise(i, 87) * 6).toFixed(1)}deg`,
      '--sway-dur': `${swayDur.toFixed(1)}s`,
      '--sway-delay': `${(-noise(i, 88) * swayDur).toFixed(1)}s`,
    },
  }
})
</script>

<template>
  <div class="paper-cuts" aria-hidden="true">
    <svg
      v-for="(p, i) in pieces"
      :key="i"
      class="paper-cut"
      :class="{ 'paper-cut--wide': p.wide }"
      :style="p.style"
      :viewBox="`0 0 ${p.box} ${p.box}`"
    >
      <g class="paper-cut__body">
        <path :d="p.d" :fill="p.fill" />
        <path class="paper-cut__grain" :class="{ 'paper-cut__grain--soft': p.soft }" :d="p.d" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
/*
 * 鋪滿整個婚紗區塊（ScenicSection 的 scenic--sky），排在照片後面；
 * 紙的下緣往下捲時會比頁面慢一點、往下錯開，剪紙跟著區塊走，只會離下緣更遠，不會跑到海上。
 * --band 是剪紙散開的高度：手機上照片下面空比較多，散得高一點
 */
.paper-cuts {
  --band: 170px;
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.paper-cut {
  position: absolute;
  left: calc(var(--x) - var(--box) / 2);
  bottom: calc(12px + var(--y) * var(--band));
  width: var(--box);
  height: var(--box);
  overflow: visible;
  transform: rotate(var(--rot));
}

.paper-cut__grain {
  fill: url(#paint-grain);
}

.paper-cut__grain--soft {
  opacity: 0.45;
}

/* 搖擺繞著剪紙自己的中心轉 */
.paper-cut__body {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

/* 整片漂一段、轉一點，再漂回來；剪紙本身同時比較快地左右搖 */
@media (prefers-reduced-motion: no-preference) {
  .paper-cut {
    animation: paper-cut-drift var(--dur) ease-in-out var(--delay) infinite alternate;
  }

  .paper-cut__body {
    animation: paper-cut-sway var(--sway-dur) ease-in-out var(--sway-delay) infinite alternate;
  }
}

@keyframes paper-cut-drift {
  to {
    transform: translate(var(--dx), var(--dy)) rotate(calc(var(--rot) + var(--spin)));
  }
}

@keyframes paper-cut-sway {
  from {
    transform: rotate(calc(var(--sway) * -1));
  }

  to {
    transform: rotate(var(--sway));
  }
}

@media (max-width: 767px) {
  .paper-cut--wide {
    display: none;
  }
}

@media (min-width: 768px) {
  .paper-cuts {
    --band: 120px;
  }
}
</style>
