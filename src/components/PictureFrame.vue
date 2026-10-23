<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sketchRoundRect } from '../utils/sketch.js'

/*
 * 手繪相框：外圈一條有顏色的寬邊，裡面是白紙，內外兩圈都描黑色的手繪線。
 * 寬邊就是外層的 padding，內圈的線沿著內容區（白紙）的邊緣畫；
 * 跟 SketchFrame 一樣量到實際大小才畫，大小變了就重畫。寬邊的顏色用 --frame-band、白紙的顏色用 --frame-paper 指定
 */
const props = defineProps({
  seed: { type: Number, default: 1 },
})

// 留給抖動的邊，邊緣才不會被裁掉
const INSET = 3
const LINE = { step: 4, amp: 1.6, wavelength: 70 }

const el = ref(null)
const body = ref(null)
const frame = ref(null) // { key, width, height, outer, inner }
let observer = null

function draw() {
  const { offsetWidth: width, offsetHeight: height } = el.value
  const { offsetLeft: left, offsetTop: top, offsetWidth: w, offsetHeight: h } = body.value
  const key = [width, height, left, top].join()
  if (!width || !height || frame.value?.key === key) return
  frame.value = {
    key,
    width,
    height,
    outer: sketchRoundRect(INSET, INSET, width - INSET, height - INSET, { ...LINE, radius: 10, seed: props.seed }),
    inner: sketchRoundRect(left, top, left + w, top + h, { ...LINE, radius: 6, seed: props.seed + 1 }),
  }
}

onMounted(() => {
  observer = new ResizeObserver(draw)
  observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="el" class="picture-frame">
    <svg v-if="frame" class="picture-frame__art" :viewBox="`0 0 ${frame.width} ${frame.height}`" aria-hidden="true">
      <path class="picture-frame__band" :d="frame.outer" />
      <path class="picture-frame__paper" :d="frame.inner" />
    </svg>
    <div ref="body" class="picture-frame__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* 寬邊的寬度可以用 --frame-band-width 換掉（手機與桌機各指定一次） */
.picture-frame {
  position: relative;
  padding: var(--frame-band-width, 14px);
}

.picture-frame__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  stroke: #2b2523;
  stroke-width: 2.5;
  stroke-linejoin: round;
}

.picture-frame__band {
  fill: var(--frame-band, #a8d6ee);
}

.picture-frame__paper {
  fill: var(--frame-paper, #fff);
}

.picture-frame__body {
  position: relative;
  padding: 28px 20px;
}

@media (min-width: 768px) {
  .picture-frame {
    padding: var(--frame-band-width, 20px);
  }

  .picture-frame__body {
    padding: 40px;
  }
}
</style>
