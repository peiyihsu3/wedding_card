<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sketchRoundRect } from '../utils/sketch.js'

/*
 * 手繪底：邊緣帶一點不規則抖動的白色圓角色塊，不描邊，跟風景插畫一樣只用平塗的色塊。
 * 框的大小跟著內容與螢幕寬度變，所以量到實際大小才畫，圓角才不會被拉歪；大小變了就重畫
 */
const props = defineProps({
  seed: { type: Number, default: 1 },
  radius: { type: Number, default: 28 },
  // 底下多墊一層往下錯開的厚邊，像按鈕的高底；顏色用 --sketch-shade 指定
  raised: { type: Boolean, default: false },
})

// 留給抖動的邊，邊緣才不會被裁掉
const INSET = 3

const el = ref(null)
const frame = ref(null) // { width, height, d }
let observer = null

function draw() {
  const { offsetWidth: width, offsetHeight: height } = el.value
  if (!width || !height || (frame.value?.width === width && frame.value?.height === height)) return
  const d = sketchRoundRect(INSET, INSET, width - INSET, height - INSET, {
    radius: props.radius,
    seed: props.seed,
    step: 3,
    amp: 1.5,
    wavelength: 36,
  })
  frame.value = { width, height, d }
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
      <path v-if="raised" class="sketch-frame__shade" :d="frame.d" transform="translate(0 5)" />
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
  fill: var(--sketch-fill, var(--surface));
  /* 平常不描邊；要描邊或標示狀態時（例如輸入框聚焦、填錯），父層用 --sketch-stroke 指定線的顏色、--sketch-fill 換底色 */
  stroke: var(--sketch-stroke, none);
  stroke-width: 2.5;
  stroke-linejoin: round;
  transition: fill 0.2s, stroke 0.2s;
}

.sketch-frame__shade {
  fill: var(--sketch-shade, #ffd65a);
}

.sketch-frame__body {
  position: relative;
}
</style>
