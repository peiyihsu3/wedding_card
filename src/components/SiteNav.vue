<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { tornEdge } from '../utils/sketch.js'
import CrayonFrame from './CrayonFrame.vue'

const props = defineProps({
  // [{ id, label, icon }]，id 對應頁面上各區塊的 id，也是分享用的錨點（例如 #rsvp）；icon 是下方 icons 的名稱
  sections: { type: Array, required: true },
})

// 線條圖示（24×24）
const icons = {
  calendar: 'M5.5 5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3.5 10h17M8 3v4M16 3v4',
  camera:
    'M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM15.5 13a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0z',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM14.5 10a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0z',
  mail: 'M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM3.5 7.5l8.5 6 8.5-6',
}

/*
 * 手機上的紙條：上緣的撕紙邊。起伏比婚紗那張紙明顯（約 200px 一個波，加一道短的打亂規律），
 * 撕口的小塊和毛邊調淡，紙邊才是緩緩起伏，不會碎碎的。TEAR 是撕進去最深多少
 */
const TEAR = 8
const TEAR_EDGE = {
  waves: [
    [32, 0.65],
    [10, 0.1],
  ],
  rough: 0.3,
}

const nav = ref(null)
const active = ref('')
const hidden = ref(false)
// 手機上已經捲離首屏、紙條要從綠色換成白色
const solid = ref(false)
const paper = ref(null) // { width, height, d }
let targets = []
let frame = 0
let observer = null

// 紙條照實際大小畫，撕紙邊才不會跟著螢幕寬度被拉長、壓扁
function drawPaper() {
  const { offsetWidth: width, offsetHeight: height } = nav.value
  if (!width || !height || (paper.value?.width === width && paper.value?.height === height)) return
  paper.value = { width, height, d: `${tornEdge(0, width, { depth: TEAR, seed: 5, ...TEAR_EDGE })}L${width} ${height}H0Z` }
}

function update() {
  frame = 0
  // 以畫面中線為準：最後一個頂端已越過中線的區塊就是目前位置，還在開場插畫時則為空
  const mid = window.innerHeight / 2
  const current = targets.filter((el) => el.getBoundingClientRect().top <= mid).pop()
  active.value = current?.id ?? ''

  // 表單（送出後是結果卡片）捲到按鈕底下就收起來，避免擋住輸入框；捲過表單到下一區再出現。
  // 按鈕在畫面底部時（平板以下），表單只從下緣露出一點、還在看資訊時不收，上緣捲過畫面中線才收
  const form = document.querySelector('#rsvp form, #rsvp .success')?.getBoundingClientRect()
  const bar = nav.value.getBoundingClientRect()
  hidden.value = !!form && form.top < mid && form.top < bar.bottom && form.bottom > bar.top

  // 第一區（婚紗那張紙）一捲上來碰到按鈕就換成白色紙條：首屏是綠色紙條配白字，往下捲之後換成白色紙條配墨色字
  solid.value = !!targets[0] && targets[0].getBoundingClientRect().top < bar.bottom
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(update)
}

onMounted(() => {
  targets = props.sections.map(({ id }) => document.getElementById(id)).filter(Boolean)
  update()
  observer = new ResizeObserver(drawPaper)
  observer.observe(nav.value)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(frame)
  observer?.disconnect()
})
</script>

<template>
  <nav ref="nav" class="quick-nav" :class="{ 'is-hidden': hidden, 'is-solid': solid }" aria-label="快速前往">
    <!-- 手機上的紙條，上緣是撕開的紙邊：首屏是綠色（漸層＋顆粒），往下捲之後上面那層白色（平塗＋淡顆粒）淡入蓋過去 -->
    <svg v-if="paper" class="quick-nav__paper" :viewBox="`0 0 ${paper.width} ${paper.height}`" aria-hidden="true">
      <g class="quick-nav__paper-green">
        <path class="quick-nav__paper-fill" :d="paper.d" />
        <path class="quick-nav__paper-grain" :d="paper.d" />
      </g>
      <g class="quick-nav__paper-white">
        <path class="quick-nav__paper-fill" :d="paper.d" />
        <path class="quick-nav__paper-grain" :d="paper.d" />
      </g>
    </svg>
    <a
      v-for="(s, i) in sections"
      :key="s.id"
      class="quick-nav__btn"
      :class="{ 'is-active': active === s.id }"
      :href="`#${s.id}`"
      :aria-current="active === s.id ? 'location' : undefined"
    >
      <!-- 目前所在區塊：底下多一層黃色厚邊（手機上不畫框，字換成綠色） -->
      <CrayonFrame class="quick-nav__frame" :seed="i * 7 + 3" />
      <span class="quick-nav__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path :d="icons[s.icon]" /></svg>
      </span>
      <span class="quick-nav__label">{{ s.label }}</span>
    </a>
  </nav>
</template>

<style scoped>
/*
 * 手機（比 768px 窄）：貼齊畫面底部的一條，四個項目只有字、不畫框，平分整條的寬度。
 * 紙條的上緣是撕開的紙邊：首屏時是綠色紙條配白字；往下捲、婚紗那張紙碰到按鈕之後，換成白色紙條、字換成半透明的墨色，
 * 目前所在的那一項是不透明的墨色。
 * 紙條連撕紙邊 56px 高，跟首屏的 --nav-bottom + --nav-h 一樣，首屏的人物和樹照這個高度排。
 * 平板以下（比 1024px 窄）固定在畫面底部：首屏剛好一個畫面高，一開始就疊在開場插畫的下方，
 * 往下捲時留在原處，不再跟著移到畫面頂端。桌機才往上捲到畫面頂端停住（見下面的 1024px）
 */
.quick-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  /* 手機的字色：首屏的綠色紙條上是白字；換成白色紙條後是半透明的墨色，目前那一項是不透明的墨色 */
  --nav-text: #fff;
  --nav-current: #fff;

  z-index: 10;
  display: flex;
  /* 上面多留撕紙邊的深度（TEAR），字才不會壓到撕口 */
  padding: 10px 4px 6px;
  transition: opacity 0.3s, transform 0.3s, visibility 0.3s;
}

/* 捲離首屏：其他項目淡一點，目前那一項才跳出來 */
.quick-nav.is-solid {
  --nav-text: rgb(43 37 35 / 0.5);
  --nav-current: #2b2523;
}

/* 往畫面外收：在底部就往下、在頂端就往上；手機的紙條整條收到畫面下面 */
.quick-nav.is-hidden {
  visibility: hidden;
  opacity: 0;
  transform: translateY(100%);
}

/*
 * 紙條：首屏時是綠色（樹叢綠上亮下暗，見 PaintDefs 的 nav-strip）＋顆粒；
 * 捲離首屏後，上面那層白色（平塗＋淡顆粒，很淺的顏色顆粒淡一點才不會髒）淡入，整個蓋掉底下的綠色和它的顆粒。
 * 婚紗那張紙是奶油白，白紙條壓在上面看不出撕口，撕邊往上透一道很淡的影子，像一張紙疊在另一張紙上
 */
.quick-nav__paper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 -1px 2px rgb(43 37 35 / 0.14));
}

.quick-nav__paper-grain {
  fill: url(#paint-grain);
}

.quick-nav__paper-green .quick-nav__paper-fill {
  fill: url(#paint-shade-nav-strip);
}

.quick-nav__paper-white {
  opacity: 0;
  transition: opacity 0.3s;
}

.quick-nav.is-solid .quick-nav__paper-white {
  opacity: 1;
}

.quick-nav__paper-white .quick-nav__paper-fill {
  fill: #fff;
}

.quick-nav__paper-white .quick-nav__paper-grain {
  opacity: 0.45;
}

/* 按鈕：手機上只有紙條上的字，平板以上是白底配深色蠟筆框線，左邊線條圖示、右邊文字；白底不透明，壓在插畫或文字上都看得清楚 */
.quick-nav__btn {
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 4px;
  border-radius: 12px;
  color: var(--nav-text);
  transition: color 0.3s;
  /* 字跟著螢幕寬度放大：寬度 320 的手機 15px，一般手機約 18px */
  font-size: clamp(15px, 4.6vw, 18px);
  font-weight: 600;
  letter-spacing: 0.15em;
  white-space: nowrap;
  text-decoration: none;
}

.quick-nav__btn.is-active {
  --crayon-shade: 1;
  color: var(--nav-current);
}

.quick-nav__frame {
  display: none;
}

/*
 * 字距會在最後一個字後面多出一段空白，收回來文字才會置中。
 * 手機上目前那一項的字放大一些；用縮放不改字級，旁邊的字才不會被擠動。從字的中間放大（扣掉最後一個字後面的字距）
 */
.quick-nav__label {
  margin-right: -0.15em;
  transform-origin: calc(50% - 0.075em) 50%;
}

.quick-nav__btn.is-active .quick-nav__label {
  transform: scale(1.15);
}

/* 換到這一項時字先放大過頭一點再彈回來，像跳出來 */
@media (prefers-reduced-motion: no-preference) {
  .quick-nav__label {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

/*
 * 圖示沒有底色，顏色跟著文字。手機上不放：帶圖示的四顆按鈕幾乎跟畫面一樣寬，兩側貼著畫面邊緣太擠，
 * 拿掉圖示，空出來的寬度留給比較大的字和按鈕之間的間隔
 */
.quick-nav__icon {
  display: none;
  flex: none;
}

.quick-nav__icon svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (hover: hover) {
  .quick-nav__btn:hover {
    --crayon-face: #fff8de;
  }
}

/* 平板：沒有紙條，一排白底蠟筆框的按鈕浮在畫面底部，一直是墨色字（目前那一項用黃色厚邊標示） */
@media (min-width: 768px) {
  .quick-nav,
  .quick-nav.is-solid {
    --nav-text: #2b2523;
    --nav-current: #2b2523;
  }

  .quick-nav {
    bottom: 24px;
    gap: 12px;
    width: fit-content;
    margin: 0 auto;
    padding: 0;
  }

  .quick-nav.is-hidden {
    transform: translateY(8px);
  }

  .quick-nav__paper {
    display: none;
  }

  .quick-nav__frame {
    display: block;
  }

  .quick-nav__btn {
    gap: 8px;
    height: 48px;
    padding: 0 18px;
    font-size: 14px;
    letter-spacing: 0.2em;
    --crayon-stroke: 2.6;
  }

  /* 平板的字在框裡，放大會撐出框，目前那一項改用黃色厚邊標示 */
  .quick-nav__label,
  .quick-nav__btn.is-active .quick-nav__label {
    margin-right: -0.2em;
    transform: none;
  }

  .quick-nav__icon {
    display: flex;
  }

  .quick-nav__icon svg {
    width: 18px;
    height: 18px;
  }
}

/* 桌機：一開始疊在開場插畫的中間下方，往下捲時跟著上移，碰到畫面頂端就停住 */
@media (min-width: 1024px) {
  .quick-nav {
    position: sticky;
    top: 12px;
    right: auto;
    bottom: auto;
    left: auto;
    /* 往上拉進開場插畫底部（按鈕 48px + 離底 24px），下方補回 24px，後面內容的位置不受影響 */
    margin: -72px auto 24px;
  }

  .quick-nav.is-hidden {
    transform: translateY(-8px);
  }
}
</style>
