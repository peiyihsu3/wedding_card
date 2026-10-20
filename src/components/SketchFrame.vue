<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sketchPoints } from '../utils/sketch.js'

/*
 * 手繪底：邊緣帶一點不規則抖動的白色圓角色塊，不描邊，跟風景插畫一樣只用平塗的色塊。
 * 框的大小跟著內容與螢幕寬度變，所以量到實際大小才畫，圓角才不會被拉歪；大小變了就重畫。
 * 外框拆成四段分開畫（上緣連兩個圓角、右邊、下緣連兩個圓角、左邊），左右兩邊都從上往下畫：
 * 框變高時上下緣的形狀不變，左右兩邊只在下端多出一截，展開收合的動畫中邊緣才不會整圈跟著抖
 */
const props = defineProps({
  seed: { type: Number, default: 1 },
  radius: { type: Number, default: 28 },
})

// 留給抖動的邊，邊緣才不會被裁掉
const INSET = 3

const el = ref(null)
const frame = ref(null) // { width, height, d }
let observer = null

function outline(width, height) {
  const x0 = INSET
  const y0 = INSET
  const x1 = width - INSET
  const y1 = height - INSET
  const r = Math.min(props.radius, (x1 - x0) / 2, (y1 - y0) / 2)
  const edge = (d, n) => sketchPoints(d, { step: 3, amp: 1.5, wavelength: 36, taper: 12, seed: props.seed * 10 + n })
  const points = [
    ...edge(`M${x0} ${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}`, 1),
    ...edge(`M${x1} ${y0 + r}V${y1 - r}`, 2),
    ...edge(`M${x1} ${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}`, 3),
    ...edge(`M${x0} ${y0 + r}V${y1 - r}`, 4).reverse(),
  ]
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`
}

function draw() {
  const { offsetWidth: width, offsetHeight: height } = el.value
  if (!width || !height || (frame.value?.width === width && frame.value?.height === height)) return
  frame.value = { width, height, d: outline(width, height) }
}

onMounted(() => {
  observer = new ResizeObserver(draw)
  observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="el" class="sketch-frame">
    <svg v-if="frame" class="sketch-frame__fill" :viewBox="`0 0 ${frame.width} ${frame.height}`" aria-hidden="true">
      <path :d="frame.d" />
    </svg>
    <div class="sketch-frame__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sketch-frame {
  position: relative;
}

.sketch-frame__fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  fill: var(--surface);
}

.sketch-frame__body {
  position: relative;
}
</style>
