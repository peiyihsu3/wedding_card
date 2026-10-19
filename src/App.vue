<script setup>
import { nextTick, ref } from 'vue'
import WeddingHero from './components/WeddingHero.vue'
import RsvpForm from './components/RsvpForm.vue'
import SuccessCard from './components/SuccessCard.vue'

const formArea = ref(null)
const result = ref(null) // { payload, updated }
const lastForm = ref(null) // 「修改回覆」時預填

async function scrollToFormArea() {
  await nextTick()
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  formArea.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

function onSubmitted({ form, payload, updated }) {
  lastForm.value = form
  result.value = { payload, updated }
  scrollToFormArea()
}

function onEdit() {
  result.value = null
  scrollToFormArea()
}
</script>

<template>
  <div class="layout">
    <WeddingHero class="layout__hero" />
    <main ref="formArea" class="layout__form">
      <Transition name="fade" mode="out-in">
        <SuccessCard v-if="result" :data="result.payload" :updated="result.updated" @edit="onEdit" />
        <RsvpForm v-else :initial="lastForm" @submitted="onSubmitted" />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.layout__form {
  scroll-margin-top: 16px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
