<script setup lang="ts">
import { computed } from 'vue';

interface Advert {
  id: number;
  timestamp: number;
  pubkey: string;
  node_name: string | null;
  is_repeater: boolean;
  route_type: number | null;
  contact_type: string;
  latitude: number | null;
  longitude: number | null;
  first_seen: number;
  last_seen: number;
  rssi: number | null;
  snr: number | null;
  advert_count: number;
  is_new_neighbor: boolean;
}

interface Props {
  advertsByType: Record<string, Advert[]>;
}

const props = defineProps<Props>();

// Statistics
const totalNodes = computed(() => {
  return Object.values(props.advertsByType).reduce((sum, adverts) => sum + adverts.length, 0);
});

const nodesWithLocation = computed(() => {
  return Object.values(props.advertsByType)
    .flat()
    .filter((advert) => advert.latitude !== null && advert.longitude !== null).length;
});

const averageRSSI = computed(() => {
  const allAdverts = Object.values(props.advertsByType).flat();
  const validRSSI = allAdverts.filter((advert) => advert.rssi !== null);

  if (validRSSI.length === 0) return 'N/A';

  const sum = validRSSI.reduce((sum, advert) => sum + advert.rssi!, 0);
  return `${(sum / validRSSI.length).toFixed(1)} dBm`;
});

const activeNodes24h = computed(() => {
  const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  return Object.values(props.advertsByType)
    .flat()
    .filter((advert) => advert.last_seen >= oneDayAgo).length;
});

const routeTypeDistribution = computed(() => {
  const allAdverts = Object.values(props.advertsByType).flat();
  const distribution = { direct: 0, internet: 0, lora: 0, mqtt: 0, unknown: 0 };

  allAdverts.forEach((advert) => {
    switch (advert.route_type) {
      case 1:
        distribution.direct++;
        break;
      case 2:
        distribution.internet++;
        break;
      case 3:
        distribution.lora++;
        break;
      case 4:
        distribution.mqtt++;
        break;
      default:
        distribution.unknown++;
        break;
    }
  });

  return distribution;
});
</script>

<template>
  <div class="bg-dark-card/30 backdrop-blur border border-white/10 rounded-[15px] p-6">
    <h2 class="text-white text-lg font-semibold mb-4">Network Statistics</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Nodes -->
      <div class="bg-background/50 rounded-lg p-4">
        <div class="text-2xl font-bold text-white mb-1">{{ totalNodes }}</div>
        <div class="text-content-muted text-sm">Total Nodes</div>
      </div>

      <!-- Nodes with Location -->
      <div class="bg-background/50 rounded-lg p-4">
        <div class="text-2xl font-bold text-accent-green mb-1">{{ nodesWithLocation }}</div>
        <div class="text-content-muted text-sm">With Location</div>
      </div>

      <!-- Average RSSI -->
      <div class="bg-background/50 rounded-lg p-4">
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
          {{ averageRSSI }}
        </div>
        <div class="text-content-muted text-sm">Avg Signal</div>
      </div>

      <!-- Active Nodes (24h) -->
      <div class="bg-background/50 rounded-lg p-4">
        <div class="text-2xl font-bold text-secondary mb-1">{{ activeNodes24h }}</div>
        <div class="text-content-muted text-sm">Active (24h)</div>
      </div>
    </div>

    <!-- Route Type Distribution -->
    <div v-if="totalNodes > 0" class="mt-6">
      <h3 class="text-white font-medium mb-3">Route Types</h3>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-secondary rounded-full"></div>
          <span class="text-content-muted">Direct: {{ routeTypeDistribution.direct }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-accent-green rounded-full"></div>
          <span class="text-content-muted">Internet: {{ routeTypeDistribution.internet }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
          <span class="text-content-muted">LoRa: {{ routeTypeDistribution.lora }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-accent-purple rounded-full"></div>
          <span class="text-content-muted">MQTT: {{ routeTypeDistribution.mqtt }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span class="text-content-muted">Unknown: {{ routeTypeDistribution.unknown }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
