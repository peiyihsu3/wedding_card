<script setup>
import CrayonFrame from './CrayonFrame.vue'
import { circle, sketch } from '../utils/sketch.js'

/*
 * 單選選項：跟快捷按鈕同一套蠟筆框（白底、深色框線），前面一個手繪圓圈。
 * 表單裡不墊黃色厚邊，選到的那個框內換成淡淡的主色（--accent-soft）；圓圈塗滿主色（--accent）、打一個白勾。
 * 外層的 fieldset、legend 與錯誤訊息留給表單自己放
 */
const props = defineProps({
  options: { type: Array, required: true }, // [{ value, label }]
  name: { type: String, required: true },
  // 蠟筆框的種子，每個選項各加 i，並排的歪法才不會一模一樣
  seed: { type: Number, default: 1 },
  invalid: { type: Boolean, default: false },
})

const model = defineModel({ type: String, required: true })

const rings = props.options.map((_, i) =>
  sketch(circle(12, 12, 9), { step: 2, amp: 0.7, wavelength: 16, seed: props.seed * 10 + i }),
)
</script>

<template>
  <div class="choices">
    <label v-for="(opt, i) in options" :key="opt.value" class="choice" :class="{ 'is-invalid': invalid }">
      <CrayonFrame :seed="seed + i" :radius="14" />
      <input v-model="model" class="choice__input" type="radio" :name="name" :value="opt.value" />
      <svg class="choice__mark" viewBox="0 0 24 24" aria-hidden="true">
        <path class="choice__ring" :d="rings[i]" />
        <path class="choice__check" d="M7 12.4C8.3 13.4 9.4 14.6 10.4 16C12.2 12.8 14.2 10.4 17 8.2" pathLength="1" />
      </svg>
      <span>{{ opt.label }}</span>
    </label>
  </div>
</template>

<style scoped>
.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.choice {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--control-height);
  padding: 0 16px;
  /* 讓鍵盤聚焦的外框跟著圓角 */
  border-radius: 14px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 0.2s;
}

/* 選到的維持淡綠，滑過也不換成黃色（這條的權重比下面的 :hover 高） */
.choice:has(.choice__input:checked) {
  --crayon-face: var(--accent-soft);
  color: var(--accent-deep);
  font-weight: 700;
}

.choice.is-invalid {
  --crayon-ink: var(--danger);
}

.choice:has(.choice__input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

/* 跟快捷按鈕一樣，滑過時框內換成淡淡的黃色 */
@media (hover: hover) {
  .choice:hover {
    --crayon-face: #fff8de;
  }
}

/* 真正的 radio 透明蓋在整個選項上，點哪裡都選得到 */
.choice__input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.choice__mark {
  flex: none;
  width: 22px;
  height: 22px;
  overflow: visible;
}

/* 圓圈跟外面的蠟筆框一樣粗 */
.choice__ring {
  fill: #fff;
  stroke: #2b2523;
  stroke-width: var(--crayon-stroke, 2.2);
  stroke-linejoin: round;
  transition: fill 0.2s;
}

/* 勾平常藏起來，選到時從左下往右上畫出來 */
.choice__check {
  fill: none;
  stroke: #fff;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 0.25s ease 0.05s;
}

.choice__input:checked + .choice__mark .choice__ring {
  fill: var(--accent);
}

.choice__input:checked + .choice__mark .choice__check {
  stroke-dashoffset: 0;
}
</style>
