<script setup>
import CrayonFrame from './CrayonFrame.vue'
import PostcardFrame from './PostcardFrame.vue'
import SketchFrame from './SketchFrame.vue'

defineProps({
  // RsvpForm 送出的 payload
  data: { type: Object, required: true },
  updated: { type: Boolean, default: false },
})

defineEmits(['edit'])
</script>

<template>
  <!-- 送出後換成同一張明信片，寫上回覆的內容；按鈕跟表單一樣是蠟筆框 -->
  <section class="success" aria-live="polite">
    <PostcardFrame :seed="70">
      <h2 class="success__title">
        謝謝<span class="success__name">{{ data.name }}</span>回覆，<br />
        {{ data.attending ? '期待與您相見' : '感謝您的祝福' }}
      </h2>
      <p v-if="updated" class="success__note">已更新您先前的回覆</p>

      <SketchFrame class="success__summary" :seed="71" :radius="16">
        <dl class="success__list">
          <div>
            <dt>您是</dt>
            <dd>{{ data.side }}親友</dd>
          </div>
          <div>
            <dt>是否出席</dt>
            <dd>{{ data.attending ? '會出席' : '無法出席' }}</dd>
          </div>
          <template v-if="data.attending">
            <div>
              <dt>出席人數</dt>
              <dd>{{ data.guests }} 位</dd>
            </div>
            <div>
              <dt>素食</dt>
              <dd>{{ data.vegetarian }} 位</dd>
            </div>
            <div>
              <dt>兒童椅</dt>
              <dd>{{ data.childSeats }} 張</dd>
            </div>
            <div>
              <dt>飲食禁忌或過敏</dt>
              <dd>{{ data.dietary || '沒有' }}</dd>
            </div>
          </template>
        </dl>
      </SketchFrame>

      <button type="button" class="success__edit" @click="$emit('edit')">
        <CrayonFrame :seed="72" :radius="14" />
        修改回覆
      </button>
    </PostcardFrame>
  </section>
</template>

<style scoped>
.success {
  text-align: center;
}

/* 跟表單的標題一樣：深色字、不硬加粗，字距會在最後一個字後面多留一段，左邊補回同樣的寬度才會真的置中；
   名字長的話在手機上會再折一行，balance 讓折開的兩行差不多長 */
.success__title {
  padding-left: 0.12em;
  color: #2b2523;
  font-size: 26px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0.12em;
  text-wrap: balance;
}

/* 名字放得下就整個排在同一行（Pei-Yi 不要在連字號折開）；英文名字套標題的字距太鬆，收回來。
   前後不打空白、用 margin 隔開，中文名字才不會隔太開；左邊少一點，是因為前一個字已經帶著標題的字距 */
.success__name {
  display: inline-block;
  margin: 0 0.25em 0 0.15em;
  letter-spacing: 0.02em;
}

.success__note {
  display: inline-block;
  margin: 12px 0 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 13px;
}

/* 回覆內容墊一塊不描邊的白色手繪底，蓋掉方格紙的格線，跟卡紙分開；桌機的卡片很寬，拉滿的話標題和內容隔太開、不好對著讀，限制寬度置中 */
.success__summary {
  --sketch-fill: #fff;
  max-width: 520px;
  margin: 28px auto;
}

.success__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 20px;
  text-align: left;
}

.success__list div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

/* 飲食禁忌寫很長時讓內容換行，標題不要被擠成好幾行 */
.success__list dt {
  flex-shrink: 0;
  color: var(--text-muted);
}

.success__list dd {
  margin: 0;
  font-weight: 500;
  text-align: right;
}

.success__edit {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  height: var(--control-height);
  padding: 0 32px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #2b2523;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
}

@media (hover: hover) {
  .success__edit:hover {
    --crayon-face: #fff8de;
  }
}

@media (min-width: 768px) {
  .success__title {
    font-size: 34px;
  }
}
</style>
