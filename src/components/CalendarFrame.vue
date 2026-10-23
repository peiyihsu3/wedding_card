<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sketchRoundRect } from '../utils/sketch.js'

/*
 * 桌曆框：白色紙頁不描墨線，外圈一道手繪的黃框（之前是右下方往外錯開的黃色厚邊，改成框；上緣的線圈也拿掉了）。
 * 跟 PictureFrame 一樣量到實際大小才畫，大小變了就重畫。
 *
 * 內容印在最上面那一頁，往下滑離開這一區時，這一頁跟著捲動以上緣為軸慢慢往上翻，露出底下的下一頁（next 插槽，沒給就是空白頁）
 */
const props = defineProps({
  seed: { type: Number, default: 1 },
})

// 留給抖動的邊，邊緣才不會被裁掉
const INSET = 3
const LINE = { step: 4, amp: 1.6, wavelength: 70 }

/*
 * 日曆的上緣捲到畫面上緣往下這麼多（快捷按鈕的下方）才開始翻，點快捷按鈕「資訊」跳過來時還停在這條線下面，看得到整頁；
 * 從這裡到日曆的下緣也捲到這條線，剛好翻過去 180 度（CSS 的 view-timeline-inset 與 exit 範圍）
 */
const TURN_FROM = 80

const el = ref(null)
const body = ref(null)
const frame = ref(null) // { key, width, height, w, h, stroke, page }
let observer = null

function draw() {
  const { offsetWidth: width, offsetHeight: height } = el.value
  const { offsetWidth: w, offsetHeight: h } = body.value
  const key = [width, height, w, h].join()
  if (!width || !height || frame.value?.key === key) return

  // 黃框跟著日曆寬度分三級粗細；框線畫在紙頁的邊上，紙頁往內縮半條線，框的外緣才剛好在 INSET
  const stroke = w < 560 ? 6 : w < 800 ? 8 : 10
  const edge = INSET + stroke / 2

  frame.value = {
    key,
    width,
    height,
    w,
    h,
    stroke,
    page: sketchRoundRect(edge, edge, w - edge, h - edge, { ...LINE, radius: 18, seed: props.seed + 1 }),
  }
}

/*
 * 翻頁跟著捲動走：支援捲動時間軸的瀏覽器直接用 CSS 做（見樣式的 calendar-turn），
 * 不支援的才在這裡照捲動距離算翻到哪裡（--turn-at，0–1，跟 CSS 的範圍一樣）。減少動態效果時不翻
 */
const turnByScript =
  !CSS.supports('animation-timeline: scroll()') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
let turnFrame = 0
function applyTurn() {
  turnFrame = 0
  const { top, height } = el.value.getBoundingClientRect()
  const at = Math.min(1, Math.max(0, (TURN_FROM - top) / height))
  body.value.style.setProperty('--turn-at', at.toFixed(3))
}
function onTurnScroll() {
  if (!turnFrame) turnFrame = requestAnimationFrame(applyTurn)
}

onMounted(() => {
  observer = new ResizeObserver(draw)
  observer.observe(el.value)
  if (turnByScript) {
    applyTurn()
    window.addEventListener('scroll', onTurnScroll, { passive: true })
    window.addEventListener('resize', onTurnScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onTurnScroll)
  window.removeEventListener('resize', onTurnScroll)
  cancelAnimationFrame(turnFrame)
})
</script>

<template>
  <div ref="el" class="calendar-frame" :style="{ '--turn-from': `${TURN_FROM}px` }">
    <!-- 底下的下一頁 -->
    <svg v-if="frame" class="calendar-frame__art" :viewBox="`0 0 ${frame.width} ${frame.height}`" aria-hidden="true">
      <path class="calendar-frame__under" :d="frame.page" :stroke-width="frame.stroke" />
    </svg>
    <!-- 下一頁印的字，跟紙頁一樣大，被上面那一頁蓋住，翻起來才露出來 -->
    <div v-if="$slots.next" class="calendar-frame__next">
      <slot name="next" />
    </div>
    <!-- 印著內容的這一頁：正面是紙頁與內容，背面是空白的紙背，往上翻過去後才看得到 -->
    <div ref="body" class="calendar-frame__leaf">
      <div class="calendar-frame__face">
        <svg v-if="frame" class="calendar-frame__sheet" :viewBox="`0 0 ${frame.w} ${frame.h}`" aria-hidden="true">
          <path class="calendar-frame__page" :d="frame.page" :stroke-width="frame.stroke" />
        </svg>
        <div class="calendar-frame__body">
          <slot />
        </div>
      </div>
      <svg
        v-if="frame"
        class="calendar-frame__sheet calendar-frame__face--back"
        :viewBox="`0 0 ${frame.w} ${frame.h}`"
        aria-hidden="true"
      >
        <path class="calendar-frame__page-back" :d="frame.page" :stroke-width="frame.stroke" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
/*
 * 紙頁外圈的黃框不描墨線，直接放在藍海上，靠顏色分出來，所以黃要夠飽和；
 * 但比全站的黃（#ffd65a）淡一點，放在飽和的藍海上才不刺眼。裡面的撕線（WeddingHero）也用這個黃
 */
.calendar-frame {
  --calendar-yellow: #fad670;
  position: relative;
}

.calendar-frame__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* 每一頁都有一樣的黃框（這一頁、底下的下一頁、翻過去的紙背），翻頁時才不會一頁有框、一頁沒有 */
.calendar-frame__page,
.calendar-frame__under,
.calendar-frame__page-back {
  stroke: var(--calendar-yellow);
  stroke-linejoin: round;
}

.calendar-frame__page {
  fill: #fff;
}

/* 底下的下一頁比白紙暗一點點：紙頁都不描邊，翻起來的白紙壓在白紙上會看不出下緣 */
.calendar-frame__under {
  fill: #f8f2e7;
}

/* 印著內容的這一頁撐出整個日曆的大小，白色的紙頁畫在內容後面 */
.calendar-frame__leaf,
.calendar-frame__face,
.calendar-frame__body {
  position: relative;
}

.calendar-frame__body {
  padding: 28px 20px;
}

/*
 * 下一頁的字排在偏下的地方：紙頁從下緣開始掀起來，翻到一半時日曆的上半截已經捲到快捷按鈕後面，
 * 整頁看得到的時間很短；排在下半截，翻頁途中一露出來就看得到
 */
.calendar-frame__next {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28px 20px 36px;
}

.calendar-frame__sheet {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* 紙背比正面暗一點點，翻到上面時看得出是背面；減少動態時不翻，用不到 */
.calendar-frame__face--back {
  display: none;
}

.calendar-frame__page-back {
  fill: #f6efe4;
}

@media (prefers-reduced-motion: no-preference) {
  /*
   * 視角從日曆上緣看過去，紙頁翻起來時下緣朝畫面湊近、越過上緣。
   * 翻頁的範圍：日曆的上緣捲到 --turn-from 開始，下緣也捲到那裡時翻完（exit 範圍，上方內縮 --turn-from）
   */
  .calendar-frame {
    perspective: 2400px;
    perspective-origin: 50% 0;
    view-timeline: --calendar-turn block;
    view-timeline-inset: var(--turn-from) 0px;
  }

  /* 不支援捲動時間軸的瀏覽器由 JS 算 --turn-at（0–1） */
  .calendar-frame__leaf {
    transform-origin: 50% 0;
    transform-style: preserve-3d;
    transform: rotateX(calc(var(--turn-at, 0) * 180deg));
  }

  @supports (animation-timeline: view()) {
    .calendar-frame__leaf {
      animation: calendar-turn linear both;
      animation-timeline: --calendar-turn;
      animation-range: exit 0% exit 100%;
    }
  }

  .calendar-frame__face {
    backface-visibility: hidden;
  }

  .calendar-frame__face--back {
    display: block;
    transform: rotateX(180deg);
    backface-visibility: hidden;
  }
}

@keyframes calendar-turn {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(180deg);
  }
}

@media (min-width: 768px) {
  .calendar-frame__body {
    padding: 40px;
  }

  .calendar-frame__next {
    padding: 40px 40px 56px;
  }
}
</style>
