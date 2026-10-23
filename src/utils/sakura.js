// 固定的偽亂數（0–1）：位置看起來隨機，但每次載入都一樣
export function noise(i, k) {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// 一片櫻花瓣：中心在原點、長約 18，上緣中間有個小缺口；用 transform 旋轉、縮放
export const PETAL = 'M0 9C-5.5 5.5-7.5-0.5-5-5.5C-3.5-8.2-1.4-7.6 0-4.8C1.4-7.6 3.5-8.2 5-5.5C7.5-0.5 5.5 5.5 0 9Z'
