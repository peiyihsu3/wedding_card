/*
 * 顆粒：一張小小的雜訊圖，每一點隨機是半透明的黑或白，疊在色塊上像噴槍畫或印刷品那種粗粗的質感。
 * 大部分的點接近透明，少數比較深或比較亮；雜訊沒有規律，重複鋪滿也看不出接縫。
 * 同樣大小、強度的只產生一次，全站共用同一張
 */
export const GRAIN_SIZE = 160

const cache = new Map()

export function grainImage(size = GRAIN_SIZE, strength = 0.22) {
  const key = `${size}/${strength}`
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    // 三個亂數平均再拉到 -1–1：越靠近 0 的機率越高
    const v = (Math.random() + Math.random() + Math.random()) / 1.5 - 1
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v > 0 ? 255 : 0
    img.data[i + 3] = Math.abs(v) * strength * 255
  }
  ctx.putImageData(img, 0, 0)
  const url = canvas.toDataURL()
  cache.set(key, url)
  return url
}

// 一個雜訊點的大小（CSS 像素）：約等於螢幕的一個實體像素，高解析度螢幕最小 0.5 個 CSS 像素，太細會糊掉看不出來
export const grainDot = () => 1 / Math.min(window.devicePixelRatio || 1, 2)
