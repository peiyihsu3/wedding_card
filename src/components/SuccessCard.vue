<script setup>
defineProps({
  // RsvpForm 送出的 payload
  data: { type: Object, required: true },
  updated: { type: Boolean, default: false },
})

defineEmits(['edit'])
</script>

<template>
  <section class="card success" aria-live="polite">
    <div class="success__icon" aria-hidden="true">♡</div>
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

    <dl class="success__summary">
      <div>
        <dt>您是</dt>
        <dd>{{ data.side }}親友・{{ data.relation }}</dd>
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
      </template>
    </dl>

    <button type="button" class="btn btn--outline" @click="$emit('edit')">修改回覆</button>
  </section>
</template>

<style scoped>
.success {
  text-align: center;
}

.success__icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--rose-gold-soft);
  color: var(--rose-gold);
  font-size: 30px;
}

.success__title {
  font-size: 24px;
  letter-spacing: 0.1em;
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
  background: var(--cream);
  font-size: 13px;
}

.success__summary {
  display: grid;
  gap: 10px;
  margin: 28px 0;
  padding: 20px;
  border-radius: var(--radius);
  background: var(--cream);
  text-align: left;
}

.success__summary div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.success__summary dt {
  color: var(--text-muted);
}

.success__summary dd {
  margin: 0;
  font-weight: 500;
  text-align: right;
}

@media (min-width: 768px) {
  .success__title {
    font-size: 28px;
  }
}
</style>
