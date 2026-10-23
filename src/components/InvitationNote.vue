<script setup>
import { wedding } from '../config.js'
</script>

<template>
  <!-- 桌曆翻頁後露出的下一頁：一句邀請的大字、幾行小字，最後是新人的署名，整段置中 -->
  <div class="invite">
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
