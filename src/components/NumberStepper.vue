<script setup>
import CrayonFrame from './CrayonFrame.vue'

const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 10 },
  labelledby: { type: String, default: '' },
  // 蠟筆框的種子，並排的幾個歪法才不會一模一樣
  seed: { type: Number, default: 1 },
})

const model = defineModel({ type: Number, required: true })

function step(delta) {
  const next = model.value + delta
  if (next >= props.min && next <= props.max) model.value = next
}
</script>

<template>
  <!-- 跟選項同一套蠟筆框 -->
  <div class="stepper" role="group" :aria-labelledby="labelledby">
    <CrayonFrame :seed="seed" :radius="14" />
    <button
      type="button"
      class="stepper__btn"
      aria-label="減少"
      :disabled="model <= min"
      @click="step(-1)"
    >
      −
    </button>
    <output class="stepper__value" aria-live="polite">{{ model }}</output>
    <button
      type="button"
      class="stepper__btn"
      aria-label="增加"
      :disabled="model >= max"
      @click="step(1)"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.stepper {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  height: var(--control-height);
  padding: 0 6px;
}

/* 框的邊緣是抖過的線，按下時的底色只墊一個圓，才不會碰到框線 */
.stepper__btn {
  flex: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--accent);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
}

@media (hover: hover) {
  .stepper__btn:hover:not(:disabled) {
    background: var(--accent-soft);
  }
}

.stepper__btn:active:not(:disabled) {
  background: var(--accent-soft);
}

.stepper__btn:disabled {
  color: var(--milk-tea-deep);
  cursor: not-allowed;
}

.stepper__value {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
}
</style>
