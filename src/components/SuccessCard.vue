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

// 首屏天空裡飄著的那顆愛心（座標移到原點），上面一道白色的反光
const HEART = 'M0 40C0 5 45 0 50 30C55 0 100 5 100 40C100 70 60 95 50 110C40 95 0 70 0 40Z'
</script>

<template>
  <!-- 送出後換成同一張明信片，寫上回覆的內容；按鈕跟表單一樣是蠟筆框 -->
  <section class="success" aria-live="polite">
    <PostcardFrame :seed="70">
      <svg class="success__heart" viewBox="-4 -4 108 118" aria-hidden="true">
        <path class="fill-heart" :d="HEART" />
        <path class="success__shine" d="M18 30q4-14 18-16" />
      </svg>
      <h2 class="success__title">{{ data.attending ? '期待與您相見' : '感謝您的祝福' }}</h2>
      <p class="success__message">
        <template v-if="data.attending">
          謝謝 {{ data.name }} 的回覆，我們已收到您 {{ data.guests }} 位的出席資訊。
        </template>
        <template v-else>
          謝謝 {{ data.name }} 的回覆，雖然這次無法到場，仍非常感謝您的心意。
        </template>
      </p>
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

.success__heart {
  display: block;
  width: 56px;
  margin: 0 auto 16px;
  overflow: visible;
}

.success__shine {
  fill: none;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 6;
  stroke-linecap: round;
}

/* 跟表單的標題一樣：深色字、不硬加粗，字距會在最後一個字後面多留一段，左邊補回同樣的寬度才會真的置中 */
.success__title {
  padding-left: 0.12em;
  color: #2b2523;
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 0.12em;
}

.success__message {
  margin: 12px 0 0;
  color: var(--text-muted);
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

/* 回覆內容墊一塊不描邊的白色手繪底，蓋掉方格紙的格線，跟卡紙分開 */
.success__summary {
  --sketch-fill: #fff;
  margin: 28px 0;
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

.success__list dt {
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

@media (prefers-reduced-motion: no-preference) {
  .success__heart {
    animation: heart-float 3.2s ease-in-out infinite alternate;
  }
}

@keyframes heart-float {
  to {
    transform: translateY(-6px);
  }
}
</style>
