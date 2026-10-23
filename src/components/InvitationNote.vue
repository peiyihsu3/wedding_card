<script setup>
import { wedding } from '../config.js'
import { heart } from '../utils/paperCut.js'

/*
 * 標題上方一顆剪紙愛心，跟婚紗那張紙下緣的小剪紙同一種：平塗＋顆粒、不描邊。
 * 照實際像素畫，顆粒才不會跟著放大，所以窄螢幕、寬螢幕各畫一顆大小不同的，用 CSS 切換
 */
const HEARTS = [
  { size: 34, cls: 'invite__heart--narrow' },
  { size: 46, cls: 'invite__heart--wide' },
].map((h) => {
  const box = Math.ceil(h.size * 1.3)
  return { ...h, box, d: heart(h.size, box / 2, 21) }
})
</script>

<template>
  <!-- 桌曆翻頁後露出的下一頁：一句邀請的大字、幾行小字，最後是新人的署名，整段置中 -->
  <div class="invite">
    <svg
      v-for="h in HEARTS"
      :key="h.size"
      class="invite__heart"
      :class="h.cls"
      :width="h.box"
      :height="h.box"
      :viewBox="`0 0 ${h.box} ${h.box}`"
      aria-hidden="true"
    >
      <path :d="h.d" fill="#f28bab" />
      <path class="invite__heart-grain" :d="h.d" />
    </svg>
    <p class="invite__title">{{ wedding.invitation.title }}</p>
    <p class="invite__lines">
      <span v-for="line in wedding.invitation.lines" :key="line" class="invite__line">{{ line }}</span>
    </p>
    <p class="invite__sign">{{ wedding.groom }} · {{ wedding.bride }} 敬邀</p>
  </div>
</template>

<style scoped>
.invite {
  text-align: center;
}

/* 剪紙的畫布比愛心大一點，抖出去的邊不會被裁掉；斜斜擺一點，像隨手貼上去的 */
.invite__heart {
  display: block;
  margin: 0 auto 6px;
  overflow: visible;
  transform: rotate(-8deg);
}

/* 粉紅是淺色，顆粒淡一點才不會髒髒灰灰的 */
.invite__heart-grain {
  fill: url(#paint-grain);
  opacity: 0.45;
}

.invite__heart--wide {
  display: none;
}

/* 跟資訊頁的飯店名稱一樣用墨色壓深當主角；粉圓只有一種字重，不加粗 */
.invite__title {
  margin: 0;
  color: #2b2523;
  font-size: 30px;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
}

/* 一行一段，窄螢幕也不會從句子中間斷開 */
.invite__lines {
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1.7;
}

.invite__line {
  display: block;
}

.invite__sign {
  margin: 16px 0 0;
  color: #2b2523;
  font-size: 16px;
  letter-spacing: 0.1em;
}

@media (min-width: 768px) {
  .invite__title {
    font-size: 36px;
  }

  .invite__lines {
    font-size: 20px;
  }

  .invite__sign {
    font-size: 18px;
  }
}

@media (min-width: 1024px) {
  .invite__heart--narrow {
    display: none;
  }

  .invite__heart--wide {
    display: block;
    margin-bottom: 10px;
  }

  .invite__title {
    font-size: 44px;
  }

  .invite__lines {
    margin-top: 16px;
    font-size: 23px;
  }

  .invite__sign {
    margin-top: 22px;
    font-size: 20px;
  }
}

@media (min-width: 1200px) {
  .invite__title {
    font-size: 52px;
  }

  .invite__lines {
    font-size: 26px;
  }

  .invite__sign {
    font-size: 22px;
  }
}
</style>
