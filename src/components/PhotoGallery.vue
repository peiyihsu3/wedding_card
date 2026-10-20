<script setup>
import { computed, ref } from 'vue'
import { wedding } from '../config.js'
// 原檔 boy.jpg / girl.jpg 各約 32MB，網頁改用縮成 800×1200 的版本；photo 留空時顯示預留框
import groomPhoto from '../assets/boy-web.jpg'
import bridePhoto from '../assets/girl-web.jpg'

const people = [
  { key: 'groom', role: '新郎', name: wedding.groom, photo: groomPhoto },
  { key: 'bride', role: '新娘', name: wedding.bride, photo: bridePhoto },
]

const mod = (k) => ((k % people.length) + people.length) % people.length

/*
 * 中間一張、左右各一張縮小的，再外面各藏一張等著滑進來。
 * position 一直往上加或往下減、不回頭，每張卡片用它在這條無限長的帶子上的位置當 key：
 * 換張時同一張卡片只是換了 offset，CSS 就會把它從旁邊放大移到中間；照片只有兩張時，左右兩側會是同一張
 */
const position = ref(0)
const current = computed(() => mod(position.value))

const cards = computed(() =>
  [-2, -1, 0, 1, 2].map((offset) => {
    const k = position.value + offset
    return { k, offset, index: mod(k), ...people[mod(k)] }
  }),
)

function go(step) {
  position.value += step
}

// 點下方的指示點：往比較近的方向轉過去
function goTo(index) {
  let step = index - current.value
  if (step > people.length / 2) step -= people.length
  if (step < -people.length / 2) step += people.length
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
</script>

<template>
  <h2 class="section__title">
    <span class="section__title-en">GALLERY</span>
    <span class="section__title-zh">婚紗照</span>
  </h2>
  <div class="carousel" role="region" aria-roledescription="carousel" aria-label="婚紗照">
    <!-- 拍立得的手繪框線：和置頂快捷按鈕一樣先抖歪再磨毛，像蠟筆畫的；每張照片的種子不同，歪法才不會一樣 -->
    <svg class="carousel__defs" aria-hidden="true">
      <filter v-for="(p, i) in people" :id="`polaroid-sketch-${i}`" :key="p.key" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" :seed="i * 7 + 11" result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" scale="5" xChannelSelector="R" yChannelSelector="G" result="drawn" />
        <feTurbulence type="fractalNoise" baseFrequency="0.7" :seed="i * 7 + 13" result="grain" />
        <feDisplacementMap in="drawn" in2="grain" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>

    <div class="carousel__stage" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <!-- 兩側的縮圖點了也會換到中間 -->
      <figure
        v-for="c in cards"
        :key="c.k"
        class="polaroid"
        :data-offset="c.offset"
        :aria-hidden="c.offset !== 0"
        @click="c.offset && go(c.offset)"
      >
        <svg class="polaroid__frame" aria-hidden="true">
          <rect width="100%" height="100%" rx="6" :filter="`url(#polaroid-sketch-${c.index})`" />
        </svg>

        <!--
          16:9 的照片區。照片是直的，整張置中不裁切，兩側用同一張照片放大模糊補滿；
          藏在外側的卡片也在畫面內，loading="lazy" 會一起載入，換過來時不會閃白
        -->
        <div class="polaroid__photo">
          <template v-if="c.photo">
            <img class="polaroid__blur" :src="c.photo" alt="" loading="lazy" decoding="async" />
            <img class="polaroid__img" :src="c.photo" :alt="`${c.role} ${c.name}`" loading="lazy" decoding="async" />
          </template>
          <span v-else class="polaroid__todo">{{ c.role }}照片</span>
        </div>

        <!-- 相紙下緣比較寬，像在拍立得底下寫字；照片的 alt 已經念過，報讀時略過 -->
        <figcaption class="polaroid__caption" aria-hidden="true">
          {{ c.role }}<span class="polaroid__name">{{ c.name }}</span>
        </figcaption>
      </figure>

      <button type="button" class="carousel__arrow carousel__arrow--prev" aria-label="上一張" @click="go(-1)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <button type="button" class="carousel__arrow carousel__arrow--next" aria-label="下一張" @click="go(1)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>

    <div class="carousel__dots">
      <button
        v-for="(p, i) in people"
        :key="p.key"
        type="button"
        class="carousel__dot"
        :class="{ 'is-active': i === current }"
        :aria-label="`第 ${i + 1} 張，${p.role}`"
        :aria-current="i === current"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>

<style scoped>
/*
 * --card 中間那張的寬度、--side 兩側縮小的比例、--gap 卡片之間的空隙。
 * 卡片全部疊在同一格，舞台高度就是一張卡片的高度；兩側超出內容欄的部分由 <main> 裁掉
 */
.carousel {
  --ink: #2b2523;
  --card: 74%;
  --side: 0.72;
  --gap: 12px;
  --arrow: 36px;
  --photo-shift: 18px;
}

.carousel__defs {
  position: absolute;
  width: 0;
  height: 0;
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
 * 中間那張最大，兩側縮小、和中間那張隔開一段空隙排在旁邊；換張時從現在的位置放大或縮小移過去。
 * translateX 的百分比照卡片自己的寬度算：兩側卡片的中心距離 = 半張 + 空隙 + 縮小後的半張
 */
.polaroid {
  position: relative;
  grid-area: 1 / 1;
  isolation: isolate;
  width: var(--card);
  margin: 0;
  padding: 12px 12px 0;
  transition:
    transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1),
    opacity 0.6s ease;
}

.polaroid[data-offset='-1'],
.polaroid[data-offset='1'] {
  cursor: pointer;
}

.polaroid[data-offset='-1'] {
  transform: translateX(calc(-50% - var(--side) * 50% - var(--gap))) scale(var(--side));
}

.polaroid[data-offset='1'] {
  transform: translateX(calc(50% + var(--side) * 50% + var(--gap))) scale(var(--side));
}

.polaroid[data-offset='-2'],
.polaroid[data-offset='2'] {
  opacity: 0;
  pointer-events: none;
}

.polaroid[data-offset='-2'] {
  transform: translateX(calc(-50% - var(--side) * 150% - var(--gap) * 2)) scale(var(--side));
}

.polaroid[data-offset='2'] {
  transform: translateX(calc(50% + var(--side) * 150% + var(--gap) * 2)) scale(var(--side));
}

/* 外框比相紙內縮 1px，線條有一半畫在框外，大致貼齊相紙邊緣 */
.polaroid__frame {
  position: absolute;
  top: 1px;
  left: 1px;
  z-index: -1;
  width: calc(100% - 2px);
  height: calc(100% - 2px);
  overflow: visible;
  fill: #fff;
  stroke: var(--ink);
  stroke-width: 2.5;
}

.polaroid__photo {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--milk-tea);
}

.polaroid__blur,
.polaroid__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/*
 * 放大一點，模糊後的邊緣才不會透出底色。
 * 取照片上半部，兩側露出來的只有背景布，不會把手臂、衣服的顏色暈開到角落
 */
.polaroid__blur {
  object-fit: cover;
  object-position: center top;
  filter: blur(24px);
  transform: scale(1.15);
}

.polaroid__img {
  object-fit: contain;
}

.polaroid__todo {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
}

.polaroid__caption {
  padding: 12px 0 14px;
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 15px;
  letter-spacing: 0.15em;
  text-align: center;
}

.polaroid__name {
  margin-left: 0.6em;
}

/*
 * 跨在兩側縮圖的外緣上，縮圖超出畫面時就停在畫面邊緣；
 * 對齊照片區的中線（卡片下緣比上緣寬，所以比卡片中線高一點）。
 * 和置頂快捷按鈕同一套：白底深色框線，滑過時墊黃色
 */
.carousel__arrow {
  position: absolute;
  top: calc(50% - var(--photo-shift));
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--arrow);
  height: var(--arrow);
  padding: 0;
  border: 2.2px solid var(--ink);
  border-radius: 50%;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.2s;
}

.carousel__arrow--prev {
  left: max(
    calc(50% - var(--card) * (0.5 + var(--side)) - var(--gap)),
    calc(50% - 50vw + var(--arrow) / 2 + 10px)
  );
  transform: translate(-50%, -50%);
}

.carousel__arrow--next {
  right: max(
    calc(50% - var(--card) * (0.5 + var(--side)) - var(--gap)),
    calc(50% - 50vw + var(--arrow) / 2 + 10px)
  );
  transform: translate(50%, -50%);
}

/* 只在有滑鼠的裝置上變色，手機點完才不會一直停在黃色 */
@media (hover: hover) {
  .carousel__arrow:hover {
    background: #ffd65a;
  }
}

.carousel__arrow svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 下方一排短線，目前這張拉長、顏色實心；按鈕本身比短線高，手指比較好點 */
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
  background: rgba(255, 255, 255, 0.5);
  transition: background 0.4s ease;
}

.carousel__dot.is-active {
  width: 40px;
}

.carousel__dot.is-active::before {
  background: #fff;
}

@media (prefers-reduced-motion: reduce) {
  .polaroid,
  .carousel__dot,
  .carousel__dot::before {
    transition: none;
  }
}

@media (min-width: 768px) {
  .carousel {
    --card: 66%;
    --gap: 28px;
    --arrow: 48px;
    --photo-shift: 24px;
  }

  .carousel__stage {
    margin: 0 -24px;
  }

  .polaroid {
    padding: 22px 22px 0;
  }

  .polaroid__caption {
    padding: 20px 0 24px;
    font-size: 18px;
  }

  .carousel__arrow svg {
    width: 24px;
    height: 24px;
  }

  .carousel__dots {
    margin-top: 24px;
  }
}
</style>
