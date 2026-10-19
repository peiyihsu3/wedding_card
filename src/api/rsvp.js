const GAS_URL = import.meta.env.VITE_GAS_URL

// 只有本機開發且未設定網址時才模擬送出；正式環境沒設網址要直接報錯，
// 否則來賓會以為回覆成功但資料其實沒寫進試算表
export const isMockMode = import.meta.env.DEV && !GAS_URL

export async function submitRsvp(payload) {
  if (isMockMode) {
    console.info('[模擬模式] 未設定 VITE_GAS_URL，資料不會寫入試算表：', payload)
    await new Promise((resolve) => setTimeout(resolve, 800))
    return { ok: true, updated: false }
  }

  if (!GAS_URL) {
    throw new Error('表單尚未設定完成，請聯絡新人')
  }

  let res
  try {
    // text/plain 屬於「簡單請求」，不會觸發 CORS preflight（Apps Script 無法處理 OPTIONS）
    res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('網路連線失敗，請稍後再試')
  }

  if (!res.ok) {
    throw new Error(`伺服器錯誤（${res.status}），請稍後再試`)
  }

  const data = await res.json().catch(() => null)
  if (!data?.ok) {
    throw new Error(data?.error || '送出失敗，請稍後再試')
  }
  return data
}
