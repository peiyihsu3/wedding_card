<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
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

const nav = ref(null)
const active = ref('')
const hidden = ref(false)
let targets = []
let frame = 0

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
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(update)
}

onMounted(() => {
  targets = props.sections.map(({ id }) => document.getElementById(id)).filter(Boolean)
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <nav ref="nav" class="quick-nav" :class="{ 'is-hidden': hidden }" aria-label="快速前往">
    <a
      v-for="(s, i) in sections"
      :key="s.id"
      class="quick-nav__btn"
      :class="{ 'is-active': active === s.id }"
      :href="`#${s.id}`"
      :aria-current="active === s.id ? 'location' : undefined"
    >
      <!-- 目前所在區塊：底下多一層黃色厚邊，按鈕往上墊高 -->
      <CrayonFrame :seed="i * 7 + 3" />
      <span class="quick-nav__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path :d="icons[s.icon]" /></svg>
      </span>
      <span class="quick-nav__label">{{ s.label }}</span>
    </a>
  </nav>
</template>

<style scoped>
/*
 * 平板以下（比 1024px 窄）固定在畫面底部：首屏剛好一個畫面高，一開始就疊在開場插畫的中間下方（離底距離跟首屏的 --nav-bottom 一樣），
 * 往下捲時留在原處，不再跟著移到畫面頂端。桌機才往上捲到畫面頂端停住（見下面的 1024px）。
 * 手機上撐到離畫面兩側 20px，按鈕平分多出來的寬度，各種寬度的手機兩側都留一樣的空白；
 * 螢幕再寬就不再撐開，按鈕才不會拉得太長。寬螢幕只包住按鈕本身，兩側空白處不會擋到底下內容的點擊
 */
.quick-nav {
  position: fixed;
  right: 0;
  bottom: 16px;
  left: 0;
  z-index: 10;
  display: flex;
  gap: 8px;
  width: min(100% - 40px, 400px);
  margin: 0 auto;
  transition: opacity 0.3s, transform 0.3s, visibility 0.3s;
}

/* 往畫面外收：在底部就往下、在頂端就往上 */
.quick-nav.is-hidden {
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px);
}

/* 手繪框按鈕：白底配深色蠟筆框線，左邊線條圖示（手機上只有文字），右邊文字；白底不透明，壓在插畫或文字上都看得清楚 */
.quick-nav__btn {
  --ink: #2b2523;
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* 跟桌機一樣高，手指比較好點 */
  height: 48px;
  padding: 0 8px;
  border-radius: 12px;
  color: var(--ink);
  /* 字跟著螢幕寬度放大：寬度 320 的手機 13px 剛好排得下，一般手機約 15px */
  font-size: clamp(13px, 3.8vw, 15px);
  font-weight: 600;
  letter-spacing: 0.15em;
  white-space: nowrap;
  text-decoration: none;
  transition: transform 0.2s;
}

/*
 * 目前所在：黃色厚邊（CrayonFrame 往下錯開 5px）墊在底下，整顆按鈕往上抬同樣的距離，
 * 厚邊的下緣剛好落在按鈕原本的底，看起來是從下面把按鈕墊高，不是厚邊往下長出去
 */
.quick-nav__btn.is-active {
  --crayon-shade: 1;
  transform: translateY(-5px);
}

/* 字距會在最後一個字後面多出一段空白，收回來文字才會置中 */
.quick-nav__label {
  margin-right: -0.15em;
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

@media (min-width: 768px) {
  .quick-nav {
    bottom: 24px;
    gap: 12px;
    width: fit-content;
  }

  .quick-nav__btn {
    gap: 8px;
    padding: 0 18px;
    font-size: 14px;
    letter-spacing: 0.2em;
    --crayon-stroke: 2.6;
  }

  .quick-nav__label {
    margin-right: -0.2em;
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
