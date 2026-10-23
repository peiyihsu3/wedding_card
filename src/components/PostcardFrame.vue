<script setup>
import SketchFrame from './SketchFrame.vue'

/*
 * 明信片：一張白色的方格紙，不描邊、不加外圈的色邊，邊緣只靠手繪底的不規則輪廓。
 * 卡紙沿用 SketchFrame 的手繪底，方格直接寫在這張卡紙的 svg 上（PaintDefs 的 paint-grid-paper），
 * 不用 --sketch-fill，才不會傳到裡面的輸入框
 */
defineProps({
  seed: { type: Number, default: 1 },
})
</script>

<template>
  <SketchFrame class="postcard" :seed="seed" :radius="10">
    <div class="postcard__body">
      <slot />
    </div>
  </SketchFrame>
</template>

<style scoped>
.postcard > :deep(.sketch-frame__fill) {
  fill: url(#paint-grid-paper);
  stroke: none;
}

.postcard__body {
  padding: 28px 20px;
}

@media (min-width: 768px) {
  .postcard__body {
    padding: 40px;
  }
}
</style>
