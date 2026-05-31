<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { MapPin, Search } from "@lucide/vue";
import gsap from "gsap";
import {
  categoryLabels,
  statusLabels,
  supportLocations,
  type SupportCategory,
  type SupportLocation
} from "./data/locations";

type FilterKey = "all" | SupportCategory;

const backgroundPortrait = `${import.meta.env.BASE_URL}kokoro-10th.webp`;
const foregroundPortrait = `${import.meta.env.BASE_URL}kokoro-10th.webp`;
const birthdayAt = new Date("2026-08-08T00:00:00+08:00").getTime();
const now = ref(Date.now());
const activeFilter = ref<FilterKey>("all");
const keyword = ref("");
const selectedId = ref(supportLocations[0]?.id ?? "");
const mapSection = ref<HTMLElement | null>(null);
const heroSection = ref<HTMLElement | null>(null);
const heroTilt = ref({ x: 0, y: 0 });
const scrollDepth = ref(0);
const activePanel = ref(0);
let ticker: number | undefined;
let scrollFrame = 0;
let touchStartY = 0;
let panelLock = false;

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "screen", label: "大屏" },
  { key: "cafe", label: "生咖" },
  { key: "goods", label: "无料" },
  { key: "event", label: "线下" }
];

const countdown = computed(() => {
  const rest = Math.max(0, birthdayAt - now.value);
  const totalSeconds = Math.floor(rest / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "DAYS", value: days },
    { label: "HOURS", value: hours },
    { label: "MIN", value: minutes },
    { label: "SEC", value: seconds }
  ];
});

const filteredLocations = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  return supportLocations.filter((item) => {
    const matchesFilter = activeFilter.value === "all" || item.category === activeFilter.value;
    const matchesKeyword =
      !word ||
      [item.name, item.province, item.city, item.address, item.highlight ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(word);
    return matchesFilter && matchesKeyword;
  });
});

const selectedLocation = computed<SupportLocation | null>(() => {
  return filteredLocations.value.find((item) => item.id === selectedId.value) ?? null;
});

const heroExit = computed(() => Math.min(1, scrollDepth.value * 1.25));
const mapEnter = computed(() => Math.min(1, Math.max(0, (scrollDepth.value - 0.42) * 1.72)));

function selectLocation(id: string) {
  selectedId.value = id;
}

function goToPanel(index: number) {
  const targetIndex = Math.max(0, Math.min(1, index));
  const target = targetIndex === 0 ? heroSection.value : mapSection.value;
  if (!target || panelLock) return;

  panelLock = true;
  activePanel.value = targetIndex;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    panelLock = false;
  }, 760);
}

function onWheel(event: WheelEvent) {
  if (Math.abs(event.deltaY) < 12) return;
  event.preventDefault();
  goToPanel(event.deltaY > 0 ? activePanel.value + 1 : activePanel.value - 1);
}

function onTouchStart(event: TouchEvent) {
  touchStartY = event.touches[0]?.clientY ?? 0;
}

function onTouchEnd(event: TouchEvent) {
  const endY = event.changedTouches[0]?.clientY ?? touchStartY;
  const delta = touchStartY - endY;
  if (Math.abs(delta) < 42) return;
  goToPanel(delta > 0 ? activePanel.value + 1 : activePanel.value - 1);
}

function onKeyDown(event: KeyboardEvent) {
  if (["ArrowDown", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    goToPanel(activePanel.value + 1);
  }
  if (["ArrowUp", "PageUp"].includes(event.key)) {
    event.preventDefault();
    goToPanel(activePanel.value - 1);
  }
}

function updateTilt(clientX: number, clientY: number, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  heroTilt.value = {
    x: ((clientX - rect.left) / rect.width - 0.5) * 16,
    y: ((clientY - rect.top) / rect.height - 0.5) * -14
  };
}

function onHeroPointerMove(event: PointerEvent) {
  updateTilt(event.clientX, event.clientY, event.currentTarget as HTMLElement);
}

function onHeroTouchMove(event: TouchEvent) {
  const touch = event.touches[0];
  if (!touch) return;
  updateTilt(touch.clientX, touch.clientY, event.currentTarget as HTMLElement);
}

function resetTilt() {
  heroTilt.value = { x: 0, y: 0 };
}

function onDeviceOrientation(event: DeviceOrientationEvent) {
  const gamma = event.gamma ?? 0;
  const beta = event.beta ?? 0;
  heroTilt.value = {
    x: Math.max(-10, Math.min(10, gamma * 0.45)),
    y: Math.max(-8, Math.min(8, (beta - 45) * -0.18))
  };
}

function updateScrollDepth() {
  const depth = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
  scrollDepth.value = Number(depth.toFixed(3));
  activePanel.value = depth > 0.5 ? 1 : 0;
}

function onScroll() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    updateScrollDepth();
    scrollFrame = 0;
  });
}

watch(filteredLocations, (locations) => {
  if (locations.length === 0) {
    selectedId.value = "";
    return;
  }

  if (!locations.some((location) => location.id === selectedId.value)) {
    selectedId.value = locations[0].id;
  }
});

onMounted(async () => {
  ticker = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
  updateScrollDepth();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("deviceorientation", onDeviceOrientation);

  await nextTick();
  gsap.from(".countdown-hero .split-line", {
    yPercent: 120,
    opacity: 0,
    stagger: 0.08,
    duration: 0.9,
    ease: "expo.out"
  });
});

onBeforeUnmount(() => {
  if (ticker) window.clearInterval(ticker);
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("touchend", onTouchEnd);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("deviceorientation", onDeviceOrientation);
});
</script>

<template>
  <main
    class="site-shell"
    :style="{
      '--tilt-x': `${heroTilt.y}deg`,
      '--tilt-y': `${heroTilt.x}deg`,
      '--scroll-depth': scrollDepth,
      '--hero-exit': heroExit,
      '--map-enter': mapEnter
    }"
  >
    <div class="character-backdrop" aria-hidden="true">
      <img :src="backgroundPortrait" alt="" />
    </div>
    <section
      ref="heroSection"
      class="countdown-hero"
      @pointermove="onHeroPointerMove"
      @pointerleave="resetTilt"
      @touchmove.passive="onHeroTouchMove"
      @touchend="resetTilt"
    >
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="kicker split-line">Kokoro Birthday Project · 08.08</p>
          <h1>
            <span class="split-line title-small">距离</span>
            <span class="split-line title-name-row"><em>弦巻 こころ</em><small>诞生日</small></span>
            <span class="split-line title-small">还有</span>
          </h1>

          <div class="countdown-board" aria-label="生日倒计时">
            <div v-for="unit in countdown" :key="unit.label" class="count-cell">
              <strong>{{ String(unit.value).padStart(2, "0") }}</strong>
              <span>{{ unit.label }}</span>
            </div>
          </div>
        </div>

        <div class="foreground-portrait" aria-label="弦卷心前景立绘占位">
          <img :src="foregroundPortrait" alt="弦卷心前景立绘占位" />
          <div class="portrait-tag">
            <span>I.</span>
            <strong>Portrait Slot</strong>
          </div>
        </div>
      </div>
      <button class="panel-arrow" type="button" aria-label="进入应援地图" @click="goToPanel(1)">
        <span />
      </button>
    </section>

    <section ref="mapSection" class="support-map-section" aria-labelledby="map-title">
      <div class="chapter-head">
        <p>II / The Map</p>
        <h2 id="map-title">应援地图</h2>
        <span>点位、状态、时间与备注集中在这里。移动端先看列表，桌面端地图和索引并排。</span>
      </div>

      <div class="map-toolbar">
        <label class="search-box">
          <Search :size="17" />
          <input v-model="keyword" type="search" placeholder="搜索城市、点位或地址" />
        </label>

        <div class="filter-tabs" aria-label="点位类型筛选">
          <button
            v-for="filter in filters"
            :key="filter.key"
            :class="{ active: activeFilter === filter.key }"
            type="button"
            @click="activeFilter = filter.key"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <div class="map-shell">
        <div class="atlas-panel">
          <div class="atlas-board" aria-label="应援点位示意地图">
            <div class="atlas-grain" />
            <div class="route-line route-a" />
            <div class="route-line route-b" />
            <button
              v-for="location in filteredLocations"
              :key="location.id"
              class="map-dot"
              :class="[location.category, location.status, { selected: selectedId === location.id }]"
              :style="{ left: `${location.x}%`, top: `${location.y}%` }"
              type="button"
              :aria-label="`${location.city} ${location.name}`"
              @click="selectLocation(location.id)"
            >
              <span />
            </button>
          </div>

          <article v-if="selectedLocation" class="selected-card">
            <span class="status-pill" :class="selectedLocation.status">
              {{ statusLabels[selectedLocation.status] }}
            </span>
            <h3>{{ selectedLocation.name }}</h3>
            <p class="selected-place">
              <MapPin :size="14" />
              {{ selectedLocation.province }} · {{ selectedLocation.city }}
            </p>
            <dl>
              <div>
                <dt>TIME</dt>
                <dd>{{ selectedLocation.dateLabel }} {{ selectedLocation.timeLabel }}</dd>
              </div>
              <div>
                <dt>ADDRESS</dt>
                <dd>{{ selectedLocation.address }}</dd>
              </div>
              <div v-if="selectedLocation.highlight">
                <dt>NOTE</dt>
                <dd>{{ selectedLocation.highlight }}</dd>
              </div>
            </dl>
          </article>
          <article v-else class="selected-card empty-card">
            <h3>没有匹配点位</h3>
            <p>换一个关键词，或切回“全部”。</p>
          </article>
        </div>

        <aside class="location-index" aria-label="点位索引">
          <div class="index-head">
            <span>Index</span>
            <strong>{{ filteredLocations.length }} / {{ supportLocations.length }}</strong>
          </div>
          <button
            v-for="(location, index) in filteredLocations"
            :key="location.id"
            class="location-item"
            :class="{ active: selectedId === location.id }"
            type="button"
            @click="selectLocation(location.id)"
          >
            <span class="item-number">{{ String(index + 1).padStart(2, "0") }}</span>
            <span class="item-main">
              <strong>{{ location.name }}</strong>
              <small>{{ location.city }} · {{ categoryLabels[location.category] }}</small>
            </span>
            <span class="item-status" :class="location.status">{{ statusLabels[location.status] }}</span>
          </button>
          <p v-if="filteredLocations.length === 0" class="empty-list">当前筛选下暂无点位。</p>
        </aside>
      </div>
    </section>

    <section id="blessings" class="small-blessing" aria-labelledby="blessing-title">
      <p>III / Tiny Blessing</p>
      <blockquote id="blessing-title">让世界和你都充满笑容。</blockquote>
    </section>
  </main>
</template>
