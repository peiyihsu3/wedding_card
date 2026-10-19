<script setup>
const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 10 },
  labelledby: { type: String, default: '' },
})

const model = defineModel({ type: Number, required: true })

function step(delta) {
  const next = model.value + delta
  if (next >= props.min && next <= props.max) model.value = next
}
</script>

<template>
  <div class="stepper" role="group" :aria-labelledby="labelledby">
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
  display: flex;
  align-items: center;
  height: var(--control-height);
  border: 1px solid var(--milk-tea-deep);
  border-radius: 999px;
  background: #fff;
  overflow: hidden;
}

.stepper__btn {
  flex: 0 0 48px;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--rose-gold);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
}

@media (hover: hover) {
  .stepper__btn:hover:not(:disabled) {
    background: var(--rose-gold-soft);
  }
}

.stepper__btn:active:not(:disabled) {
  background: var(--rose-gold-soft);
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
