<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import NumberStepper from './NumberStepper.vue'
import { maxGuests } from '../config.js'
import { isMockMode, submitRsvp } from '../api/rsvp.js'

const props = defineProps({
  // 「修改回覆」時帶入上一次填寫的內容
  initial: { type: Object, default: null },
})

const emit = defineEmits(['submitted'])

const sideOptions = [
  { value: '男方', label: '男方親友' },
  { value: '女方', label: '女方親友' },
]

const attendingOptions = [
  { value: 'yes', label: '會出席' },
  { value: 'no', label: '無法出席' },
]

const dietaryOptions = [
  { value: 'no', label: '沒有' },
  { value: 'yes', label: '有' },
]

// 錯誤時依此順序找第一個要捲動到的欄位
const FIELD_ORDER = ['name', 'phone', 'side', 'attending', 'dietaryNote']
const PHONE_RE = /^09\d{8}$/

const form = reactive({
  name: '',
  phone: '',
  side: '',
  attending: '',
  guests: 1,
  vegetarian: 0,
  childSeats: 0,
  hasDietary: 'no',
  dietaryNote: '',
  website: '', // honeypot，真人看不到
  ...props.initial,
})

const touched = reactive({})
const submitAttempted = ref(false)
const submitting = ref(false)
const submitError = ref('')

const normalizedPhone = computed(() => form.phone.replace(/[\s-]/g, ''))
const isAttending = computed(() => form.attending === 'yes')
const hasDietary = computed(() => isAttending.value && form.hasDietary === 'yes')

const errors = computed(() => {
  const e = {}
  if (!form.name.trim()) e.name = '請填寫姓名'
  if (!normalizedPhone.value) e.phone = '請填寫手機號碼'
  else if (!PHONE_RE.test(normalizedPhone.value)) e.phone = '手機號碼為 09 開頭共 10 碼'
  if (!form.side) e.side = '請選擇男方或女方親友'
  if (!form.attending) e.attending = '請選擇是否出席'
  if (hasDietary.value && !form.dietaryNote.trim()) e.dietaryNote = '請填寫飲食禁忌或過敏的內容'
  return e
})

function errorOf(field) {
  return submitAttempted.value || touched[field] ? errors.value[field] : ''
}

// 出席人數調低時，素食與兒童椅不能超過出席人數
watch(
  () => form.guests,
  (guests) => {
    if (form.vegetarian > guests) form.vegetarian = guests
    if (form.childSeats > guests) form.childSeats = guests
  },
)

async function focusFirstError() {
  const field = FIELD_ORDER.find((f) => errors.value[f])
  if (!field) return
  await nextTick()
  const el = document.getElementById(`field-${field}`)
  if (!el) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
  el.querySelector('input, select')?.focus({ preventScroll: true })
}

async function onSubmit() {
  submitAttempted.value = true
  submitError.value = ''

  if (Object.keys(errors.value).length) {
    focusFirstError()
    return
  }

  const attending = isAttending.value
  const payload = {
    name: form.name.trim(),
    phone: normalizedPhone.value,
    side: form.side,
    attending,
    guests: attending ? form.guests : 0,
    vegetarian: attending ? form.vegetarian : 0,
    childSeats: attending ? form.childSeats : 0,
    dietary: hasDietary.value ? form.dietaryNote.trim() : '',
    website: form.website,
  }

  submitting.value = true
  try {
    const result = await submitRsvp(payload)
    emit('submitted', { form: { ...form }, payload, updated: Boolean(result.updated) })
  } catch (err) {
    submitError.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="card rsvp" novalidate @submit.prevent="onSubmit">
    <h2 class="rsvp__title">出席回覆</h2>
    <p class="rsvp__subtitle">請協助填寫以下資訊，方便我們安排座位</p>

    <div class="row row--2">
      <div id="field-name" class="field">
        <label class="field__label" for="name">姓名 <span class="req">*</span></label>
        <input
          id="name"
          v-model="form.name"
          class="input"
          :class="{ 'is-invalid': errorOf('name') }"
          type="text"
          autocomplete="name"
          placeholder="王小明"
          :aria-invalid="Boolean(errorOf('name'))"
          aria-describedby="name-error"
          @blur="touched.name = true"
        />
        <p v-if="errorOf('name')" id="name-error" class="field__error">{{ errorOf('name') }}</p>
      </div>

      <div id="field-phone" class="field">
        <label class="field__label" for="phone">手機 <span class="req">*</span></label>
        <input
          id="phone"
          v-model="form.phone"
          class="input"
          :class="{ 'is-invalid': errorOf('phone') }"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          maxlength="12"
          placeholder="0912345678"
          :aria-invalid="Boolean(errorOf('phone'))"
          aria-describedby="phone-error"
          @blur="touched.phone = true"
        />
        <p v-if="errorOf('phone')" id="phone-error" class="field__error">{{ errorOf('phone') }}</p>
      </div>
    </div>

    <fieldset id="field-side" class="field">
      <legend class="field__label">您是 <span class="req">*</span></legend>
      <div class="pills">
        <label v-for="opt in sideOptions" :key="opt.value" class="pill">
          <input v-model="form.side" type="radio" name="side" :value="opt.value" />
          <span>{{ opt.label }}</span>
        </label>
      </div>
      <p v-if="errorOf('side')" class="field__error">{{ errorOf('side') }}</p>
    </fieldset>

    <fieldset id="field-attending" class="field">
      <legend class="field__label">是否出席 <span class="req">*</span></legend>
      <div class="pills">
        <label v-for="opt in attendingOptions" :key="opt.value" class="pill">
          <input v-model="form.attending" type="radio" name="attending" :value="opt.value" />
          <span>{{ opt.label }}</span>
        </label>
      </div>
      <p v-if="errorOf('attending')" class="field__error">{{ errorOf('attending') }}</p>
    </fieldset>

    <Transition name="reveal">
      <div v-if="isAttending" class="rsvp__attending">
        <div class="row row--3">
          <div class="field">
            <span id="guests-label" class="field__label">出席人數（含本人）</span>
            <NumberStepper v-model="form.guests" :min="1" :max="maxGuests" labelledby="guests-label" />
          </div>
          <div class="field">
            <span id="vegetarian-label" class="field__label">素食人數</span>
            <NumberStepper
              v-model="form.vegetarian"
              :min="0"
              :max="form.guests"
              labelledby="vegetarian-label"
            />
          </div>
          <div class="field">
            <span id="child-seats-label" class="field__label">兒童椅</span>
            <NumberStepper
              v-model="form.childSeats"
              :min="0"
              :max="form.guests"
              labelledby="child-seats-label"
            />
          </div>
        </div>

        <fieldset class="field">
          <legend class="field__label">是否有飲食禁忌或過敏</legend>
          <div class="pills">
            <label v-for="opt in dietaryOptions" :key="opt.value" class="pill">
              <input v-model="form.hasDietary" type="radio" name="hasDietary" :value="opt.value" />
              <span>{{ opt.label }}</span>
            </label>
          </div>
          <Transition name="reveal">
            <div v-if="hasDietary" id="field-dietaryNote" class="rsvp__dietary-note">
              <input
                id="dietaryNote"
                v-model="form.dietaryNote"
                class="input"
                :class="{ 'is-invalid': errorOf('dietaryNote') }"
                type="text"
                maxlength="100"
                placeholder="例如：不吃牛、海鮮過敏"
                aria-label="飲食禁忌或過敏的內容"
                :aria-invalid="Boolean(errorOf('dietaryNote'))"
                aria-describedby="dietaryNote-error"
                @blur="touched.dietaryNote = true"
              />
              <p v-if="errorOf('dietaryNote')" id="dietaryNote-error" class="field__error">
                {{ errorOf('dietaryNote') }}
              </p>
            </div>
          </Transition>
        </fieldset>
      </div>
    </Transition>

    <div class="hp" aria-hidden="true">
      <label>網站 <input v-model="form.website" type="text" tabindex="-1" autocomplete="off" /></label>
    </div>

    <p v-if="submitError" class="rsvp__submit-error" role="alert">{{ submitError }}</p>

    <button type="submit" class="btn btn--block rsvp__submit" :disabled="submitting">
      {{ submitting ? '送出中…' : '送出回覆' }}
    </button>

    <p v-if="isMockMode" class="rsvp__mock">模擬模式：尚未設定 VITE_GAS_URL，送出不會寫入試算表</p>
  </form>
</template>

<style scoped>
.rsvp__title {
  font-size: 24px;
  text-align: center;
  letter-spacing: 0.1em;
}

.rsvp__subtitle {
  margin: 8px 0 28px;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

.row {
  display: grid;
  gap: 0 16px;
}

.field {
  margin: 0 0 20px;
  padding: 0;
  border: 0;
  min-width: 0;
}

.field__label {
  display: block;
  margin-bottom: 8px;
  padding: 0;
  font-weight: 500;
  font-size: 15px;
}

.req {
  color: var(--rose-gold);
}

.field__error {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: 14px;
}

.input {
  display: block;
  width: 100%;
  height: var(--control-height);
  padding: 0 16px;
  border: 1px solid var(--milk-tea-deep);
  border-radius: 10px;
  background: #fff;
  font-size: 16px; /* 小於 16px 時 iOS 聚焦會自動放大 */
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input::placeholder {
  color: #b8aca4;
}

.input:focus {
  outline: none;
  border-color: var(--rose-gold);
  box-shadow: 0 0 0 3px var(--rose-gold-soft);
}

.input.is-invalid {
  border-color: var(--danger);
}

/* 膠囊式單選按鈕 */
.pills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pill {
  position: relative;
  cursor: pointer;
}

.pill input {
  position: absolute;
  opacity: 0;
  inset: 0;
  margin: 0;
  cursor: pointer;
}

.pill span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--control-height);
  padding: 0 12px;
  border: 1px solid var(--milk-tea-deep);
  border-radius: 999px;
  background: #fff;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

@media (hover: hover) {
  .pill:hover span {
    border-color: var(--rose-gold);
  }
}

.pill input:checked + span {
  border-color: var(--rose-gold);
  background: var(--rose-gold);
  color: #fff;
}

.pill input:focus-visible + span {
  outline: 2px solid var(--rose-gold);
  outline-offset: 2px;
}

.rsvp__attending {
  padding: 20px 16px 0;
  margin-bottom: 20px;
  border-radius: var(--radius);
  background: var(--cream);
}

.rsvp__dietary-note {
  margin-top: 12px;
}

.reveal-enter-active,
.reveal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.reveal-enter-from,
.reveal-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.rsvp__submit {
  margin-top: 8px;
}

.rsvp__submit-error {
  margin: 0 0 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #fbeceb;
  color: var(--danger);
  font-size: 14px;
}

.rsvp__mock {
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}

@media (min-width: 768px) {
  .rsvp__title {
    font-size: 28px;
  }

  .row--2 {
    grid-template-columns: 1fr 1fr;
  }

  .row--3 {
    grid-template-columns: repeat(3, 1fr);
    align-items: end;
  }
}
</style>
