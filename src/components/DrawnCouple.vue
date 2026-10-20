<script setup>
import { brush, circle, sketch } from '../utils/sketch.js'

/*
 * 程式畫的新人：照原本插畫的姿勢（新郎舉手、往後踢腿，新娘拿捧花、勾著腳），畫布大小也相同（960×864），
 * 首屏的位置、名字的對齊都能沿用。跟山海雲一樣不描邊、邊緣帶一點手繪的不規則，再疊幾筆深一點的細筆觸帶出衣服皺摺
 */
const opt = (seed, extra) => ({ step: 5, amp: 1.4, wavelength: 50, seed, ...extra })
let seed = 300
const part = (cls, d) => ({ cls, d: sketch(d, opt(seed++)) })
const fold = (cls, d, width = 5) => ({ cls, d: brush(d, opt(seed++, { amp: 1, width })) })

// 新郎（左）：由後往前畫
const groom = [
  // 往後踢的那隻腳的鞋子，被褲管蓋住一部分
  part('couple-shoe', 'M38 395C40 372 70 355 100 352C115 352 120 365 112 380C100 400 70 420 48 420C38 418 36 405 38 395Z'),
  // 寬褲：左邊是往後踢、膝蓋彎起來的腳，右邊是站直的腳
  part(
    'couple-pants-groom',
    'M212 345C190 372 172 396 160 405C148 392 136 378 124 372C108 375 92 381 78 388L60 440C80 480 115 512 150 515C185 515 225 492 262 455C255 540 250 620 250 690C290 698 340 700 378 697C375 600 368 500 356 420C310 405 250 375 212 345Z',
  ),
  fold('couple-pants-groom-fold', 'M302 520C306 580 309 640 306 688'),
  fold('couple-pants-groom-fold', 'M110 478C140 492 175 494 212 478', 4),
  fold('couple-pants-groom-fold', 'M232 400C246 418 256 436 262 452', 4),
  part('couple-skin', 'M300 690L331 690L333 726L300 728Z'),
  part('couple-shoe', 'M292 728C310 712 340 714 355 730C375 745 395 760 393 778C390 792 360 790 330 780C305 772 285 760 288 742Z'),
  fold('couple-shoe-sole', 'M296 760C326 780 360 790 390 786', 4),
  // 舉起來的手（握拳），手肘以上被袖子蓋住
  part('couple-skin', 'M252 172C240 140 228 105 212 58L238 54C250 98 268 132 288 160Z'),
  part('couple-skin', circle(224, 40, 17)),
  fold('couple-skin-shade', 'M212 34C219 29 228 29 236 33', 3),
  // 寬鬆短袖上衣，下襬斜斜的（身體往左傾）
  part(
    'couple-shirt-groom',
    'M243 182L298 150C312 170 322 190 332 207C345 220 362 228 376 232C392 255 418 305 438 344C426 354 412 362 400 368C392 358 382 350 372 344C370 370 366 395 362 420C310 400 250 372 198 340C196 300 205 260 222 235C230 215 238 198 243 182Z',
  ),
  fold('couple-shirt-groom-fold', 'M290 330C315 352 338 366 360 376', 4),
  fold('couple-shirt-groom-fold', 'M380 262C392 290 402 318 410 345', 4),
  // 垂下來牽著新娘的手
  part('couple-skin', 'M398 362C410 395 425 430 438 452L458 446C448 420 436 390 424 352Z'),
  // 斜背的黑色小包
  part('couple-hair', 'M188 262C205 240 235 225 262 222L268 238C262 262 258 285 252 300C230 305 205 302 190 296C182 285 182 272 188 262Z'),
  part('couple-hair', 'M240 232L315 188L326 200L252 246Z'),
  // 頭：側臉朝右，戴著鴨舌帽和圓眼鏡
  part('couple-skin', 'M345 200L372 205L378 236C365 236 350 228 340 218Z'),
  part('couple-skin', 'M352 172C365 165 392 168 405 178C408 184 409 190 410 194L416 202C414 205 411 206 409 207C409 212 408 214 406 218C402 226 395 232 384 234C368 236 352 226 346 210C342 196 344 180 352 172Z'),
  part('couple-blush', circle(394, 208, 5)),
  part('couple-hair', 'M346 168C352 160 372 160 385 166L384 182C376 180 368 186 366 196C360 196 352 200 348 205C342 192 342 178 346 168Z'),
  part('couple-skin-shade', 'M366 192C372 190 376 196 374 204C370 208 364 204 366 192Z'),
  part('couple-cap', 'M342 160C344 143 364 134 388 135C406 136 419 145 421 157C404 163 368 166 342 160Z'),
  part('couple-cap-brim', 'M404 152C420 148 436 152 441 160C432 167 413 167 400 162Z'),
  // 相機掛在胸前
  fold('couple-strap', 'M290 290C302 262 318 232 332 208', 4),
  fold('couple-strap', 'M332 298C346 274 362 250 376 232', 4),
]

// 相機：轉一點角度，跟著身體傾斜
const camera = {
  transform: 'rotate(22 308 304)',
  parts: [
    part('couple-camera-top', 'M290 280H306V290H290Z'),
    part('couple-camera', 'M282 287H334V321H282Z'),
    part('couple-camera-lens', circle(310, 304, 12)),
    part('couple-camera-glass', circle(310, 304, 5.5)),
  ],
}

// 新娘的條紋上衣：條紋畫在衣服的形狀裡面，跟著身體與舉起的袖子微微往上斜
const brideShirt =
  'M505 382C512 370 525 360 545 355L592 344C600 352 620 354 632 346L700 322L718 316C722 336 725 360 727 380C708 388 688 394 668 398C662 425 658 450 656 472C620 476 582 478 546 478C546 460 547 445 548 428L526 428C518 412 510 398 505 382Z'
const stripes = [362, 386, 410, 434, 458].map((y, i) =>
  brush(`M470 ${y + 8}C560 ${y + 4} 640 ${y - 4} 760 ${y - 40 + i * 6}`, opt(seed++, { amp: 1.5, width: 11 })),
)

// 新娘（右）
const bride = [
  part('couple-shoe', 'M750 580C755 568 775 566 785 580C795 600 802 630 795 650C788 664 768 664 760 650C752 630 746 600 750 580Z'),
  part(
    'couple-pants-bride',
    'M546 478C525 520 515 580 518 640C520 700 528 750 536 780C570 782 610 770 648 750C630 700 612 640 600 592C620 630 650 660 690 668C715 672 735 676 752 678L745 575C715 580 700 582 690 580C675 540 665 500 658 470C620 475 580 478 546 478Z',
  ),
  fold('couple-pants-bride-fold', 'M562 560C566 620 571 680 576 740'),
  fold('couple-pants-bride-fold', 'M640 622C670 642 700 652 732 656', 4),
  fold('couple-pants-bride-fold', 'M592 500C598 530 600 560 600 588', 4),
  part('couple-skin', 'M572 770L600 765L604 792L578 796Z'),
  part('couple-shoe', 'M590 785C605 778 625 790 622 808C618 825 595 838 568 840C550 841 543 830 548 818C555 805 575 790 590 785Z'),
  fold('couple-shoe-sole', 'M552 832C575 836 600 828 618 812', 4),
  // 往左牽著新郎的手、往右上舉著捧花的手
  part('couple-skin', 'M524 416C506 430 486 444 466 454L472 472C492 462 512 448 534 434Z'),
  part('couple-skin', 'M716 330C745 315 775 295 798 272L812 284C790 305 760 335 727 368Z'),
]

const brideTop = [
  part('couple-skin', 'M598 330L625 332L628 350C618 356 604 354 596 346Z'),
  part('couple-skin', 'M600 292C608 282 628 280 640 288C643 293 645 299 645 305L651 312C649 315 647 316 645 316C645 320 644 324 642 328C638 336 630 342 620 343C606 344 598 334 597 320C596 308 596 298 600 292Z'),
  part('couple-blush', circle(630, 320, 4.5)),
  // 鮑伯頭：蓋住頭頂和後腦
  part(
    'couple-hair',
    'M558 300C556 280 575 263 600 262C625 261 645 272 648 290C640 286 628 284 618 288C612 294 610 300 612 306L605 304C602 312 604 322 608 328C598 330 585 326 575 322C568 320 562 318 558 312C556 308 557 304 558 300Z',
  ),
  // 斜背的白色小包
  part('couple-bag', 'M622 348L634 346L702 460L690 468Z'),
  part('couple-bag', 'M655 455C665 440 700 438 720 448C735 458 738 485 728 505C718 522 690 528 670 518C652 508 646 475 655 455Z'),
  fold('couple-bag-fold', 'M664 500C680 514 700 516 720 506', 4),
]

// 捧花：米色包裝紙裡一大團綠葉，邊緣伸出幾片尖葉子，點綴小白花
const bouquet = {
  wrap: part('couple-wrap', 'M784 212C805 202 838 206 850 220L824 304C816 310 804 309 798 302Z'),
  leaves: [
    ...[
      'M800 192C786 180 778 166 776 150',
      'M832 170C826 156 828 140 836 126',
      'M880 182C892 168 906 162 920 160',
      'M900 224C914 230 926 242 932 256',
      'M792 214C778 220 766 230 760 244',
    ].map((d) => fold('couple-leaf-dark', d, 11)),
    ...[
      [806, 196, 18],
      [832, 182, 20],
      [860, 180, 19],
      [884, 196, 18],
      [896, 222, 15],
      [872, 232, 18],
      [842, 226, 19],
      [814, 222, 16],
      [792, 180, 12],
      [850, 160, 13],
      [906, 204, 11],
    ].map(([cx, cy, r]) => part('couple-leaf', circle(cx, cy, r))),
  ],
  leafMarks: ['M816 210C828 200 842 196 856 198', 'M852 238C866 230 880 228 892 232'].map((d) => fold('couple-leaf-light', d, 4)),
  flowers: [
    [812, 196],
    [838, 176],
    [866, 190],
    [890, 208],
    [852, 214],
    [876, 230],
    [826, 226],
    [798, 176],
    [900, 188],
    [848, 156],
  ].map(([x, y], i) => ({
    petals: Array.from({ length: 5 }, (_, k) => {
      const a = i + (k * 2 * Math.PI) / 5
      return { cx: x + Math.cos(a) * 6, cy: y + Math.sin(a) * 6, r: 5 }
    }),
    center: { cx: x, cy: y, r: 3.2 },
  })),
  hand: part('couple-skin', circle(806, 276, 13)),
}

// 兩人牽在一起的手
const hands = part('couple-skin', 'M432 450C440 442 458 440 470 448C476 458 472 472 462 478C450 484 436 478 432 466Z')
</script>

<template>
  <svg viewBox="0 0 960 864" aria-hidden="true">
    <defs>
      <clipPath id="couple-bride-shirt">
        <path :d="brideShirt" />
      </clipPath>
    </defs>

    <path v-for="(p, i) in groom" :key="`g${i}`" :class="p.cls" :d="p.d" />
    <g :transform="camera.transform">
      <path v-for="(p, i) in camera.parts" :key="i" :class="p.cls" :d="p.d" />
    </g>
    <!-- 鏡框：細線畫的圓眼鏡 -->
    <circle class="couple-glasses" cx="399" cy="186" r="7" />
    <path class="couple-glasses" d="M392 186L374 190" />

    <path v-for="(p, i) in bride" :key="`b${i}`" :class="p.cls" :d="p.d" />
    <path class="couple-shirt-bride" :d="brideShirt" />
    <g clip-path="url(#couple-bride-shirt)">
      <path v-for="(d, i) in stripes" :key="i" class="couple-stripe" :d="d" />
    </g>
    <path v-for="(p, i) in brideTop" :key="`t${i}`" :class="p.cls" :d="p.d" />
    <circle class="couple-glasses" cx="632" cy="298" r="7" />
    <path class="couple-glasses" d="M625 298L610 300" />

    <g class="couple-bouquet">
      <path :class="bouquet.wrap.cls" :d="bouquet.wrap.d" />
      <path v-for="(p, i) in bouquet.leaves" :key="`l${i}`" :class="p.cls" :d="p.d" />
      <path v-for="(p, i) in bouquet.leafMarks" :key="`m${i}`" :class="p.cls" :d="p.d" />
      <g v-for="(f, i) in bouquet.flowers" :key="`f${i}`">
        <circle v-for="(pt, k) in f.petals" :key="k" class="couple-petal" :cx="pt.cx" :cy="pt.cy" :r="pt.r" />
        <circle class="couple-flower-center" :cx="f.center.cx" :cy="f.center.cy" :r="f.center.r" />
      </g>
    </g>
    <path :class="bouquet.hand.cls" :d="bouquet.hand.d" />

    <path :class="hands.cls" :d="hands.d" />
  </svg>
</template>

<style scoped>
.couple-skin {
  fill: #f0ad88;
}

.couple-skin-shade {
  fill: #e0946f;
}

.couple-blush {
  fill: rgba(232, 120, 120, 0.35);
}

.couple-hair {
  fill: #2a2422;
}

.couple-glasses {
  fill: none;
  stroke: #3a3230;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.couple-cap {
  fill: #d8b68b;
}

.couple-cap-brim {
  fill: #c9a274;
}

.couple-shirt-groom {
  fill: #f8ebd8;
}

.couple-shirt-groom-fold {
  fill: #e8d5b8;
}

.couple-pants-groom {
  fill: #7b7c3a;
}

.couple-pants-groom-fold {
  fill: #66672e;
}

.couple-strap {
  fill: #2a2422;
}

.couple-camera {
  fill: #5d6970;
}

.couple-camera-top {
  fill: #8a969e;
}

.couple-camera-lens {
  fill: #2f393f;
}

.couple-camera-glass {
  fill: #8a969e;
}

.couple-shoe {
  fill: #c89b6c;
}

.couple-shoe-sole {
  fill: #9b7148;
}

.couple-shirt-bride {
  fill: #4f9160;
}

.couple-stripe {
  fill: #eef0d8;
}

.couple-pants-bride {
  fill: #f0dcbc;
}

.couple-pants-bride-fold {
  fill: #e0c49c;
}

.couple-bag {
  fill: #fbf8ee;
}

.couple-bag-fold {
  fill: #e6dfca;
}

.couple-wrap {
  fill: #f3ead6;
}

.couple-leaf {
  fill: #3f8f50;
}

.couple-leaf-dark {
  fill: #2f7a43;
}

.couple-leaf-light {
  fill: #58a868;
}

.couple-petal {
  fill: #fff;
}

.couple-flower-center {
  fill: #f7d36b;
}

/* 捧花以握著的手為軸輕輕搖 */
.couple-bouquet {
  transform-box: view-box;
  transform-origin: 806px 276px;
}

@media (prefers-reduced-motion: no-preference) {
  .couple-bouquet {
    animation: bouquet-sway 2.4s ease-in-out infinite alternate;
  }
}

@keyframes bouquet-sway {
  from {
    transform: rotate(-4deg);
  }
  to {
    transform: rotate(5deg);
  }
}
</style>
