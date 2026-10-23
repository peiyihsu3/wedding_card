<script setup>
import { nextTick, onMounted, ref } from 'vue'
import PaintDefs from './components/PaintDefs.vue'
import OpeningScene from './components/OpeningScene.vue'
import SiteNav from './components/SiteNav.vue'
import JourneyBackdrop from './components/JourneyBackdrop.vue'
import ScenicSection from './components/ScenicSection.vue'
import WeddingHero from './components/WeddingHero.vue'
import CalendarFrame from './components/CalendarFrame.vue'
import InvitationNote from './components/InvitationNote.vue'
import PhotoGallery from './components/PhotoGallery.vue'
import PaperCuts from './components/PaperCuts.vue'
import TrafficInfo from './components/TrafficInfo.vue'
import RsvpForm from './components/RsvpForm.vue'
import SuccessCard from './components/SuccessCard.vue'

// 快捷按鈕的項目，id 要和下方 <section> 的 id 一致；手機上四顆要排成一列，
// 「交通與停車」五個字在寬度 320 的手機已經剛好排滿，其他按鈕別再加字
const sections = [
  { id: 'gallery', label: '寫真', icon: 'camera' },
  { id: 'info', label: '喜帖', icon: 'calendar' },
  { id: 'rsvp', label: '出席回覆', icon: 'mail' },
  { id: 'traffic', label: '交通與停車', icon: 'pin' },
]

// 首屏預設用程式畫的山海雲；網址加 ?painted 可切回原本的插畫比較，決定後刪掉這行與另一個版本
const drawnCover = !new URLSearchParams(location.search).has('painted')
// 首屏畫布裡一格顆粒圖樣的大小，首屏量好畫布後回報（見 PaintDefs）
const coverGrain = ref(160)

const result = ref(null) // { payload, updated }
const lastForm = ref(null) // 「修改回覆」時預填

async function scrollToFormArea() {
  await nextTick()
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('rsvp')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
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

// 分享 #rsvp、#traffic 這類連結時，畫面渲染完再對準一次，確保會直接跳到該區塊
onMounted(() => {
  document.getElementById(location.hash.slice(1))?.scrollIntoView()
})
</script>

<template>
  <!-- 全站共用的漸層、顆粒與手繪濾鏡 -->
  <PaintDefs :cover-grain="coverGrain" />
  <OpeningScene :drawn="drawnCover" @grain-tile="coverGrain = $event" />
  <SiteNav :sections="sections" />
  <!--
    往下捲是一整片連續的風景，交界的雲之後是夕陽的天空（婚紗），
    接著一路是海（資訊、回覆），最後上岸，櫻花林越往下越密（交通）
  -->
  <main class="journey-main">
    <JourneyBackdrop />
    <ScenicSection id="gallery" scene="sky">
      <PhotoGallery />
      <PaperCuts />
    </ScenicSection>

    <ScenicSection id="info" scene="sea">
      <CalendarFrame :seed="50">
        <WeddingHero />
        <template #next>
          <InvitationNote />
        </template>
      </CalendarFrame>
    </ScenicSection>

    <ScenicSection id="rsvp" scene="island">
      <Transition name="fade" mode="out-in">
        <SuccessCard v-if="result" :data="result.payload" :updated="result.updated" @edit="onEdit" />
        <RsvpForm v-else :initial="lastForm" @submitted="onSubmitted" />
      </Transition>
    </ScenicSection>

    <ScenicSection id="traffic" scene="sakura">
      <TrafficInfo />
    </ScenicSection>
  </main>
</template>

<style scoped>
/*
 * 風景（JourneyBackdrop）照 <main> 定位。
 * 婚紗輪播兩側的縮圖會超出內容欄、一路排到畫面外，左右超出的部分裁掉，頁面才不會左右捲
 */
.journey-main {
  position: relative;
  overflow-x: clip;
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
