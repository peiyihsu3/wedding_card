<script setup>
defineProps({
  /*
   * 這一區在風景裡的位置：shore 岸邊、sea 海上、island 海上右側有一座小島、sakura 上岸後越來越密的櫻花樹。
   * 風景本身是一整張連續的圖（JourneyBackdrop），這裡只管內容的間距與各區標題的顏色
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
 * 婚紗上方是小貓散步的岸邊，婚紗與資訊、資訊與回覆之間是海（小島在回覆上方或右側），
 * 回覆與交通之間上岸
 */
.scenic__inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 88px 16px 190px;
}

/* 要放得下小貓散步的草地和海岸 */
.scenic--shore .scenic__inner {
  padding-top: 272px;
}

.scenic--island .scenic__inner {
  padding-top: 150px;
}

.scenic--sakura .scenic__inner {
  padding-top: 210px;
  padding-bottom: 120px;
}

/* 海上的標題：白字墊深一點的海水藍，小字周圍也墊一圈深藍，海紋從後面穿過時才看得清楚 */
.scenic--shore,
.scenic--sea,
.scenic--island {
  --title-color: #fff;
  --title-sub: #fff;
  --title-swash: #2a7fc6;
  --scene-bg: #2a7fc6;
}

/* 草地上的標題墊白色筆刷，地上的落花從小字後面穿過時，用淡色光暈蓋掉 */
.scenic--sakura {
  --title-swash: rgba(255, 255, 255, 0.88);
  --scene-bg: #f7fbef;
}

@media (min-width: 768px) {
  .scenic__inner {
    padding: 120px 24px 250px;
  }

  .scenic--shore .scenic__inner {
    padding-top: 400px;
  }

  .scenic--island .scenic__inner {
    padding-top: 200px;
  }

  .scenic--sakura .scenic__inner {
    padding-top: 280px;
    padding-bottom: 160px;
  }
}
</style>
