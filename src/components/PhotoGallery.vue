<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { wedding } from '../config.js'
import { cutRect } from '../utils/sketch.js'
import CrayonFrame from './CrayonFrame.vue'
/*
 * assets/couple 是攝影師給的原檔（每張約 32MB），網頁用 couple-web 裡縮小的版本（長邊 2400px，`sips -Z 2400 -s formatOptions 82`）；
 * couple-web 裡的照片全部照檔名順序放進輪播，換照片只要換資料夾裡的檔案。
 * 第一張是 FIRST，後面照檔名接下去、繞回最前面，第一個指示點就是一開始看到的那張；左右兩側跟沒轉之前一樣是它前後的照片。
 * 橫的照片小卡照 3:4 裁掉左右，放大時才看得到整張。label 是替代文字，也是放大查看的說明
 */
const FIRST = '284.jpg'
const files = import.meta.glob('../assets/couple-web/*.jpg', { eager: true, import: 'default' })
const paths = Object.keys(files).sort()
const start = Math.max(0, paths.findIndex((path) => path.endsWith(`/${FIRST}`)))
const photos = [...paths.slice(start), ...paths.slice(0, start)].map((path, i, all) => ({
  key: path,
  photo: files[path],
  label: `${wedding.groom}與${wedding.bride}的婚紗照（${i + 1}/${all.length}）`,
}))

const mod = (k) => ((k % photos.length) + photos.length) % photos.length

/*
 * 中間一張、左右各一張縮小的，再外面各藏一張等著滑進來。
 * position 一直往上加或往下減、不回頭，每張卡片用它在這條無限長的帶子上的位置當 key：
 * 換張時同一張卡片只是換了 offset，CSS 就會把它從旁邊放大移到中間；照片少於五張時，同一張會在帶子上出現不只一次
 */
const position = ref(0)
const current = computed(() => mod(position.value))

/*
 * 照片不加框，邊緣剪得歪歪的，像用剪刀剪下來貼在紙上（cutRect）。
 * 剪法跟著卡片在帶子上的位置 k 走：換張時同一張照片的形狀不變；左右兩側同一張照片也剪得不一樣，像洗了兩張。
 * 照實際的像素大小剪（每張卡片一樣大，兩側的只是用 transform 縮小），量到了才剪，大小變了就重剪
 */
const stage = ref(null)
const size = ref(null)

const cut = (k, { width, height }) => `path('${cutRect(width, height, { seed: k * 7 + 101 })}')`

const cards = computed(() =>
  [-2, -1, 0, 1, 2].map((offset) => {
    const k = position.value + offset
    return { k, offset, index: mod(k), clip: size.value && cut(k, size.value), ...photos[mod(k)] }
  }),
)

function go(step) {
  position.value += step
}

// 點下方的指示點：往比較近的方向轉過去
function goTo(index) {
  let step = index - current.value
  if (step > photos.length / 2) step -= photos.length
  if (step < -photos.length / 2) step += photos.length
  go(step)
}

// 手機上左右滑也能換張；橫向位移夠大、且比直向大才算，不影響上下捲動
let touchStart = null

function onTouchStart(e) {
  const t = e.changedTouches[0]
  touchStart = { x: t.clientX, y: t.clientY }
}

function onTouchEnd(e) {
  if (!touchStart) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStart.x
  const dy = t.clientY - touchStart.y
  touchStart = null
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1)
}

// 點中間那張照片放大查看；內容先畫出來再開，焦點才會落在關閉按鈕上
const lightbox = ref(null)
const lightboxPhoto = ref(null)
const lightboxSize = ref(null)
const viewing = ref(null)

// 放大的照片高度跟著照片走，另外量、另外剪；用同一個 k 當種子
const lightboxClip = computed(() => viewing.value && lightboxSize.value && cut(viewing.value.k, lightboxSize.value))

// 大小沒變就沿用原本的物件，不要重剪；關起來時量到的是 0，也沿用上次的
function sizeOf(el, prev) {
  const { offsetWidth: width, offsetHeight: height } = el
  if (!width || !height || (width === prev?.width && height === prev?.height)) return prev
  return { width, height }
}

function measure() {
  size.value = sizeOf(stage.value.querySelector('.cutout__photo'), size.value)
  if (lightboxPhoto.value) lightboxSize.value = sizeOf(lightboxPhoto.value, lightboxSize.value)
}

// 照片區的大小跟著舞台變（寬度照舞台的寬或畫面的高、高度照 3:4），量舞台就夠了
let observer = null

onMounted(() => {
  observer = new ResizeObserver(measure)
  observer.observe(stage.value)
})

onBeforeUnmount(() => observer?.disconnect())

async function openLightbox(c) {
  viewing.value = c
  await nextTick()
  // 照片載入後才撐出高度，所以也要量
  observer.observe(lightboxPhoto.value)
  lightbox.value.showModal()
  // 開著時背後的頁面不跟著捲
  document.documentElement.style.overflow = 'hidden'
}

function closeLightbox() {
  lightbox.value.close()
}

// 按 Esc 關掉時也會觸發 close，統一在這裡還原頁面捲動
function onLightboxClose() {
  document.documentElement.style.overflow = ''
}
</script>

<template>
  <div class="carousel" role="region" aria-roledescription="carousel" aria-label="婚紗照">
    <div ref="stage" class="carousel__stage" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <!-- 兩側的縮圖點了也會換到中間 -->
      <figure
        v-for="c in cards"
        :key="c.k"
        class="cutout"
        :data-offset="c.offset"
        :aria-hidden="c.offset !== 0"
        @click="c.offset && go(c.offset)"
      >
        <!--
          3:4 的直式照片區，照片比這個比例長一點，上下裁掉一點填滿；
          藏在外側的卡片也在畫面內，loading="lazy" 會一起載入，換過來時不會閃白。
          中間那張的照片點了放大，兩側的點了交給外層換張，所以只有中間那張能用 Tab 選到。
          剪邊裁在裡面那層，按鈕的焦點框才不會一起被裁掉
        -->
        <button
          type="button"
          class="cutout__photo"
          :tabindex="c.offset === 0 ? 0 : -1"
          :aria-label="`放大查看${c.label}`"
          @click="!c.offset && openLightbox(c)"
        >
          <span class="cutout__clip" :style="{ clipPath: c.clip }">
            <img class="cutout__img" :src="c.photo" :alt="c.label" loading="lazy" decoding="async" />
          </span>
        </button>
      </figure>

      <button type="button" class="carousel__arrow carousel__arrow--prev" aria-label="上一張" @click="go(-1)">
        <CrayonFrame :seed="5" radius="50%" />
        <svg class="carousel__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <button type="button" class="carousel__arrow carousel__arrow--next" aria-label="下一張" @click="go(1)">
        <CrayonFrame :seed="8" radius="50%" />
        <svg class="carousel__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>

    <div class="carousel__dots">
      <button
        v-for="(p, i) in photos"
        :key="p.key"
        type="button"
        class="carousel__dot"
        :class="{ 'is-active': i === current }"
        :aria-label="`第 ${i + 1} 張`"
        :aria-current="i === current"
        @click="goTo(i)"
      />
    </div>

    <!--
      放大的照片：原生 dialog 疊在整頁最上層、按 Esc 關閉、焦點不會跑到背後的頁面；
      外觀跟小卡一樣是一張剪下來的照片，放大時不裁、照原本的比例整張顯示。
      內容撐滿整個 dialog，點到 dialog 本身就是點到外面的暗處
    -->
    <dialog
      ref="lightbox"
      class="lightbox"
      :aria-label="viewing?.label"
      @click.self="closeLightbox"
      @close="onLightboxClose"
    >
      <div v-if="viewing" class="lightbox__body">
        <div ref="lightboxPhoto" class="lightbox__photo" :style="{ clipPath: lightboxClip }">
          <img class="lightbox__img" :src="viewing.photo" :alt="viewing.label" />
        </div>
        <button type="button" class="lightbox__close" aria-label="關閉" @click="closeLightbox">
          <CrayonFrame :seed="11" radius="50%" />
          <svg class="carousel__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
/*
 * --card 中間那張的寬度、--side 兩側縮小的比例、--gap 卡片之間的空隙。
 * 卡片全部疊在同一格，舞台高度就是一張卡片的高度；兩側超出畫面的部分由 <main> 裁掉。
 * 照片是直的，婚紗那一區又剛好一個畫面高，所以寬度也受畫面高度限制：
 * 扣掉快捷按鈕（桌機在上方、平板以下在下方）、下方的指示點，上下再留一點空白（約 220px），剩下的高度換算成 3:4 的寬度；
 * 太矮的螢幕（橫拿的手機）至少留 160px 寬，放不下就讓區塊撐高
 */
.carousel {
  --ink: #2b2523;
  --screen-h: 100vh;
  --card: min(74%, max(160px, (var(--screen-h) - 220px) * 3 / 4));
  --side: 0.72;
  --gap: 16px;
  --arrow: 44px;
  --close: 36px;
}

/* 手機的網址列收合時 vh 會比看得到的高，支援的話改用 svh */
@supports (height: 100svh) {
  .carousel {
    --screen-h: 100svh;
  }
}

/* 往兩側吃掉區塊的內距，手機上中間那張的寬度照整個螢幕算 */
.carousel__stage {
  position: relative;
  display: grid;
  justify-items: center;
  margin: 0 -16px;
  touch-action: pan-y;
}

/*
 * 中間那張最大，兩側縮小、淡一點，和中間那張隔開一段空隙排在旁邊；換張時從現在的位置放大或縮小、變深或變淡移過去。
 * translateX 的百分比照卡片自己的寬度算：兩側卡片的中心距離 = 半張 + 空隙 + 縮小後的半張
 */
.cutout {
  position: relative;
  grid-area: 1 / 1;
  width: var(--card);
  margin: 0;
  transition:
    transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1),
    opacity 0.6s ease;
}

.cutout[data-offset='-1'],
.cutout[data-offset='1'] {
  opacity: 0.6;
  cursor: pointer;
}

.cutout[data-offset='-1'] {
  transform: translateX(calc(-50% - var(--side) * 50% - var(--gap))) scale(var(--side));
}

.cutout[data-offset='1'] {
  transform: translateX(calc(50% + var(--side) * 50% + var(--gap))) scale(var(--side));
}

.cutout[data-offset='-2'],
.cutout[data-offset='2'] {
  opacity: 0;
  pointer-events: none;
}

.cutout[data-offset='-2'] {
  transform: translateX(calc(-50% - var(--side) * 150% - var(--gap) * 2)) scale(var(--side));
}

.cutout[data-offset='2'] {
  transform: translateX(calc(50% + var(--side) * 150% + var(--gap) * 2)) scale(var(--side));
}

.cutout__photo {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  padding: 0;
  border: 0;
  background: none;
  cursor: inherit;
}

.cutout[data-offset='0'] .cutout__photo {
  cursor: zoom-in;
}

/* 剪邊算好之前先照方框裁 */
.cutout__clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--milk-tea);
}

.cutout__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 和置頂快捷按鈕同一套的蠟筆框，畫成圓的：白底、深色框線，滑過時框內換成淡淡的黃色 */
.carousel__arrow,
.lightbox__close {
  position: absolute;
  z-index: 1;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

/*
 * 貼在中間那張的左右兩側、壓在兩側縮圖上：內緣落在卡片空隙的正中間；
 * 螢幕太窄時停在離畫面邊緣 8px 的地方，不會被裁掉，會稍微壓到中間那張照片的邊
 */
.carousel__arrow {
  top: 50%;
  width: var(--arrow);
  height: var(--arrow);
  transition: scale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.carousel__arrow--prev {
  left: max(
    calc(50% - var(--card) / 2 - var(--gap) / 2 - var(--arrow) / 2),
    calc(50% - 50vw + var(--arrow) / 2 + 8px)
  );
  transform: translate(-50%, -50%);
}

.carousel__arrow--next {
  right: max(
    calc(50% - var(--card) / 2 - var(--gap) / 2 - var(--arrow) / 2),
    calc(50% - 50vw + var(--arrow) / 2 + 8px)
  );
  transform: translate(50%, -50%);
}

.lightbox__close {
  width: var(--close);
  height: var(--close);
}

/* 只在有滑鼠的裝置上才有滑過效果，手機點完才不會一直停在放大或黃色 */
@media (hover: hover) {
  .carousel__arrow:hover {
    --crayon-face: #fff8de;
    scale: 1.15;
  }

  .lightbox__close:hover {
    --crayon-face: #fff8de;
  }
}

/* 圖示另外給 class：按鈕裡還有蠟筆框的 svg，不能用 svg 選取 */
.carousel__arrow .carousel__icon {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lightbox__close .carousel__icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/*
 * 下方一排短線，目前這張拉長、換成這一區的主色（玫瑰金）；其他幾條是奶茶色。
 * 底下是奶油白的紙，黃色和半透明白都跟紙太接近看不清楚。按鈕本身比短線高，手指比較好點
 */
.carousel__dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
}

.carousel__dot {
  display: flex;
  align-items: center;
  width: 20px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition: width 0.4s ease;
}

.carousel__dot::before {
  content: '';
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: var(--milk-tea-deep);
  transition: background 0.4s ease;
}

.carousel__dot.is-active {
  width: 40px;
}

.carousel__dot.is-active::before {
  background: var(--accent);
}

/*
 * 放大視窗就是照片本身的大小：照原本的比例，寬最多約占螢幕八成（手機上 88%，關閉按鈕跨在右上角才不會超出螢幕）、
 * 高最多約八成，哪一邊先碰到就照那一邊縮小。橫的螢幕會被高度卡住，直的手機會被寬度卡住
 */
.lightbox {
  --lightbox-w: 88vw;
  width: fit-content;
  max-width: none;
  max-height: none;
  padding: 0;
  border: 0;
  background: none;
  overflow: visible;
}

.lightbox::backdrop {
  background: rgba(43, 37, 35, 0.75);
}

.lightbox[open] {
  animation: lightbox-in 0.35s cubic-bezier(0.22, 0.8, 0.3, 1);
}

.lightbox[open]::backdrop {
  animation: lightbox-fade 0.35s ease;
}

@keyframes lightbox-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
}

@keyframes lightbox-fade {
  from {
    opacity: 0;
  }
}

.lightbox__body {
  position: relative;
}

.lightbox__photo {
  background: var(--milk-tea);
}

/* 小卡上照片是撐滿固定比例的照片區，這裡反過來由照片撐出照片區的大小 */
.lightbox__img {
  display: block;
  max-width: var(--lightbox-w);
  max-height: 80vh;
  max-height: 80dvh;
}

.lightbox__close {
  top: 0;
  right: 0;
  transform: translate(40%, -40%);
}

@media (prefers-reduced-motion: reduce) {
  .cutout,
  .carousel__arrow,
  .carousel__dot,
  .carousel__dot::before {
    transition: none;
  }

  .lightbox[open],
  .lightbox[open]::backdrop {
    animation: none;
  }
}

@media (min-width: 768px) {
  .carousel {
    --card: min(66%, max(160px, (var(--screen-h) - 220px) * 3 / 4));
    --gap: 56px;
    --arrow: 64px;
    --close: 48px;
  }

  .carousel__stage {
    margin: 0 -24px;
  }

  .carousel__arrow .carousel__icon {
    width: 30px;
    height: 30px;
  }

  .lightbox__close .carousel__icon {
    width: 24px;
    height: 24px;
  }

  .carousel__dots {
    margin-top: 24px;
  }

  .lightbox {
    --lightbox-w: 80vw;
  }
}
</style>
