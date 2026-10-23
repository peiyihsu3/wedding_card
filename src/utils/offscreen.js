/*
 * 畫面外的循環動畫先停下來：首屏的海紋、人物、剪紙、海鷗、落花一直在動，看不到的也照樣每一格在算、在畫，手機會發熱。
 * v-pause-offscreen 標在一段會動的範圍上，整段離開畫面時加上 data-offscreen，
 * 裡面的循環動畫寫 animation-play-state: var(--loop, running)，就會跟著停（見 main.css）。
 * 標的要是不會跟著動畫移動的元素：動到畫面外停住的話，就再也動不回來了。
 * 指令的值是 rootMargin，畫面上看不到、但還沒捲出畫面的範圍可以提早停（見 OpeningScene）。
 * 預設往內縮 1px：剛好貼著畫面邊緣（例如捲到下一區、這一區的下緣貼齊畫面頂端）也算交疊，不縮的話會停不下來。
 * 用屬性不用 class：Vue 換 class 時會整個覆寫，加上去的 class 會被洗掉
 */
const observers = new Map()

function observerFor(margin = '-1px') {
  if (!observers.has(margin)) {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.toggleAttribute('data-offscreen', !e.isIntersecting)),
      { rootMargin: margin },
    )
    observers.set(margin, observer)
  }
  return observers.get(margin)
}

export const vPauseOffscreen = {
  mounted: (el, { value }) => observerFor(value).observe(el),
  unmounted: (el, { value }) => observerFor(value).unobserve(el),
}
