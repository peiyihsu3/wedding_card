<template>
  <!--
    白色的海鷗，翅尖灰、嘴橘，平塗不描邊；大小與位置由外層決定。
    翅膀拍動、身體左右滑翔，--delay、--drift 由外層打散，一群裡每隻的節奏才不會一樣
  -->
  <svg class="gull" viewBox="0 0 60 50" aria-hidden="true">
    <g class="gull__body">
      <g class="gull__wings">
        <path class="gull__white" d="M29 16C24 8 14 5 3 8C11 9 19 13 25 19ZM31 16C36 8 46 5 57 8C49 9 41 13 35 19Z" />
        <path class="gull__tip" d="M3 8C7 6.5 11 6 14 6.5C11 7.8 8.5 8.5 6.5 9.2ZM57 8C53 6.5 49 6 46 6.5C49 7.8 51.5 8.5 53.5 9.2Z" />
      </g>
      <ellipse class="gull__white" cx="30" cy="17" rx="5.5" ry="4" />
      <circle class="gull__white" cx="35" cy="14.5" r="3.4" />
      <path class="gull__beak" d="M38 14l4.5 1.2-4.5 1.2z" />
    </g>
  </svg>
</template>

<style scoped>
.gull {
  overflow: visible;
}

.gull__white {
  fill: #fff;
}

.gull__tip {
  fill: #8796a5;
}

.gull__beak {
  fill: #f5a34a;
}

.gull__wings {
  transform-box: view-box;
  transform-origin: 30px 16px;
}

@media (prefers-reduced-motion: no-preference) {
  /* 海鷗拍翅膀，同時慢慢左右滑翔 */
  .gull__wings {
    animation: flap 0.7s ease-in-out var(--delay, 0s) infinite alternate;
  }

  .gull__body {
    animation: glide var(--drift, 6s) ease-in-out var(--delay, 0s) infinite alternate;
  }
}

@keyframes flap {
  to {
    transform: scaleY(0.35);
  }
}

@keyframes glide {
  from {
    transform: translate(-6px, 2px);
  }
  to {
    transform: translate(6px, -2px);
  }
}
</style>
