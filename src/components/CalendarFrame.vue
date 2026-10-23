<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sketchRoundRect } from '../utils/sketch.js'

/*
 * 桌曆框：白色紙頁不描墨線，外圈一道手繪的黃框（之前是右下方往外錯開的黃色厚邊，改成框；上緣的線圈也拿掉了）。
 * 跟 PictureFrame 一樣量到實際大小才畫，大小變了就重畫。
 *
 * 內容印在最上面那一頁，往下滑離開這一區時，這一頁跟著捲動以上緣為軸慢慢往上翻，露出底下的下一頁（next 插槽，沒給就是空白頁）。
 * 桌機翻頁時日曆停在畫面上，外層（calendar-turn）多撐出一段翻頁用的捲動距離，見 placeTurn
 */
const props = defineProps({
  seed: { type: Number, default: 1 },
})

// 留給抖動的邊，邊緣才不會被裁掉
const INSET = 3
const LINE = { step: 4, amp: 1.6, wavelength: 70 }

/*
 * 日曆的上緣捲到畫面上緣往下這麼多（快捷按鈕的下方）才開始翻，點快捷按鈕「資訊」跳過來時還停在這條線下面，看得到整頁；
 * 從這裡再捲一個日曆的高度，剛好翻過去 180 度（CSS 的 view-timeline-inset 與 exit-crossing 範圍）
 */
const TURN_FROM = 80

const track = ref(null)
const el = ref(null)
const body = ref(null)
const frame = ref(null) // { key, width, height, w, h, stroke, page }
const turn = ref({ from: TURN_FROM, length: 0, pinned: false })
let observer = null

/*
 * 桌機的畫面矮、日曆寬，一邊翻一邊捲的話，下一頁整個露出來時日曆已經捲到畫面最上面，下一頁的字一下就捲走了。
 * 所以桌機翻頁時日曆停在畫面上（sticky），下面多留一段跟日曆一樣高的捲動距離慢慢翻，翻完才接著往上捲：
 * 停在畫面中間，但不高過快捷按鈕下方（TURN_FROM），也不低過點「資訊」跳過來時日曆的位置
 * （區塊上方的留白，就是外層的 offsetTop），不然很高的螢幕一跳過來就已經翻了一截。
 * 平板、手機照原本一邊翻一邊捲；減少動態時不翻也不停
 */
const desktop = window.matchMedia('(min-width: 1024px)')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
function placeTurn() {
  const h = el.value.offsetHeight
  const pinned = desktop.matches && !reduceMotion.matches
  const middle = Math.round((window.innerHeight - h) / 2)
  const from = pinned ? Math.max(TURN_FROM, Math.min(middle, track.value.offsetTop)) : TURN_FROM
  const { value } = turn
  if (value.from !== from || value.length !== h || value.pinned !== pinned) turn.value = { from, length: h, pinned }
}

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
 * 不支援的才在這裡照捲動距離算翻到哪裡（--turn-at，0–1，跟 CSS 的範圍一樣）。減少動態效果時不翻。
 * 量外層：桌機的日曆黏在畫面上不動，外層才照實際捲動的距離走
 */
const turnByScript = !CSS.supports('animation-timeline: scroll()') && !reduceMotion.matches
let turnFrame = 0
function applyTurn() {
  turnFrame = 0
  const { top } = track.value.getBoundingClientRect()
  const { from, length } = turn.value
  const at = length ? Math.min(1, Math.max(0, (from - top) / length)) : 0
  body.value.style.setProperty('--turn-at', at.toFixed(3))
}
function onTurnScroll() {
  if (!turnFrame) turnFrame = requestAnimationFrame(applyTurn)
}

// 日曆的大小、畫面的高度變了，重新算停在哪裡、翻多久
function onResize() {
  draw()
  placeTurn()
  if (turnByScript) onTurnScroll()
}

onMounted(() => {
  observer = new ResizeObserver(onResize)
  observer.observe(el.value)
  window.addEventListener('resize', onResize, { passive: true })
  placeTurn()
  if (turnByScript) {
    applyTurn()
    window.addEventListener('scroll', onTurnScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onTurnScroll)
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(turnFrame)
})
</script>

<template>
  <div
    ref="track"
    class="calendar-turn"
    :class="{ 'is-pinned': turn.pinned }"
    :style="{ '--turn-from': `${turn.from}px`, '--turn-length': `${turn.length}px` }"
  >
    <div ref="el" class="calendar-frame">
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
 * 下一頁的字排在偏下的地方：紙頁從下緣開始掀起來，排在下半截，翻頁途中一露出來就看得到；
 * 平板、手機一邊翻一邊捲，翻到一半時日曆的上半截已經捲到畫面外，整頁看得到的時間很短。
 * 手機不貼著下緣：原本下方只留 36px，字擠在最下面、上面空一大片，下方多留一段，字的中間落在約六成高的地方。
 * 桌機翻頁時日曆停在畫面上，整頁都看得到，改成上下置中（見下方 1024px）
 */
.calendar-frame__next {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28px 20px 104px;
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
   * 翻頁的範圍量外層：外層的上緣捲到 --turn-from 開始，再捲 --turn-length（日曆的高度）翻完（exit-crossing 範圍，上方內縮 --turn-from）。
   * 平板、手機的外層就是日曆本身，跟原本一樣是日曆的下緣也捲到那條線時翻完
   */
  .calendar-turn {
    view-timeline: --calendar-turn block;
    view-timeline-inset: var(--turn-from) 0px;
  }

  /*
   * 桌機：外層多撐出翻頁的捲動距離，日曆在裡面黏在 --turn-from 翻頁，翻完剛好滑到外層的底，接著跟頁面一起往上捲。
   * 用內容撐、不用 padding：sticky 只在外層的內容框裡移動，padding 那段日曆走不進去
   */
  .calendar-turn.is-pinned::after {
    content: '';
    display: block;
    height: var(--turn-length);
  }

  .calendar-turn.is-pinned .calendar-frame {
    position: sticky;
    top: var(--turn-from);
  }

  /* 視角從日曆上緣看過去，紙頁翻起來時下緣朝畫面湊近、越過上緣 */
  .calendar-frame {
    perspective: 2400px;
    perspective-origin: 50% 0;
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
      animation-range: exit-crossing 0px exit-crossing var(--turn-length);
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

@media (min-width: 1024px) {
  .calendar-frame__next {
    justify-content: center;
    padding: 40px;
  }
}
</style>
