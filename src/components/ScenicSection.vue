<script setup>
defineProps({
  /*
   * 這一區在風景裡的位置：sky 首屏接下來婚紗那一區的紙（一個畫面高）、sea 海上、island 回覆那一區的海（主色換成樹叢綠）、sakura 上岸後越來越密的櫻花樹。
   * 風景本身是一整張連續的圖（JourneyBackdrop），這裡只管內容的間距（回覆區另外換主色）
   */
  scene: { type: String, required: true },
})
</script>

<template>
  <section class="scenic" :class="`scenic--${scene}`">
    <div class="scenic__inner">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* 疊在風景上面，本身透明 */
.scenic {
  position: relative;
  z-index: 1;
}

/* 最後一區至少一個畫面高，從 #traffic 連結進來時才捲得到頂端 */
.scenic:last-child {
  min-height: 100vh;
  min-height: 100svh;
}

/*
 * 上方至少留出置頂快捷按鈕的高度。兩區內容之間的空白就是風景的舞台：
 * 婚紗整區是一張紙，婚紗與資訊之間是紙的下緣蓋在海上，資訊與回覆之間是海，
 * 回覆與交通之間上岸
 */
.scenic__inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 88px 16px 190px;
}

/*
 * 婚紗整區剛好一個畫面高，就是那張紙的大小（見 JourneyBackdrop 的 drawFrame），照片在紙上上下置中；
 * 內容比一個畫面高的話（很矮的橫式螢幕），區塊和紙一起撐高。
 * 輪播兩側的照片超出畫面的部分由 <main> 裁掉（見 PhotoGallery）
 */
.scenic--sky {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
}

/* 沒有標題，照片直接排在紙上：上方留出置頂快捷按鈕的高度，下方留一點空白 */
.scenic--sky .scenic__inner {
  width: 100%;
  padding-top: 72px;
  padding-bottom: 40px;
}

/*
 * 資訊上面接著婚紗那張紙的下緣，中間留一段海面，上方留白比其他區多；
 * 資訊與回覆之間只是一段海面（一隻海鷗），下方留白比其他區短，兩張卡片才不會離太遠
 */
.scenic--sea .scenic__inner {
  padding-top: 170px;
  padding-bottom: 80px;
}

/*
 * 回覆與交通之間是一段海面加上岸的草地，海岸下方那條空的草地下面不要再空一大片，上方留白比其他區短；
 * 手機上兩邊再收短，一段海面（一小群海鷗）接著岸上的樹就到交通（原本 190 + 140，海和草地都空了一大片）
 */
.scenic--island .scenic__inner {
  padding-bottom: 120px;
}

.scenic--sakura .scenic__inner {
  padding-top: 100px;
  padding-bottom: 120px;
}

/* 回覆這一區（表單與送出後的卡片）主色換成綠色，跟風景裡的樹叢同色 */
.scenic--island {
  --accent: var(--scene-bush);
  --accent-deep: var(--scene-bush-deep);
  --accent-soft: #e6f2da;
}

@media (min-width: 768px) {
  .scenic__inner {
    padding: 120px 24px 250px;
  }

  .scenic--sky .scenic__inner {
    padding-top: 88px;
    padding-bottom: 56px;
  }

  .scenic--sea .scenic__inner {
    padding-top: 230px;
    padding-bottom: 120px;
  }

  .scenic--island .scenic__inner {
    padding-bottom: 250px;
  }

  .scenic--sakura .scenic__inner {
    padding-top: 180px;
    padding-bottom: 160px;
  }
}

/* 桌機內容欄放寬；兩側露出的海變窄時，風景會自己把海鷗收掉。資訊的日曆也一樣寬，再寬就像一條橫幅 */
@media (min-width: 1024px) {
  .scenic__inner {
    max-width: 960px;
  }
}
</style>
