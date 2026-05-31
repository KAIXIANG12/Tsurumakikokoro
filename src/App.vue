<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { MapPin, Search } from "@lucide/vue";
import gsap from "gsap";
import {
  initialSupportLocations,
  categoryLabels,
  statusLabels,
  type SupportCategory,
  type SupportLocation
} from "./data/locations";
import { listSupportLocations } from "./services/locationApi";

type FilterKey = "all" | SupportCategory;

const backgroundPortrait = `${import.meta.env.BASE_URL}kokoro-10th.webp`;
const foregroundPortrait = `${import.meta.env.BASE_URL}kokoro-10th.webp`;
const birthdayAt = new Date("2026-08-08T00:00:00+08:00").getTime();
const now = ref(Date.now());
const locations = ref<SupportLocation[]>(initialSupportLocations);
const activeFilter = ref<FilterKey>("all");
const keyword = ref("");
const selectedId = ref(initialSupportLocations[0]?.id ?? "");
const mapSection = ref<HTMLElement | null>(null);
const heroSection = ref<HTMLElement | null>(null);
const mapContainer = ref<HTMLDivElement | null>(null);
const mapStatus = ref("正在准备地图");
const heroTilt = ref({ x: 0, y: 0 });
const scrollDepth = ref(0);
const activePanel = ref(0);
let ticker: number | undefined;
let scrollFrame = 0;
let touchStartY = 0;
let orientationFrame = 0;
let pendingOrientation: DeviceOrientationEvent | null = null;
let panelLock = false;
let motionPermissionTried = false;
let motionReady = false;

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

type AMapLngLat = [number, number];
type AMapMap = {
  add(marker: unknown): void;
  clearMap(): void;
  destroy(): void;
  setCenter(position: AMapLngLat): void;
  setZoom(zoom: number): void;
};
type AMapMarker = unknown;
type AMapGeocoder = {
  getLocation(
    address: string,
    callback: (status: string, result: { geocodes?: Array<{ location: { lng: number; lat: number } }> }) => void
  ): void;
};
type AMapNamespace = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Geocoder: new (options?: Record<string, unknown>) => AMapGeocoder;
};
type AMapLoaderNamespace = {
  load(options: {
    key: string;
    version: string;
    plugins?: string[];
  }): Promise<AMapNamespace>;
};

declare global {
  interface Window {
    AMap?: AMapNamespace;
    AMapLoader?: AMapLoaderNamespace;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

let amapLoader: Promise<AMapNamespace | null> | null = null;
let amapMap: AMapMap | null = null;
let amapGeocoder: AMapGeocoder | null = null;

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

const totalLocations = computed(() => locations.value.length);

const filteredLocations = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  return locations.value.filter((item) => {
    const matchesFilter = activeFilter.value === "all" || item.category === activeFilter.value;
    const matchesKeyword =
      !word ||
      [
        item.name,
        item.province,
        item.city,
        item.address,
        item.dateLabel,
        item.timeLabel,
        item.highlight ?? "",
        categoryLabels[item.category],
        statusLabels[item.status],
        ...(item.searchKeywords ?? [])
      ]
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

function loadAMapLoader() {
  if (window.AMapLoader) return Promise.resolve(window.AMapLoader);

  return new Promise<AMapLoaderNamespace | null>((resolve) => {
    const existed = document.querySelector<HTMLScriptElement>("script[data-amap-loader]");
    if (existed) {
      existed.addEventListener("load", () => resolve(window.AMapLoader ?? null), { once: true });
      existed.addEventListener("error", () => resolve(null), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.dataset.amapLoader = "true";
    script.src = "https://webapi.amap.com/loader.js";
    script.async = true;
    script.onload = () => resolve(window.AMapLoader ?? null);
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
}

function loadAMap() {
  if (amapLoader) return amapLoader;
  const key = import.meta.env.VITE_AMAP_KEY as string | undefined;
  if (!key) {
    mapStatus.value = "未配置高德地图 Key，当前显示点位信息占位。";
    return Promise.resolve(null);
  }

  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined;
  if (securityCode) {
    window._AMapSecurityConfig = {
      securityJsCode: securityCode
    };
  }

  amapLoader = loadAMapLoader()
    .then((loader) => {
      if (!loader) {
        mapStatus.value = "高德 Loader 加载失败，当前显示点位信息占位。";
        return null;
      }

      return loader.load({
        key,
        version: "2.0",
        plugins: ["AMap.Geocoder", "AMap.Scale"]
      });
    })
    .catch((error) => {
      console.warn(error);
      mapStatus.value = "高德地图加载失败，当前显示点位信息占位。";
      return null;
    });

  return amapLoader;
}

async function resolveLocationCoordinate(location: SupportLocation): Promise<AMapLngLat | null> {
  if (typeof location.longitude === "number" && typeof location.latitude === "number") {
    return [location.longitude, location.latitude];
  }

  const AMap = await loadAMap();
  if (!AMap) return null;
  amapGeocoder ??= new AMap.Geocoder({ city: location.city || location.province });

  return new Promise((resolve) => {
    amapGeocoder?.getLocation(location.address, (status, result) => {
      const matched = status === "complete" ? result.geocodes?.[0]?.location : null;
      resolve(matched ? [matched.lng, matched.lat] : null);
    });
  });
}

async function renderSelectedOnMap() {
  const container = mapContainer.value;
  const selected = selectedLocation.value;
  if (!container || !selected) return;

  const AMap = await loadAMap();
  if (!AMap) return;

  amapMap ??= new AMap.Map(container, {
    center: [121.4737, 31.2304],
    zoom: 15,
    viewMode: "2D"
  });

  const coordinate = await resolveLocationCoordinate(selected);
  if (!coordinate) {
    mapStatus.value = "地图 API 暂未匹配到该地址，请在后台补充经纬度。";
    return;
  }

  amapMap.clearMap();
  amapMap.setCenter(coordinate);
  amapMap.setZoom(17);
  amapMap.add(
    new AMap.Marker({
      position: coordinate,
      title: selected.name
    })
  );
  mapStatus.value = `已匹配：${selected.name}`;
}

function goToPanel(index: number) {
  if (index < 0 || index > 1) return;

  const targetIndex = index;
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
  if (event.deltaY > 0 && activePanel.value === 1) return;
  if (event.deltaY < 0 && activePanel.value === 1 && window.scrollY > window.innerHeight + 24) return;
  if (event.deltaY < 0 && activePanel.value === 0) return;

  event.preventDefault();
  goToPanel(event.deltaY > 0 ? activePanel.value + 1 : activePanel.value - 1);
}

function onTouchStart(event: TouchEvent) {
  touchStartY = event.touches[0]?.clientY ?? 0;
  void requestMotionAccess();
}

function onTouchEnd(event: TouchEvent) {
  const endY = event.changedTouches[0]?.clientY ?? touchStartY;
  const delta = touchStartY - endY;
  if (Math.abs(delta) < 42) return;

  if (activePanel.value === 0 && delta > 0) {
    goToPanel(1);
    return;
  }

  if (activePanel.value === 1 && delta < 0 && window.scrollY <= window.innerHeight + 24) {
    goToPanel(0);
  }
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

function resetTilt() {
  heroTilt.value = { x: 0, y: 0 };
}

async function requestMotionAccess() {
  if (motionPermissionTried || typeof DeviceOrientationEvent === "undefined") return;
  motionPermissionTried = true;

  const orientationEvent = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
  if (typeof orientationEvent.requestPermission !== "function") {
    motionReady = true;
    return;
  }

  try {
    motionReady = (await orientationEvent.requestPermission()) === "granted";
  } catch {
    motionReady = false;
  }
}

function onDeviceOrientation(event: DeviceOrientationEvent) {
  if (!motionReady && typeof (DeviceOrientationEvent as DeviceOrientationEventWithPermission).requestPermission === "function") {
    return;
  }

  if (activePanel.value !== 0) return;
  pendingOrientation = event;
  if (orientationFrame) return;

  orientationFrame = window.requestAnimationFrame(() => {
    const gamma = pendingOrientation?.gamma ?? 0;
    const beta = pendingOrientation?.beta ?? 0;
    heroTilt.value = {
      x: Math.max(-10, Math.min(10, gamma * 0.45)),
      y: Math.max(-8, Math.min(8, (beta - 45) * -0.18))
    };
    pendingOrientation = null;
    orientationFrame = 0;
  });
}

function updateScrollDepth() {
  const depth = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
  scrollDepth.value = Number(depth.toFixed(3));
  activePanel.value = depth > 0.5 ? 1 : 0;
}

function syncViewportHeight() {
  const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
  document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`);
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

watch(selectedLocation, () => {
  void renderSelectedOnMap();
});

onMounted(async () => {
  ticker = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
  motionReady =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as DeviceOrientationEventWithPermission).requestPermission !== "function";
  syncViewportHeight();
  updateScrollDepth();
  window.addEventListener("resize", syncViewportHeight, { passive: true });
  window.visualViewport?.addEventListener("resize", syncViewportHeight, { passive: true });
  window.visualViewport?.addEventListener("scroll", syncViewportHeight, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("deviceorientation", onDeviceOrientation);
  window.addEventListener("deviceorientationabsolute", onDeviceOrientation as EventListener);

  locations.value = await listSupportLocations();
  if (!locations.value.some((location) => location.id === selectedId.value)) {
    selectedId.value = locations.value[0]?.id ?? "";
  }
  await nextTick();
  await renderSelectedOnMap();

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
  if (orientationFrame) window.cancelAnimationFrame(orientationFrame);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", syncViewportHeight);
  window.visualViewport?.removeEventListener("resize", syncViewportHeight);
  window.visualViewport?.removeEventListener("scroll", syncViewportHeight);
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("touchend", onTouchEnd);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("deviceorientation", onDeviceOrientation);
  window.removeEventListener("deviceorientationabsolute", onDeviceOrientation as EventListener);
  amapMap?.destroy();
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
      @pointerdown="requestMotionAccess"
      @pointermove="onHeroPointerMove"
      @pointerleave="resetTilt"
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
            <div
              v-for="unit in countdown"
              :key="unit.label"
              class="count-cell"
              :data-value="String(unit.value).padStart(2, '0')"
            >
              <strong class="count-value" aria-hidden="true">
                <span
                  v-for="(digit, digitIndex) in String(unit.value).padStart(2, '0')"
                  :key="`${unit.label}-${digitIndex}-${digit}`"
                  class="digit-card"
                >
                  {{ digit }}
                </span>
              </strong>
              <span class="sr-only">{{ String(unit.value).padStart(2, "0") }}</span>
              <span class="count-label">{{ unit.label }}</span>
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
      </div>

      <div class="map-toolbar">
        <label class="search-box">
          <Search :size="17" />
          <input v-model="keyword" type="search" placeholder="搜索后台点位、城市、地址或备注" />
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
          <div class="amap-board" aria-label="高德地图点位">
            <div ref="mapContainer" class="amap-canvas" />
            <p class="map-status">{{ mapStatus }}</p>
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
            <strong>{{ filteredLocations.length }} / {{ totalLocations }}</strong>
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
