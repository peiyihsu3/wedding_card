<script setup>
import { wedding } from '../config.js'
</script>

<template>
  <header class="hero">
    <p class="hero__eyebrow">WEDDING INVITATION</p>
    <h1 class="hero__names">
      {{ wedding.groom }}
      <span class="hero__amp">&amp;</span>
      {{ wedding.bride }}
    </h1>
    <p class="hero__greeting">{{ wedding.greeting }}</p>

    <hr class="divider" />

    <dl class="hero__info">
      <div>
        <dt>日期</dt>
        <dd>{{ wedding.date }}</dd>
      </div>
      <div>
        <dt>時間</dt>
        <dd>{{ wedding.time }}</dd>
      </div>
      <div>
        <dt>地點</dt>
        <dd>
          {{ wedding.venue }}
          <span class="hero__address">
            <a v-if="wedding.mapUrl" :href="wedding.mapUrl" target="_blank" rel="noopener">
              {{ wedding.address }}
            </a>
            <template v-else>{{ wedding.address }}</template>
          </span>
        </dd>
      </div>
    </dl>

    <div class="hero__cta">
      <a class="btn" href="#rsvp">立即回覆</a>
    </div>
  </header>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 16px 0 0;
}

.hero__eyebrow {
  margin: 0 0 12px;
  color: var(--rose-gold);
  font-size: 12px;
  letter-spacing: 0.3em;
}

.hero__names {
  font-size: 32px;
  letter-spacing: 0.08em;
}

.hero__amp {
  display: block;
  margin: 4px 0;
  color: var(--rose-gold);
  font-size: 0.7em;
  font-style: italic;
}

.hero__greeting {
  margin: 16px auto 0;
  max-width: 28em;
  color: var(--text-muted);
}

.hero__info {
  display: grid;
  gap: 12px;
  margin: 0;
}

.hero__info dt {
  color: var(--rose-gold);
  font-size: 13px;
  letter-spacing: 0.2em;
}

.hero__info dd {
  margin: 0;
}

.hero__address {
  display: block;
  color: var(--text-muted);
  font-size: 14px;
}

.hero__address a {
  color: inherit;
  text-underline-offset: 3px;
}

.hero__cta {
  margin-top: 24px;
}

@media (min-width: 768px) {
  .hero__names {
    font-size: 40px;
  }

  .hero__amp {
    display: inline;
    margin: 0 12px;
  }
}

@media (min-width: 1024px) {
  .hero__names {
    font-size: 44px;
  }
}
</style>
