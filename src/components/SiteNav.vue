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

  // 表單（送出後是結果卡片）捲到按鈕底下就收起來，避免擋住輸入框；捲過表單到下一區再出現
  const form = document.querySelector('#rsvp form, #rsvp .success')?.getBoundingClientRect()
  const bar = nav.value.getBoundingClientRect()
  hidden.value = !!form && form.top < bar.bottom && form.bottom > bar.top
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
      <!-- 目前所在區塊：底下多一層黃色厚邊 -->
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
 * 一開始疊在開場插畫的中間下方；往下捲時跟著上移，碰到畫面頂端就停住。
 * 寬度只包住按鈕本身，置頂時兩側空白處不會擋到底下內容的點擊
 */
.quick-nav {
  position: sticky;
  top: 12px;
  z-index: 10;
  display: flex;
  gap: 6px;
  width: fit-content;
  /* 往上拉進開場插畫底部（按鈕 40px + 離底 16px），下方補回 16px，後面內容的位置不受影響 */
  margin: -56px auto 16px;
  transition: opacity 0.3s, transform 0.3s, visibility 0.3s;
}

.quick-nav.is-hidden {
  visibility: hidden;
  opacity: 0;
  transform: translateY(-8px);
}

/* 手繪框按鈕：白底配深色蠟筆框線，左邊線條圖示，右邊文字；白底不透明，壓在插畫或文字上都看得清楚 */
.quick-nav__btn {
  --ink: #2b2523;
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.15em;
  white-space: nowrap;
  text-decoration: none;
}

.quick-nav__btn.is-active {
  --crayon-shade: 1;
}

/* 字距會在最後一個字後面多出一段空白，收回來文字才會置中 */
.quick-nav__label {
  margin-right: -0.15em;
}

/* 圖示沒有底色，顏色跟著文字 */
.quick-nav__icon {
  display: flex;
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

/* 寬度 360 左右的手機：縮小間距和字距，四顆才排得下 */
@media (max-width: 374px) {
  .quick-nav,
  .quick-nav__btn {
    gap: 4px;
  }

  .quick-nav__btn {
    padding: 0 10px;
    letter-spacing: 0.05em;
  }

  .quick-nav__label {
    margin-right: -0.05em;
  }
}

@media (min-width: 768px) {
  .quick-nav {
    gap: 12px;
    /* 按鈕 48px + 離底 24px */
    margin-top: -72px;
    margin-bottom: 24px;
  }

  .quick-nav__btn {
    gap: 8px;
    height: 48px;
    padding: 0 18px;
    font-size: 14px;
    letter-spacing: 0.2em;
    --crayon-stroke: 2.6;
  }

  .quick-nav__label {
    margin-right: -0.2em;
  }

  .quick-nav__icon svg {
    width: 18px;
    height: 18px;
  }
}
</style>
