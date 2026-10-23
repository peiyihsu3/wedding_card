<script setup>
import { ref } from 'vue'
import { wedding } from '../config.js'
import SketchFrame from './SketchFrame.vue'

const altParkingUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('林森公園地下停車場')}`

// 常見問題：q 是問題、a 是回答（寫成陣列就一句一行、前面加圓點），要附連結就加 link
const faqs = [
  {
    q: '捷運站怎麼走比較快？',
    a: [
      '位於捷運中山站。',
      '3 號出口離飯店最近，但只有樓梯。',
      '需要電梯或手扶梯的話，請改走 4 號出口，出站後再步行至飯店。',
    ],
  },
  {
    q: '飯店停車要付費嗎？',
    a: `免費。開車可停放${wedding.venue}專屬地下停車場，車位共 100 個，停滿為止。`,
  },
  {
    q: '飯店停車場滿了，附近有什麼停車場？',
    a: '可改停林森公園地下停車場（需自費），地址是臺北市中山區康樂里南京東路一段35號。',
    link: { href: altParkingUrl, label: '查看停車場資訊' },
  },
]

// 每題各自展開收合，一開始全部收起來
const open = ref(faqs.map(() => false))
</script>

<template>
  <div class="traffic">
    <!-- 跟右邊的常見問題同一種卡片：不描邊的白色手繪底（之前薄荷綠寬邊的相框已經拿掉） -->
    <SketchFrame class="traffic__frame" :seed="60">
      <div class="traffic__venue">
        <p class="traffic__venue-name">
          <a
            v-if="wedding.mapUrl"
            class="traffic__venue-link"
            :href="wedding.mapUrl"
            target="_blank"
            rel="noopener"
            :aria-label="`${wedding.venue}，在 Google 地圖開啟（另開分頁）`"
          >
            {{ wedding.venue }}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="12" />
              <path d="M8.5 15.5l7-7M10 8.5h5.5V14" />
            </svg>
          </a>
          <template v-else>{{ wedding.venue }}</template>
        </p>
        <p class="traffic__venue-address">{{ wedding.address }}</p>

        <div v-if="wedding.mapEmbedUrl" class="traffic__map traffic__map--embed">
          <iframe
            :src="wedding.mapEmbedUrl"
            :title="`${wedding.venue}地圖`"
            allowfullscreen
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
        <div v-else class="traffic__map placeholder">
          <span>地圖</span>
          <span>{{ wedding.venue }}・{{ wedding.address }}</span>
        </div>
      </div>
    </SketchFrame>

    <ul class="faq" data-stretch-column>
      <li v-for="(item, i) in faqs" :key="item.q">
        <SketchFrame class="faq__card" :class="{ 'faq__card--open': open[i] }" :seed="20 + i">
          <h3 class="faq__question">
            <button
              type="button"
              class="faq__toggle"
              :aria-expanded="open[i]"
              :aria-controls="`faq-${i}`"
              @click="open[i] = !open[i]"
            >
              <span class="faq__mark" aria-hidden="true">Q</span>
              <span>{{ item.q }}</span>
              <svg class="faq__arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </h3>
          <!--
            用 grid 的列高從 0fr 變成 1fr 做出展開的動畫，收起來時 visibility: hidden，裡面的連結才不會被 Tab 到。
            data-stretch：背景的風景照收合時的版面畫，展開撐高的部分只把下方的櫻花樹往下移，不會重排
          -->
          <div :id="`faq-${i}`" class="faq__body" data-stretch>
            <div class="faq__body-inner">
              <div class="faq__answer">
                <ul v-if="Array.isArray(item.a)" class="faq__text faq__lines">
                  <li v-for="line in item.a" :key="line">{{ line }}</li>
                </ul>
                <p v-else class="faq__text">{{ item.a }}</p>
                <a v-if="item.link" class="faq__link" :href="item.link.href" target="_blank" rel="noopener">
                  {{ item.link.label }}
                </a>
              </div>
            </div>
          </div>
        </SketchFrame>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.traffic {
  display: grid;
  gap: 16px;
}

.traffic__frame {
  padding: 28px 20px;
}

.traffic__venue {
  text-align: center;
}

/* 飯店名稱跟婚禮資訊裡的一樣用墨色；名稱和地址是這張卡的主角，字放大，地圖只是輔助 */
.traffic__venue-name {
  margin: 0;
  color: #2b2523;
  font-family: var(--font-sans);
  font-size: 26px;
  letter-spacing: 0.1em;
  line-height: 1.3;
}

/*
 * 名稱和外部連結圖示一起是一個連結，名稱照樣用墨色、不加底線。
 * 用 flex 排，名稱和圖示之間的空白才不會算進去，間距照 gap 走（字距已經在最後一個字後面多留一段）
 */
.traffic__venue-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  color: inherit;
  text-decoration: none;
  border-radius: 8px;
}

/* 圖示是一顆實心的藍色圓、中間白色的斜上箭頭；藍色取海漸層下面那一段，白箭頭在上面才看得清楚 */
.traffic__venue-link svg {
  flex: none;
  width: 1.15em;
  height: 1.15em;
}

.traffic__venue-link circle {
  fill: #1e85dc;
  transition: fill 0.2s ease;
}

.traffic__venue-link path {
  fill: none;
  stroke: #fff;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s ease;
}

/* 滑過時圓變深一點，箭頭往右上推一下，表示要跳出去 */
.traffic__venue-link:hover circle {
  fill: #176fbd;
}

.traffic__venue-link:hover path {
  transform: translate(1px, -1px);
}

/* 地址跟名稱一樣用墨色，原本的淡咖啡色在白卡上太淡 */
.traffic__venue-address {
  margin: 8px 0 0;
  color: #2b2523;
  font-size: 17px;
  letter-spacing: 0.05em;
}

.traffic__map {
  flex-direction: column;
  gap: 4px;
  margin-top: 22px;
  aspect-ratio: 4 / 3;
}

/* 地圖不加框線（之前的蠟筆框已經拿掉），只切成圓角，跟白卡片的圓角呼應 */
.traffic__map--embed iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 12px;
}

.faq {
  display: grid;
  gap: 16px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.faq__card {
  padding: 18px 20px;
}

.faq__question {
  font-family: var(--font-sans);
  font-size: 17px;
  letter-spacing: 0.04em;
  line-height: 1.5;
}

.faq__toggle {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 22px;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  /* 題目太長要換行時，優先斷在逗號後面，不要從詞的中間切開；真的放不下才隨處斷 */
  word-break: keep-all;
  overflow-wrap: anywhere;
  cursor: pointer;
}

/* 跟開場大字日期同一套：黃色字加深色外框，外框先畫、填色蓋在上面，框線才不會吃掉黃色 */
.faq__mark {
  color: #ffd65a;
  font-family: 'Fredoka', var(--font-sans);
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  -webkit-text-stroke: 5px #2b2523;
  paint-order: stroke fill;
  filter: url(#paint-sketch-date);
}

.faq__arrow {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.3s ease;
}

.faq__card--open .faq__arrow {
  transform: rotate(180deg);
}

.faq__body {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows 0.3s ease,
    visibility 0.3s;
}

.faq__card--open .faq__body {
  grid-template-rows: 1fr;
  visibility: visible;
}

.faq__body-inner {
  min-height: 0;
  overflow: hidden;
}

/* 題目和回答之間一道手繪的墨線：橫向拉長到整張卡片寬，線寬不跟著縮放 */
.faq__answer {
  margin-top: 16px;
  padding-top: 16px;
  background: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 6' preserveAspectRatio='none'><path d='M1.5 3.4C30 2.2 64 4.2 100 3.1S168 2.3 198.5 3.6' fill='none' stroke='%232b2523' stroke-width='2' stroke-linecap='round' vector-effect='non-scaling-stroke'/></svg>")
    top / 100% 6px no-repeat;
}

.faq__text {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.06em;
  line-height: 2;
}

/*
 * 一句一行的回答：每行前面一顆實心圓點，折到第二行時字跟第一行對齊、不鑽到圓點底下。
 * 圓點用跟飯店連結圖示同一個藍，對準第一行的中線（行高 2，一半就是 1em）
 */
.faq__lines {
  padding: 0;
  list-style: none;
}

.faq__lines li {
  position: relative;
  padding-left: 1.1em;
}

.faq__lines li::before {
  content: '';
  position: absolute;
  top: calc(1em - 0.2em);
  left: 0.05em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: #1e85dc;
}

.faq__link {
  display: inline-block;
  margin-top: 4px;
  color: var(--accent-deep);
  font-size: 14px;
  font-weight: 500;
  text-underline-offset: 3px;
}

@media (min-width: 768px) {
  .traffic__frame {
    padding: 40px;
  }

  .traffic__venue-name {
    font-size: 32px;
  }

  .traffic__venue-address {
    margin-top: 10px;
    font-size: 20px;
  }

  /* 地圖不撐滿整張卡，收窄置中，左右留白讓上面的名稱和地址更顯眼 */
  .traffic__map {
    max-width: 600px;
    margin: 28px auto 0;
    aspect-ratio: 16 / 9;
  }

  .faq {
    gap: 20px;
  }

  .faq__card {
    padding: 26px 40px;
  }

  .faq__question {
    font-size: 20px;
    letter-spacing: 0.06em;
  }

  .faq__toggle,
  .faq__answer {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 14px;
  }

  .faq__toggle {
    grid-template-columns: 42px minmax(0, 1fr) 24px;
  }

  .faq__mark {
    font-size: 44px;
  }

  .faq__answer {
    margin-top: 20px;
    padding-top: 20px;
  }

  .faq__text {
    font-size: 16px;
  }
}

/*
 * 桌機：地圖和常見問題左右兩欄並排、上緣對齊，展開常見問題時只有右邊那欄變長。
 * 地圖只佔半邊，撐滿卡片寬、改回 4:3，不然太扁；常見問題的卡片變窄，左右留白跟著收
 */
@media (min-width: 1024px) {
  .traffic {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 24px;
  }

  .traffic__frame {
    padding: 32px 28px;
  }

  .traffic__map {
    max-width: none;
    margin-top: 24px;
    aspect-ratio: 4 / 3;
  }

  .faq {
    margin: 0;
    gap: 16px;
  }

  .faq__card {
    padding: 22px 28px;
  }
}
</style>
