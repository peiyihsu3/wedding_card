<script setup>
import { wedding } from '../config.js'

const MONTHS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

// 左側日曆：年月、放大的日期、星期。dateISO 的年份只寫兩位數（27-01-31），這裡補成西元年
const [y, m, d] = wedding.dateISO.split('-').map(Number)
const date = new Date(y < 100 ? 2000 + y : y, m - 1, d)
const pad = (n) => String(n).padStart(2, '0')
const calendar = {
  iso: `${date.getFullYear()}-${pad(m)}-${pad(d)}`,
  year: date.getFullYear(),
  month: `${MONTHS[date.getMonth()]}月`,
  day: date.getDate(),
  weekday: `星期${'日一二三四五六'[date.getDay()]}`,
  // 傳統日曆的週末印紅字
  holiday: date.getDay() === 0 || date.getDay() === 6,
}

// 城市前面的地標圖示：實心的圖釘，平塗色塊不描邊，中間挖一個圓洞露出底下的白紙，跟全站剪紙的畫法一樣（快捷按鈕那種線條圖釘試過）
const PIN = 'M12 22.5C9.6 20 4.5 14.4 4.5 9.6a7.5 7.5 0 0 1 15 0c0 4.8-5.1 10.4-7.5 12.9zM14.9 9.4a2.9 2.9 0 1 0-5.8 0a2.9 2.9 0 1 0 5.8 0z'
</script>

<template>
  <!-- 傳統日曆的版面：左邊一大格日期，右邊一行一行寫地點與時間；手機上日期置中、詳細資訊移到下方 -->
  <header class="hero">
    <time class="hero__calendar" :class="{ 'is-holiday': calendar.holiday }" :datetime="calendar.iso">
      <span class="hero__cal-month">
        <span class="hero__cal-year">{{ calendar.year }}</span>
        {{ calendar.month }}
      </span>
      <span class="hero__cal-day">{{ calendar.day }}</span>
      <span class="hero__cal-weekday">{{ calendar.weekday }}</span>
    </time>

    <dl class="hero__info">
      <div>
        <dt>地點</dt>
        <dd class="hero__venue">
          <span class="hero__address">
            <svg class="hero__pin" viewBox="0 0 24 24" aria-hidden="true"><path :d="PIN" /></svg>
            {{ wedding.city }}
          </span>
          <span class="hero__name">
            {{ wedding.venue }}
            <span class="hero__hall">{{ wedding.hall }}</span>
          </span>
        </dd>
      </div>
      <div>
        <dt>時間</dt>
        <dd class="hero__times">
          <span v-for="slot in wedding.times" :key="slot.label" class="hero__time">
            <span class="hero__time-label">{{ slot.label }}</span>
            <span class="hero__time-clock">{{ slot.time }}</span>
          </span>
        </dd>
      </div>
    </dl>
  </header>
</template>

<style scoped>
.hero {
  /* 假日照傳統日曆印紅字（換成海的深藍試過，星期日印藍字像星期六，改回紅）；日期不描外框，平日改用墨色，黃字在白紙上會看不見 */
  --calendar-day: #2b2523;
  --calendar-holiday: #ee6a5f;
  --calendar-ink: #2b2523;
  /* 入席、開席的小標籤用中性灰，退到時刻後面（全站的 --text-muted 偏暖、帶點咖啡色，在白紙上看起來髒） */
  --calendar-label: #8c8c8c;
  --calendar-dash: var(--calendar-yellow, #fad670);
  /* 年月的字級；右欄第一行（城市）要跟它對齊底線，用同一個值算位置 */
  --month-size: 28px;
  display: grid;
  grid-template-areas:
    'cal'
    'info';
  padding-top: 8px;
}

.hero__calendar {
  grid-area: cal;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.3;
  white-space: nowrap;
}

.hero__cal-month {
  font-size: var(--month-size);
  font-weight: 700;
}

.hero__cal-year {
  font-family: 'Fredoka', var(--font-sans);
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* 日曆上的日期是平塗的實心字，不描外框；邊緣套首屏日期那組手繪抖動濾鏡（PaintDefs）。字放得很大，700 太粗、像一團色塊，降到 500 */
.hero__cal-day {
  margin: 4px 0;
  color: var(--calendar-day);
  font-family: 'Fredoka', var(--font-sans);
  font-size: 110px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.04em;
  filter: url(#paint-sketch-date);
}

.hero__cal-weekday {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.hero__calendar.is-holiday .hero__cal-day {
  color: var(--calendar-holiday);
}

.hero__calendar.is-holiday .hero__cal-weekday {
  color: var(--calendar-holiday);
}

/* 地點、時間上下排，只用留白隔開，不再畫虛線；時間靠左，地點只有桌機靠左。手機上整塊縮到內容的寬度、在日期底下置中 */
.hero__info {
  grid-area: info;
  justify-self: center;
  margin: 24px 0 0;
}

.hero__info > div {
  padding: 18px 0;
}

/* 「地點」「時間」一看內容就懂，畫面上不印；留給螢幕閱讀器念 */
.hero__info dt {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.hero__info dd {
  margin: 0;
}

/*
 * 飯店名稱是右欄的主角：放大，用墨色壓得比內文深；地址自己設了字級，不會跟著放大。
 * 手機、平板上地點的三行（城市、飯店、樓層）置中，桌機才貼著虛線靠左（見下方）
 */
.hero__venue {
  color: var(--calendar-ink);
  font-size: 26px;
  line-height: 1.3;
  text-align: center;
}

/* 一段文字整段換行，不從中間拆開 */
.hero__keep {
  display: inline-block;
}

/*
 * 手機上樓層與廳名一律從「3F」換到飯店名稱下面一行，字一樣大，讀起來還是同一個名字
 * （接在同一行、放不下才整段換行試過，斷在哪裡要看螢幕寬度，改成固定換行；同一行但字小一級也試過）。
 * 跟飯店名稱之間空開一點（不另外空開試過，兩行擠在一起）；平板以上字小一級、空開半個字高（見下方）
 */
.hero__hall {
  display: block;
  margin-top: 0.3em;
  white-space: nowrap;
}

/* 時間排成一行：每段是小字標籤接放大的時刻、對齊字的底線，入席和開席並排；手機和直式平板的右欄很窄，兩段之間只空一點，太窄才換行（一段一行疊起來試過，改回並排） */
.hero__times {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
}

.hero__time {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}

.hero__time-label {
  color: var(--calendar-label);
  font-size: 16px;
  letter-spacing: 0.2em;
}

/* 時刻直接用墨色實心字，不描框、不加粗（Fredoka 400），讓日曆的日期當唯一的粗體大字；不套手繪抖動（原本有套，數字邊緣毛毛的，已經拿掉） */
.hero__time-clock {
  color: var(--calendar-ink);
  font-family: 'Fredoka', var(--font-sans);
  font-size: 34px;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: 0.03em;
}

/*
 * 城市那一行在飯店名稱上面（放在下面試過），前面放一個跟字一樣高的地標圖示。
 * 字跟飯店名稱一樣用墨色（灰字試過，太淡），靠字小一級分出層次；圖示用海的藍，在白紙上點一點顏色。
 * 手機上跟飯店名稱之間多空一點，留點呼吸的空間（只空 2px 試過，兩行黏在一起；10px 也還是擠）
 */
.hero__address {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2em;
  margin-bottom: 18px;
  color: var(--calendar-ink);
  font-size: 16px;
}

.hero__pin {
  flex: none;
  width: 1.05em;
  height: 1.05em;
  fill: var(--scene-sea);
  fill-rule: evenodd;
}

/*
 * 平板以上：日期在左，用黃色虛線跟右邊隔開，像日曆上的撕線；右邊是地點、時間，時間貼著虛線那一側靠左，地點到桌機才靠左。
 * 兩欄一樣高，頭尾對齊：飯店名稱跟年份對齊上緣，最後一行時刻的底跟星期的底對齊下緣，比較矮的那一欄把中間撐開
 */
@media (min-width: 768px) {
  .hero {
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-areas: 'cal info';
    column-gap: 40px;
    /* 加上外框本身的留白，整張日曆高一點 */
    padding: 32px 0;
    --month-size: 30px;
  }

  .hero__calendar {
    justify-content: space-between;
    padding-right: 32px;
    border-right: 2px dashed var(--calendar-dash);
  }

  .hero__cal-day {
    margin: 8px 0;
    font-size: 128px;
  }

  /*
   * 兩欄的底對齊的是行框，字的底不會剛好對齊：星期的字底下還空約 0.23 個字高、時刻的數字底下空約 0.19 個字高（量過的），
   * 各自用負的下邊距收掉，行框的底就是字的底
   */
  .hero__cal-weekday {
    margin-bottom: -0.23em;
    font-size: 20px;
  }

  .hero__time-clock {
    margin-bottom: -0.19em;
  }

  /* 標籤跟時刻對齊底線，但標籤的行框比數字的底還往下多一截，會把這一行撐高；往下的部分不算，這一行的底才是數字的底 */
  .hero__time-label {
    margin-bottom: -1em;
  }

  .hero__info {
    justify-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-top: 0;
  }

  .hero__info > div {
    padding: 22px 0;
  }

  .hero__info > div:first-child {
    padding-top: 0;
  }

  /*
   * 右欄第一行的城市跟左欄第一行的年月對齊底線：兩欄都從頂端排，兩行的底線離行框頂端都差不多是一個字高（量過的），
   * 城市的字比較小，往下挪「年月字級 − 自己的字級」，兩行的底線就在同一條線上
   */
  .hero__address {
    margin-top: calc(var(--month-size) - 1em);
  }

  .hero__info > div:last-child {
    padding-bottom: 0;
  }

  .hero__venue {
    font-size: 30px;
  }

  /*
   * 平板以上樓層與廳名在飯店名稱下面另起一行，字小一級，飯店名稱還是主角（接在同一行試過，右欄放不下，飯店名稱要縮小一級）；
   * 跟飯店名稱之間空半個字高，不要黏在一起
   */
  .hero__hall {
    margin-top: 0.5em;
    font-size: 0.62em;
  }

  .hero__time-label {
    font-size: 17px;
  }

  .hero__times {
    column-gap: 20px;
  }

  .hero__time-clock {
    font-size: 36px;
  }

  .hero__address {
    margin-bottom: 2px;
    font-size: 18px;
  }
}

/* 桌機：日曆再放大一級 */
@media (min-width: 1024px) {
  .hero {
    grid-template-columns: 300px minmax(0, 1fr);
    column-gap: 56px;
    padding: 48px 0;
    --month-size: 36px;
  }

  .hero__calendar {
    padding-right: 40px;
  }

  .hero__cal-day {
    margin: 10px 0;
    font-size: 160px;
  }

  .hero__cal-weekday {
    font-size: 23px;
  }

  .hero__info > div {
    padding: 28px 0;
  }

  /* 桌機的右欄夠寬，地點跟時間一樣貼著虛線靠左 */
  .hero__venue {
    font-size: 38px;
    text-align: left;
  }

  .hero__times {
    column-gap: 36px;
  }

  .hero__time-label {
    font-size: 19px;
  }

  .hero__time-clock {
    font-size: 42px;
  }

  .hero__address {
    justify-content: flex-start;
    margin-bottom: 6px;
    font-size: 20px;
  }
}

/* 寬螢幕：日曆跟其他區一樣寬（太寬像一條橫幅），只把字再放大一級，日曆高一點、在海上當主角 */
@media (min-width: 1200px) {
  .hero {
    grid-template-columns: 320px minmax(0, 1fr);
    padding: 60px 0;
    --month-size: 42px;
  }

  .hero__calendar {
    padding-right: 40px;
  }

  .hero__cal-day {
    margin: 12px 0;
    font-size: 186px;
  }

  .hero__cal-weekday {
    font-size: 27px;
  }

  .hero__info > div {
    padding: 32px 0;
  }

  .hero__venue {
    font-size: 44px;
  }

  .hero__times {
    column-gap: 44px;
  }

  .hero__time-label {
    font-size: 22px;
  }

  .hero__time-clock {
    font-size: 50px;
  }

  .hero__address {
    margin-bottom: 8px;
    font-size: 24px;
  }
}
</style>
