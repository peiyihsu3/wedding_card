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
// 把路徑裡每一組座標換到別的位置（只適用全部是絕對座標、x y 成對寫的路徑）
const mapPath = (d, f) => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => f(+x, +y).map((v) => v.toFixed(1)).join(' '))

/*
 * 鞋子參考 Birkenstock 的 Maine（米褐色反毛皮綁帶鞋）：圓圓的鞋頭、深咖啡色的厚鞋底，鞋背上看得到幾道鞋帶，
 * 側片的前緣從鞋帶往後斜到鞋底、前端一顆小鉚釘。之前是一整坨圓圓的色塊加一道鞋底線。
 * 只畫一份側面（鞋頭朝右、鞋底在下、座標原點是鞋跟的底），四隻鞋照各自的位置、方向、大小擺上去；
 * flip 是鏡像（看到的是另一側）。往後踢、往後勾的那兩隻鞋底朝外
 */
const SHOE = {
  // 鞋跟高高的、鞋口往前斜斜降到鞋帶，鞋頭圓鼓鼓地收到鞋底（扁扁長長、鞋頭尖尖的像拖鞋，試過）
  upper: 'M5 -8C1 -20 1 -34 6 -42C14 -43 24 -38 34 -35C46 -33 58 -29 70 -26C84 -26 96 -24 100 -16C102 -12 102 -10 101 -8Z',
  seam: 'M53 -30C51 -23 47 -16 39 -11',
  // 鞋帶畫在鞋面裡面，不要凸出鞋面的邊（凸出去像刺）
  laces: ['M38 -32L42 -26', 'M45 -31L49 -25', 'M52 -29L56 -23'],
  rivet: [53, -21],
  sole: 'M2 -10L102 -10C106 -7 105 -1 99 0L8 0C3 0 1 -5 2 -10Z',
}
function shoe({ x, y, angle, scale = 1, flip = false }) {
  const a = (angle * Math.PI) / 180
  const u = [Math.cos(a), Math.sin(a)]
  // 鞋面朝向的那一側：鞋頭方向轉 90 度，鏡像就轉另一邊
  const v = flip ? [-u[1], u[0]] : [u[1], -u[0]]
  const at = (px, py) => [x + scale * (px * u[0] - py * v[0]), y + scale * (px * u[1] - py * v[1])]
  return [
    part('couple-shoe', mapPath(SHOE.upper, at)),
    fold('couple-shoe-line', mapPath(SHOE.seam, at), 2.5 * scale),
    ...SHOE.laces.map((d) => fold('couple-shoe-line', mapPath(d, at), 2.5 * scale)),
    { cls: 'couple-shoe-rivet', d: circle(...at(...SHOE.rivet), 1.8 * scale) },
    part('couple-shoe-sole', mapPath(SHOE.sole, at)),
  ]
}

/*
 * 新郎舉起來揮手的手：手掌張開，四根手指從手掌上緣散開成扇形（中指最長、小指最短），大拇指往右上翹開（原本握拳）。
 * 照手腕的座標排（手腕中點是原點、手指朝上），再轉到差不多是手臂的方向、手腕往後扳一點；手腕往下多畫一截壓在手臂上。
 * 手掌連四根手指一塊、大拇指另外一塊壓在手掌旁邊，同色疊在一起看不出接縫。
 * 手指只有手臂的三分之一寬，抖動要小、取點要密，指尖才圓
 */
const HAND = {
  x: 227,
  y: 63,
  angle: -14,
  // 每根指頭：根部的中點、往右偏幾度、長度
  fingers: [
    { at: [-13.5, -22], tilt: -22, len: 15 },
    { at: [-4.5, -25], tilt: -8, len: 20 },
    { at: [4.5, -26], tilt: 5, len: 22 },
    { at: [13.5, -25], tilt: 18, len: 19 },
  ],
  thumb: { at: [14, -12], tilt: 55, len: 19, r: 4.6 },
}
function openHand({ x, y, angle, fingers, thumb }) {
  const a = (angle * Math.PI) / 180
  const pt = ([px, py]) =>
    `${(x + px * Math.cos(a) - py * Math.sin(a)).toFixed(1)} ${(y + px * Math.sin(a) + py * Math.cos(a)).toFixed(1)}`
  // 一根指頭：從根部的左邊往上、繞過半圓的指尖、沿右邊回到根部（from 是根部往指尖退幾格開始畫）
  const digit = ({ at: [bx, by], tilt, len, r = 4 }, from = 0) => {
    const t = (tilt * Math.PI) / 180
    const p = (s, k) => pt([bx + Math.sin(t) * s - Math.cos(t) * k, by - Math.cos(t) * s - Math.sin(t) * k])
    const cap = len + (r * 4) / 3
    return `L${p(from, r)}L${p(len, r)}C${p(cap, r)} ${p(cap, -r)} ${p(len, -r)}L${p(from, -r)}`
  }
  const small = (d) => ({ cls: 'couple-skin', d: sketch(d, opt(seed++, { step: 2, amp: 0.7, wavelength: 30 })) })
  return [
    // 手腕底下 → 小指那一側的掌緣微微鼓出來 → 四根手指 → 虎口 → 手腕
    small(
      `M${pt([12.5, 8])}L${pt([-12.5, 8])}L${pt([-12, 0])}C${pt([-13, -6])} ${pt([-17, -12])} ${pt([-17, -19])}` +
        `${fingers.map((f) => digit(f)).join('')}L${pt([16, -12])}L${pt([13, 0])}Z`,
    ),
    // 大拇指的根部埋在手掌裡
    small(`M${pt(thumb.at)}${digit(thumb, -4)}Z`),
  ]
}

// 新郎（左）：由後往前畫
const groom = [
  // 往後踢的那隻腳的鞋子：鞋頭朝左下伸出褲管、鞋底朝上，鞋跟和鞋口藏在褲管裡（鞋頭朝右上伸進褲管試過，看起來像穿反）
  ...shoe({ x: 108, y: 348, angle: 149, scale: 0.95 }),
  // 站直那隻腳：腳踝伸進鞋口裡，上緣藏在褲管後面、讓褲管的下緣蓋住（原本畫在褲子前面，腳踝蓋過褲管下緣，像腳跑到褲子外面）
  part('couple-skin', 'M301 690L331 690L334 744L304 742Z'),
  ...shoe({ x: 291, y: 757, angle: 16 }),
  // 寬褲：左邊是往後踢、膝蓋彎起來的腳，右邊是站直的腳
  part(
    'couple-pants-groom',
    'M212 345C190 372 172 396 160 405C148 392 136 378 124 372C108 375 92 381 78 388L60 440C80 480 115 512 150 515C185 515 225 492 262 455C255 540 250 620 250 690C290 698 340 700 378 697C375 600 368 500 356 420C310 405 250 375 212 345Z',
  ),
  fold('couple-pants-groom-fold', 'M302 520C306 580 309 640 306 688'),
  fold('couple-pants-groom-fold', 'M110 478C140 492 175 494 212 478', 4),
  fold('couple-pants-groom-fold', 'M232 400C246 418 256 436 262 452', 4),
  // 舉起來揮手的那隻手，手肘以上被袖子蓋住；手臂一路伸進手掌裡，手掌疊在上面，手腕才不會斷開（之前手臂停在拳頭下緣，中間露出一條天空）
  part('couple-skin', 'M252 172C241 142 229 106 217 67L238 61C251 100 268 134 288 160Z'),
  ...openHand(HAND),
  /*
   * 寬鬆短袖上衣，下襬斜斜的（身體往左傾）。舉起的那隻袖子比手臂寬一點，腋下往內收一個凹口，跟右邊的袖子一樣看得出袖子的輪廓（原本被斜背包蓋住）。
   * 背後從下襬斜斜直直地往上接到腋下，只微微鼓一點（原本往左鼓成一個圓弧，像駝背）
   */
  part(
    'couple-shirt-groom',
    'M228 172L292 146C308 166 322 190 332 207C345 220 362 228 376 232C392 255 418 305 438 344C426 354 412 362 400 368C392 358 382 350 372 344C370 370 366 395 362 420C310 400 250 372 198 340C205 306 216 272 232 248C242 238 254 228 262 222C254 206 238 188 228 172Z',
  ),
  fold('couple-shirt-groom-fold', 'M290 330C315 352 338 366 360 376', 4),
  fold('couple-shirt-groom-fold', 'M380 262C392 290 402 318 410 345', 4),
  // 垂下來牽著新娘的手
  part('couple-skin', 'M398 362C410 395 425 430 438 452L458 446C448 420 436 390 424 352Z'),
  // 頭：側臉朝右，戴著鴨舌帽和圓眼鏡。臉偏瘦長：下巴收尖、下顎往耳朵斜斜收上去，脖子藏在頭的正下方（圓臉、寬下巴試過，太胖）
  part('couple-skin', 'M358 212L378 216L382 238C370 238 360 234 354 228Z'),
  part('couple-skin', 'M354 170C366 164 390 166 402 176C405 182 406 188 407 193L413 201C411 204 408 205 406 206C406 210 405 213 404 216C403 222 400 227 395 229C386 232 376 230 368 224C358 217 350 206 348 194C346 184 348 176 354 170Z'),
  part('couple-blush', circle(392, 209, 5)),
  part('couple-hair', 'M346 168C352 160 372 160 385 166L384 182C376 180 368 186 366 196C360 196 352 200 348 205C342 192 342 178 346 168Z'),
  part('couple-skin-shade', 'M366 192C372 190 376 196 374 204C370 208 364 204 366 192Z'),
  /*
   * 鴨舌帽（扁帽）戴在頭上：帽頂扁平、後高前低斜斜往前壓，前緣蓋過一片短短的帽簷，帽簷只在前面露出一點（圓頂配長帽簷像棒球帽，試過）。
   * 下緣壓過頭頂、蓋住頭髮的上半，後腦和鬢角的頭髮從帽子底下露出來（之前帽子整頂在頭頂上面，中間空一條像飄著）
   */
  part('couple-cap-brim', 'M402 172C414 170 426 171 433 175C428 180 414 181 402 179Z'),
  part('couple-cap', 'M341 186C335 170 342 154 360 149C380 145 404 152 424 166C428 170 426 174 420 175C396 177 366 181 341 186Z'),
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

// 新娘的條紋上衣：條紋畫在衣服的形狀裡面，微微往上斜；身體在兩邊的肩膀收掉，接縫外面是另外畫的袖子
const brideShirt =
  'M560 352L592 344C600 352 620 354 632 346C640 342 648 340 654 341C662 354 667 376 668 398C662 425 658 450 656 472C620 476 582 478 546 478C546 460 547 435 549 410C551 388 554 366 560 352Z'
const stripes = [362, 386, 410, 434, 458].map((y, i) =>
  brush(`M470 ${y + 8}C560 ${y + 4} 640 ${y - 4} 760 ${y - 40 + i * 6}`, opt(seed++, { amp: 1.5, width: 11 })),
)
/*
 * 兩隻袖子都另外畫、壓在身體後面，條紋繞著袖子（跟袖口平行），跟身體的條紋在接縫錯開。
 * 牽著新郎的那隻：從肩膀順著往左下垂的手臂收窄，袖口跟手臂垂直。之前袖子跟身體連成一塊往左橫著凸出去、袖口直直切掉，
 * 手臂從袖子下角穿出來，像一塊方方的翅膀。
 * 舉著捧花的那隻：從肩膀往右上收窄，袖口跟舉起來的手臂垂直、比手臂寬一點，蓋住手臂的根部。
 * 之前跟身體連成一塊，身體的條紋直接橫過袖子
 */
const brideSleeves = [
  {
    id: 'couple-bride-sleeve-hand',
    d: 'M507 391C520 379 532 368 544 357C549 354 554 353 560 352L580 370L575 412L549 410L536 422C527 412 517 401 507 391Z',
    stripes: ['M501 371L557 429', 'M519 354L574 412', 'M536 338L592 395'],
  },
  {
    id: 'couple-bride-sleeve-bouquet',
    d: 'M644 346C666 334 690 326 714 322L746 360C722 372 694 386 664 404L648 380Z',
    stripes: ['M691 309L756 385', 'M673 324L737 400', 'M654 340L719 416', 'M636 355L701 432'],
  },
].map((s) => ({ ...s, stripes: s.stripes.map((d) => brush(d, opt(seed++, { amp: 1.5, width: 11 }))) }))

// 新娘（右）
const bride = [
  // 往後勾的那隻腳：褲管露出一小截腳踝，接到鞋口；鞋子鞋頭朝下、鞋底朝外（鞋口直接貼著褲管試過，看起來像沒有腳）
  part('couple-skin', 'M738 577L768 574L772 600L740 604Z'),
  ...shoe({ x: 797, y: 566, angle: 82, scale: 0.88, flip: true }),
  // 踮著腳尖往左下踩，鞋跟抬在右上；腳踝一樣藏在褲管後面
  part('couple-skin', 'M572 770L600 765L605 800L579 802Z'),
  ...shoe({ x: 624, y: 815, angle: 165, scale: 0.85, flip: true }),
  part(
    'couple-pants-bride',
    'M546 478C525 520 515 580 518 640C520 700 528 750 536 780C570 782 610 770 648 750C630 700 612 640 600 592C620 630 650 660 690 668C715 672 735 676 752 678L745 575C715 580 700 582 690 580C675 540 665 500 658 470C620 475 580 478 546 478Z',
  ),
  fold('couple-pants-bride-fold', 'M562 560C566 620 571 680 576 740'),
  fold('couple-pants-bride-fold', 'M640 622C670 642 700 652 732 656', 4),
  fold('couple-pants-bride-fold', 'M592 500C598 530 600 560 600 588', 4),
  // 往左牽著新郎的手、往右上舉著捧花的手（捧花先畫，手臂壓在包裝紙前面）
  part('couple-skin', 'M551 365C519 396 486 428 453 459L467 473C500 441 532 410 565 379Z'),
  part('couple-skin', 'M716 330C745 315 775 295 798 272L812 284C790 305 760 335 727 368Z'),
]

/*
 * 新娘的頭（脖子、臉、頭髮、眼鏡）照原本的大小畫完，再整顆等比例縮小到跟新郎的頭差不多大（原本大一圈）。
 * 以脖子接衣領的地方為中心縮，脖子才接得上衣服；縮的是手繪抖動之後的座標，所以抖動也跟著小一點
 */
const HEAD = { k: 0.85, x: 612, y: 352 }
const shrink = (x, y) => [HEAD.x + (x - HEAD.x) * HEAD.k, HEAD.y + (y - HEAD.y) * HEAD.k]
const shrinkPart = (p) => ({ ...p, d: mapPath(p.d, shrink) })
const [glassX, glassY] = shrink(632, 298)
const brideGlasses = {
  cx: glassX,
  cy: glassY,
  r: 7 * HEAD.k,
  bridge: `M${shrink(625, 298).join(' ')}L${shrink(610, 300).join(' ')}`,
}

const brideTop = [
  part('couple-skin', 'M598 330L625 332L628 350C618 356 604 354 596 346Z'),
  // 臉往上畫到額頭：沒有瀏海，額頭會露出來
  part('couple-skin', 'M598 300C600 280 614 266 630 265C637 266 640 274 641 284C642 292 645 299 645 305L651 312C649 315 647 316 645 316C645 320 644 324 642 328C638 336 630 342 620 343C606 344 598 334 597 320C596 308 596 302 598 300Z'),
  part('couple-blush', circle(630, 320, 4.5)),
  /*
   * 沒有瀏海的直髮短鮑伯（參考側面把頭髮塞到耳後的照片）：額頭露出來，前面的頭髮從髮際線往後梳、頭頂微微蓬起，
   * 髮際線沿著太陽穴斜斜退到耳朵上方，頭髮塞到耳後，從耳朵後面直直垂到肩膀上方、下緣一刀剪齊。
   * 耳朵跟新郎一樣是深一點的膚色，壓在髮緣上，整個露出來。之前是齊瀏海停在眼鏡上緣、兩側蓋住耳朵的法式鮑伯頭；
   * 耳朵前面垂一撮細髮絲也試過，縮小之後像臉上劃了一道黑線，拿掉了。頭頂原本有一道淺色的反光，看起來像白髮，也拿掉了，頭髮整片平塗
   */
  part(
    'couple-hair',
    'M640 273C644 264 636 255 617 254C590 252 563 262 556 286C551 305 553 326 557 346L607 350C604 340 603 330 604 320C606 312 607 304 608 298C612 290 626 278 640 273Z',
  ),
  part('couple-skin-shade', 'M598 298C604 295 610 301 608 310C606 318 599 318 597 312C595 306 595 301 598 298Z'),
].map(shrinkPart)

/*
 * 捧花：米色包裝紙裡一大團綠葉，邊緣伸出幾片尖葉子，點綴小白花。
 * 包裝紙往下收到拳頭握著的地方最細，拳頭下面再露出一截、微微張開，下緣剪成長短不一的鋸齒（圓滑的弧線太整齊）。
 * 之前一路收窄到底，拳頭握在快到底的地方，底下幾乎沒有紙，花像要從紙筒脫出去
 */
const bouquet = {
  wrap: part(
    'couple-wrap',
    'M784 212C805 202 838 206 850 220L823 276L831 322L826 330L820 325L813 334L806 327L797 332L789 324L801 276Z',
  ),
  leaves: [
    ...[
      'M780 192C766 180 758 166 756 150',
      'M812 170C806 156 808 140 816 126',
      'M860 182C872 168 886 162 900 160',
      'M880 224C894 230 906 242 912 256',
      'M772 214C758 220 746 230 740 244',
    ].map((d) => fold('couple-leaf-dark', d, 11)),
    ...[
      [786, 196, 18],
      [812, 182, 20],
      [840, 180, 19],
      [864, 196, 18],
      [876, 222, 15],
      [852, 232, 18],
      [822, 226, 19],
      [794, 222, 16],
      [772, 180, 12],
      [830, 160, 13],
      [886, 204, 11],
    ].map(([cx, cy, r]) => part('couple-leaf', circle(cx, cy, r))),
  ],
  leafMarks: ['M796 210C808 200 822 196 836 198', 'M832 238C846 230 860 228 872 232'].map((d) => fold('couple-leaf-light', d, 4)),
  flowers: [
    [792, 196],
    [818, 176],
    [846, 190],
    [870, 208],
    [832, 214],
    [856, 230],
    [806, 226],
    [778, 176],
    [880, 188],
    [828, 156],
  ].map(([x, y], i) => ({
    petals: Array.from({ length: 5 }, (_, k) => {
      const a = i + (k * 2 * Math.PI) / 5
      return { cx: x + Math.cos(a) * 6, cy: y + Math.sin(a) * 6, r: 5 }
    }),
    center: { cx: x, cy: y, r: 3.2 },
  })),
  /*
   * 握著包裝紙的拳頭：橫橫的一團把紙筒整個握住，紙筒從拳頭上下穿出來；右半邊兩道淡淡的指縫是彎過來的手指。
   * 之前是一顆小圓貼在紙筒左下角，手臂又被紙筒蓋住，看起來像斷開
   */
  hand: [
    part('couple-skin', 'M794 270C797 262 808 259 818 261C826 263 830 270 829 278C828 286 821 291 812 291C802 292 795 288 793 281C792 277 792 273 794 270Z'),
    fold('couple-skin-shade', 'M813 270C819 269 823 271 826 274', 2.5),
    fold('couple-skin-shade', 'M812 280C818 280 822 282 825 285', 2.5),
  ],
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
      <clipPath v-for="s in brideSleeves" :id="s.id" :key="s.id">
        <path :d="s.d" />
      </clipPath>
    </defs>

    <path v-for="(p, i) in groom" :key="`g${i}`" :class="p.cls" :d="p.d" />
    <g :transform="camera.transform">
      <path v-for="(p, i) in camera.parts" :key="i" :class="p.cls" :d="p.d" />
    </g>
    <!-- 鏡框：細線畫的圓眼鏡 -->
    <circle class="couple-glasses" cx="399" cy="186" r="7" />
    <path class="couple-glasses" d="M392 186L374 190" />

    <path :class="bouquet.wrap.cls" :d="bouquet.wrap.d" />
    <path v-for="(p, i) in bouquet.leaves" :key="`l${i}`" :class="p.cls" :d="p.d" />
    <path v-for="(p, i) in bouquet.leafMarks" :key="`m${i}`" :class="p.cls" :d="p.d" />
    <g v-for="(f, i) in bouquet.flowers" :key="`f${i}`">
      <circle v-for="(pt, k) in f.petals" :key="k" class="couple-petal" :cx="pt.cx" :cy="pt.cy" :r="pt.r" />
      <circle class="couple-flower-center" :cx="f.center.cx" :cy="f.center.cy" :r="f.center.r" />
    </g>

    <path v-for="(p, i) in bride" :key="`b${i}`" :class="p.cls" :d="p.d" />
    <template v-for="s in brideSleeves" :key="s.id">
      <path class="couple-shirt-bride" :d="s.d" />
      <g :clip-path="`url(#${s.id})`">
        <path v-for="(d, i) in s.stripes" :key="i" class="couple-stripe" :d="d" />
      </g>
    </template>
    <path class="couple-shirt-bride" :d="brideShirt" />
    <g clip-path="url(#couple-bride-shirt)">
      <path v-for="(d, i) in stripes" :key="i" class="couple-stripe" :d="d" />
    </g>
    <path v-for="(p, i) in brideTop" :key="`t${i}`" :class="p.cls" :d="p.d" />
    <circle class="couple-glasses" :cx="brideGlasses.cx" :cy="brideGlasses.cy" :r="brideGlasses.r" />
    <path class="couple-glasses" :d="brideGlasses.bridge" />

    <path v-for="(p, i) in bouquet.hand" :key="`h${i}`" :class="p.cls" :d="p.d" />

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
  fill: #c9b48f;
}

.couple-shoe-line {
  fill: #a38b67;
}

.couple-shoe-rivet {
  fill: #6e5846;
}

.couple-shoe-sole {
  fill: #5b4030;
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
</style>
