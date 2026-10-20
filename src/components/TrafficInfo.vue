<script setup>
import { ref } from 'vue'
import { wedding } from '../config.js'
import SketchFrame from './SketchFrame.vue'

const altParkingUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('林森公園地下停車場')}`

// 常見問題：q 是問題、a 是回答，要附連結就加 link
const faqs = [
  {
    q: '捷運站怎麼走比較快？',
    a: '請搭到捷運中山站。3 號出口離飯店最近，但出口只有樓梯；需要電梯或手扶梯的話，請改走 4 號出口，出站後再步行至飯店。',
  },
  {
    q: '飯店停車要付費嗎？',
    a: `不用。開車可停放${wedding.venue}專屬地下停車場，車位共 100 個，停滿為止。`,
  },
  {
    q: '停車場滿了，附近有什麼停車場？',
    a: '可改停林森公園地下停車場（需自費），地址是臺北市中山區康樂里南京東路一段35號。',
    link: { href: altParkingUrl, label: '查看停車場資訊' },
  },
]

// 每題各自展開收合，一開始全部收起來
const open = ref(faqs.map(() => false))
</script>

<template>
  <h2 class="section__title">
    <span class="section__title-en">ACCESS</span>
    <span class="section__title-zh">交通與停車</span>
  </h2>
  <div class="traffic">
    <!-- 雙層框：外層薄荷綠底，裡面再包一層白底卡片，兩層都描深色邊 -->
    <div class="traffic__frame">
      <div class="traffic__venue">
        <p class="traffic__venue-name">{{ wedding.venue }}</p>
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
    </div>

    <ul class="faq">
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
          <!-- 用 grid 的列高從 0fr 變成 1fr 做出展開的動畫，收起來時 visibility: hidden，裡面的連結才不會被 Tab 到 -->
          <div :id="`faq-${i}`" class="faq__body">
            <div class="faq__body-inner">
              <div class="faq__answer">
                <span class="faq__mark" aria-hidden="true">A</span>
                <div>
                  <p class="faq__text">{{ item.a }}</p>
                  <a v-if="item.link" class="faq__link" :href="item.link.href" target="_blank" rel="noopener">
                    {{ item.link.label }}
                  </a>
                </div>
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
  padding: 10px;
  border: 2px solid var(--text);
  border-radius: 26px;
  background: #d6f1e3;
}

.traffic__venue {
  padding: 28px 18px 18px;
  border: 2px solid var(--text);
  border-radius: 18px;
  background: var(--surface);
  text-align: center;
}

.traffic__venue-name {
  margin: 0;
  color: var(--rose-gold-deep);
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.traffic__venue-address {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 15px;
  letter-spacing: 0.05em;
}

.traffic__map {
  flex-direction: column;
  gap: 4px;
  margin-top: 22px;
  aspect-ratio: 4 / 3;
}

.traffic__map--embed {
  overflow: hidden;
  border: 2px solid var(--text);
  border-radius: 10px;
  background: var(--surface);
}

.traffic__map--embed iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
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

/* 題目、回答前面的 Q、A 佔同一欄寬，題目和回答的字才會左右對齊 */
.faq__toggle,
.faq__answer {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
}

.faq__toggle {
  grid-template-columns: 32px minmax(0, 1fr) 22px;
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

.faq__mark {
  font-family: 'Fredoka', var(--font-sans);
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
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

.faq__answer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid var(--text);
}

.faq__answer .faq__mark {
  margin-top: -2px;
}

.faq__text {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.06em;
  line-height: 2;
}

.faq__link {
  display: inline-block;
  margin-top: 4px;
  color: var(--rose-gold-deep);
  font-size: 14px;
  font-weight: 500;
  text-underline-offset: 3px;
}

@media (min-width: 768px) {
  .traffic__frame {
    padding: 16px;
    border-radius: 32px;
  }

  .traffic__venue {
    padding: 40px;
    border-radius: 22px;
  }

  .traffic__map {
    margin-top: 28px;
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
</style>
