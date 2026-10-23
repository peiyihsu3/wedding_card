<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import ChoiceGroup from './ChoiceGroup.vue'
import NumberStepper from './NumberStepper.vue'
import PostcardFrame from './PostcardFrame.vue'
import CrayonFrame from './CrayonFrame.vue'
import { maxGuests, wedding } from '../config.js'
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
  <!--
    表單寫在一張明信片上，區塊標題寫在明信片外面的左上方、直接寫在海上；
    輸入框、選項、送出按鈕都跟快捷按鈕同一套蠟筆框
  -->
  <form class="rsvp" novalidate @submit.prevent="onSubmit">
    <h2 class="rsvp__title">婚宴出席回覆</h2>
    <PostcardFrame :seed="70">
      <!-- <p class="rsvp__deadline">請於 {{ wedding.rsvpDeadline }} 前回覆</p> -->

      <div class="row row--2">
        <div id="field-name" class="field">
          <label class="field__label" for="name">姓名</label>
          <div class="input-frame" :class="{ 'is-invalid': errorOf('name') }">
            <CrayonFrame :seed="40" :radius="14" />
            <input
              id="name"
              v-model="form.name"
              class="input"
              type="text"
              autocomplete="name"
              placeholder="王小明"
              :aria-invalid="Boolean(errorOf('name'))"
              aria-describedby="name-error"
              @blur="touched.name = true"
            />
          </div>
          <p v-if="errorOf('name')" id="name-error" class="field__error">{{ errorOf('name') }}</p>
        </div>

        <div id="field-phone" class="field">
          <label class="field__label" for="phone">手機</label>
          <div class="input-frame" :class="{ 'is-invalid': errorOf('phone') }">
            <CrayonFrame :seed="41" :radius="14" />
            <input
              id="phone"
              v-model="form.phone"
              class="input"
              type="tel"
              inputmode="numeric"
              autocomplete="tel"
              maxlength="12"
              placeholder="0912345678"
              :aria-invalid="Boolean(errorOf('phone'))"
              aria-describedby="phone-error"
              @blur="touched.phone = true"
            />
          </div>
          <p v-if="errorOf('phone')" id="phone-error" class="field__error">{{ errorOf('phone') }}</p>
        </div>
      </div>

      <fieldset id="field-side" class="field">
        <legend class="field__label">您是</legend>
        <ChoiceGroup
          v-model="form.side"
          name="side"
          :options="sideOptions"
          :seed="30"
          :invalid="Boolean(errorOf('side'))"
        />
        <p v-if="errorOf('side')" class="field__error">{{ errorOf('side') }}</p>
      </fieldset>

      <fieldset id="field-attending" class="field">
        <legend class="field__label">是否出席</legend>
        <ChoiceGroup
          v-model="form.attending"
          name="attending"
          :options="attendingOptions"
          :seed="32"
          :invalid="Boolean(errorOf('attending'))"
        />
        <p v-if="errorOf('attending')" class="field__error">{{ errorOf('attending') }}</p>
      </fieldset>

      <Transition name="reveal">
        <div v-if="isAttending" class="rsvp__attending">
          <div class="row row--3">
            <div class="field">
              <span id="guests-label" class="field__label">出席人數（含本人）</span>
              <NumberStepper v-model="form.guests" :min="1" :max="maxGuests" labelledby="guests-label" :seed="43" />
            </div>
            <div class="field">
              <span id="vegetarian-label" class="field__label">素食人數</span>
              <NumberStepper
                v-model="form.vegetarian"
                :min="0"
                :max="form.guests"
                labelledby="vegetarian-label"
                :seed="44"
              />
            </div>
            <div class="field">
              <span id="child-seats-label" class="field__label">兒童椅</span>
              <NumberStepper
                v-model="form.childSeats"
                :min="0"
                :max="form.guests"
                labelledby="child-seats-label"
                :seed="45"
              />
            </div>
          </div>

          <fieldset class="field">
            <legend class="field__label">是否有飲食禁忌或過敏</legend>
            <ChoiceGroup v-model="form.hasDietary" name="hasDietary" :options="dietaryOptions" :seed="34" />
            <Transition name="reveal">
              <div v-if="hasDietary" id="field-dietaryNote" class="rsvp__dietary-note">
                <div class="input-frame" :class="{ 'is-invalid': errorOf('dietaryNote') }">
                  <CrayonFrame :seed="42" :radius="14" />
                  <input
                    id="dietaryNote"
                    v-model="form.dietaryNote"
                    class="input"
                    type="text"
                    maxlength="100"
                    placeholder="例如：不吃牛、海鮮過敏"
                    aria-label="飲食禁忌或過敏的內容"
                    :aria-invalid="Boolean(errorOf('dietaryNote'))"
                    aria-describedby="dietaryNote-error"
                    @blur="touched.dietaryNote = true"
                  />
                </div>
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

      <button type="submit" class="rsvp__submit" :disabled="submitting">
        <CrayonFrame :seed="46" :radius="14" />
        {{ submitting ? '送出中…' : '送出' }}
      </button>

      <p v-if="isMockMode" class="rsvp__mock">模擬模式：尚未設定 VITE_GAS_URL，送出不會寫入試算表</p>
    </PostcardFrame>
  </form>
</template>

<style scoped>
/*
 * 標題寫在明信片外面的正上方、置中，白字直接壓在海上（藍底上白字最清楚）。
 * 粉圓只有一種字重，700 會被瀏覽器硬加粗、筆畫糊在一起，用原本的字重，也不描邊加粗；
 * 不套手繪抖動濾鏡，字小、抖起來像歪掉。字距會在最後一個字後面多留一段，左邊補回同樣的寬度才會真的置中
 */
.rsvp__title {
  margin: 0 0 16px;
  padding-left: 0.12em;
  color: #fff;
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-align: center;
}

.rsvp__subtitle {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-align: center;
}

.rsvp__deadline {
  width: fit-content;
  margin: 16px auto 28px;
  padding: 6px 16px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 14px;
}

.row {
  display: grid;
  gap: 0 16px;
}

/* 欄位（輸入框、選項、人數）的框排滿整張明信片，線比快捷按鈕細一點才不會太重；送出按鈕不在欄位裡，維持原本的粗細 */
.field {
  margin: 0 0 32px;
  padding: 0;
  border: 0;
  min-width: 0;
  --crayon-stroke: 1.6;
}

.field__label {
  display: block;
  margin-bottom: 10px;
  padding: 0;
  color: var(--text);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.08em;
}

.field__error {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: 14px;
}

/* 輸入框跟選項同一套蠟筆框，表單裡不墊黃色厚邊；填錯時線改成紅色 */
.input-frame {
  position: relative;
  isolation: isolate;
}

.input-frame.is-invalid {
  --crayon-ink: var(--danger);
}

.input {
  display: block;
  width: 100%;
  height: var(--control-height);
  padding: 0 18px;
  border: 0;
  background: transparent;
  font-size: 16px; /* 小於 16px 時 iOS 聚焦會自動放大 */
}

.input::placeholder {
  color: #b8aca4;
}

.input:focus {
  outline: none;
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

/*
 * 送出按鈕跟輸入框、選項同一套蠟筆框，只有框內塗黃色，跟白底的欄位分開，一眼看出要按哪裡；
 * 平常平平的，滑過時才墊起黃色厚邊、往上浮一點，黃色也淡一點；
 * 按下去收掉厚邊、往下沉，像把按鈕壓回厚邊的位置
 */
.rsvp__submit {
  position: relative;
  isolation: isolate;
  display: block;
  /* 不撐滿整排，置中一顆就好；手機上窄的時候才跟著縮 */
  width: min(100%, 200px);
  height: var(--control-height);
  margin: 8px auto 0;
  padding: 0 28px;
  border: 0;
  border-radius: 14px; /* 讓聚焦外框跟著圓角 */
  background: transparent;
  color: #2b2523;
  /* 整張表單最主要的動作，字比欄位標籤（18px）再大一點 */
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: transform 0.15s;
  --crayon-face: #ffd65a;
}

.rsvp__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (hover: hover) {
  .rsvp__submit:hover:not(:disabled) {
    transform: translateY(-3px);
    --crayon-face: #ffe38a;
    --crayon-shade: 1;
  }
}

/* 放在滑過之後，按下去時才蓋得過滑過的墊高 */
.rsvp__submit:active:not(:disabled) {
  transform: translateY(2px);
  --crayon-shade: 0;
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
    margin-bottom: 20px;
    font-size: 30px;
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
