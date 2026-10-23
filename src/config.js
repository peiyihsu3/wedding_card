// 婚禮資訊：只要改這個檔案就能換成你們的內容
export const wedding = {
  groom: '李彥呈',
  bride: '徐珮宜',
  date: '2027 年 1 月 31 日（日）',
  // 首屏的大字日期，格式 YYYY-MM-DD
  dateISO: '27-01-31',
  // 時間：每一段上面印小字的標籤、下面印放大的時刻，依序並排
  times: [
    { label: '入席', time: '12:00' },
    { label: '開席', time: '12:30' },
  ],
  // 資訊的桌曆往上翻頁時，底下那一頁印的邀請詞：一句大字，接著幾行小字，最後署名新人的名字
  invitation: {
    title: '誠摯邀請您',
    lines: ['來參加我們的婚禮', '一起分享這份喜悅'],
  },
  venue: '大倉久和大飯店',
  // 資訊的桌曆上，飯店名稱下面另起一行的樓層與廳名
  hall: '3F 久和廳',
  // 資訊的桌曆上，飯店名稱上面那行小字，前面放一個地標圖示；完整的地址放在交通那一區
  city: '台北市',
  address: '台北市中山區南京東路一段9號',
  // 交通區塊飯店名稱旁的外部連結圖示，點了另開分頁到 Google 地圖；不需要可留空字串
  mapUrl: 'https://www.google.com/maps?ll=25.05251,121.523274&z=16&t=m&hl=en&gl=TW&mapclient=embed&cid=2317726318200307724',
  // 交通區塊的 Google 地圖嵌入網址（iframe 的 src）
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3614.4564379972567!2d121.52069907544704!3d25.052514337545585!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3442a968d1b7225f%3A0x202a37ce7ae7400c!2sThe%20Okura%20Prestige%20Taipei!5e0!3m2!1sen!2stw!4v1792502576262!5m2!1sen!2stw',
  rsvpDeadline: '2027 年 11 月 15 日',
}

// 出席人數上限（含本人）
export const maxGuests = 10
