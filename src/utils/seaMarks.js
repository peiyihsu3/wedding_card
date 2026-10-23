import { noise } from './sakura.js'

/*
 * 海紋：照參考圖描下來的深藍色斜短線，一組一到三筆、往右上斜約 30 度，長短不一，疏疏落落鋪滿整片海。
 * 座標是參考圖的像素（814×1160），各處依自己的比例縮放；線條都離邊緣一小段距離，上下左右重複鋪不會切到
 */
export const SEA_MARKS = {
  width: 814,
  height: 1160,
  d: 'M525 20l16-8M170 21l6-4M175 27l7-5M525 29l12-7M175 39l9-6M60 42l8-5M67 47l8-5M383 51l3-1M68 59l9-6M381 61l8-5M373 65l6-3M216 71l14-9M386 71l7-5M686 88l17-11M333 151l9-6M508 157l17-10M334 159l15-9M344 160l15-9M730 168l6-2M725 182l15-10M614 183l9-5M192 189l7-5M735 189l9-7M175 189l7-5M619 191l15-9M184 193l6-3M282 221l15-9M290 227l7-5M282 231l5-3M60 242l12-8M62 251l16-11M440 253l9-5M448 258l9-8M449 270l10-7M565 277l14-8M562 289l9-7M708 291l12-7M729 303l4-3M711 303l17-11M395 351l13-9M172 355l7-5M180 359l5-3M190 359l6-3M398 359l11-9M173 361l3-1M181 363l7-3M561 375l8-7M562 382l17-10M296 407l11-7M59 414l11-8M302 414l13-10M60 423l13-10M428 473l7-4M422 477l4-3M771 482l14-8M627 483l8-6M638 485l14-9M426 488l19-12M32 489l8-5M441 490l6-6M772 492l15-10M39 494l10-6M39 507l10-6M173 533l14-9M574 547l15-9M167 555l14-10M575 558l14-11M344 583l5-3M344 593l10-7M338 596l4-2M347 604l10-8M777 637l10-7M779 650l17-12M794 650l3-2M555 653l7-5M563 658l8-7M563 670l10-6M52 687l13-9M56 699l19-12M73 700l5-3M223 719l10-5M236 720l14-8M371 749l13-10M367 761l9-7M658 793l14-8M659 803l14-10M742 811l14-9M465 854l5-2M461 867l16-10M175 872l17-11M469 875l10-7M282 1000l9-6M296 1001l5-3M284 1007l10-5M643 1021l8-5M644 1029l16-9M653 1031l14-9M10 1033l9-7M17 1036l9-4M18 1049l10-6M761 1063l16-11M484 1067l11-5M490 1075l15-9M346 1121l11-7M62 1126l15-8M350 1133l19-12M367 1133l4-4',
}

// 海紋的顏色：比海面深一點的海水藍，跟海上標題墊底的顏色相同
export const SEA_MARK_COLOR = '#2a7fc6'

/*
 * 疏一點的海紋：一組一到三筆（起點彼此在 GAP 以內的算同一組），照固定的偽亂數整組留下或拿掉，
 * keep 是大約留下幾成。一組裡的線不拆開，留下來的看起來還是參考圖那樣一小撮一小撮的
 */
const GAP = 24
function thinOut(d, keep) {
  const strokes = d.match(/M[^M]+/g).map((s) => ({ s, x: +s.match(/M(\d+)/)[1], y: +s.match(/M\d+ (\d+)/)[1] }))
  const groups = []
  for (const st of strokes) {
    const near = groups.find((g) => g.some((o) => Math.hypot(o.x - st.x, o.y - st.y) < GAP))
    if (near) near.push(st)
    else groups.push([st])
  }
  return groups
    .filter((_, i) => noise(i, 97) < keep)
    .flat()
    .map((st) => st.s)
    .join('')
}

// 整張圖樣當成 CSS 背景圖（線寬以參考圖的像素計）
export function seaMarksImage({ strokeWidth = 2.4, keep = 1 } = {}) {
  const { width, height } = SEA_MARKS
  const d = keep < 1 ? thinOut(SEA_MARKS.d, keep) : SEA_MARKS.d
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<path d="${d}" fill="none" stroke="${SEA_MARK_COLOR}" stroke-width="${strokeWidth}" stroke-linecap="round"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
