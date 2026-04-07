<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import ApiService from '@/utils/api';
import { usePacketStore } from '@/stores/packets';
import { useSystemStore } from '@/stores/system';

defineOptions({ name: 'PerformanceChart' });

const packetStore = usePacketStore();
const systemStore = useSystemStore();

interface DataPoint {
  time: string;
  rxPackets: number;
  txPackets: number;
}

interface Packet {
  timestamp: number;
  transmitted: number | boolean;
  type: number;
}

const chartRef = ref<HTMLCanvasElement | null>(null);
const chartData = ref<DataPoint[]>([]);
const updateInterval = ref<number | null>(null);
const isLoading = ref(true);

// Uptime-aware rate calculations
const uptimeBasedRates = computed(() => {
  const uptimeSeconds = systemStore.stats?.uptime_seconds || 0;
  const totalRx = packetStore.packetStats?.total_packets || 0;
  const totalTx = packetStore.packetStats?.transmitted_packets || 0;

  // Convert uptime to hours, minimum 6 minutes (0.1 hours) to avoid division by zero
  const uptimeHours = Math.max(uptimeSeconds / 3600, 0.1);

  // Determine if we should show per-minute or per-hour rates
  const showMinuteRates = uptimeHours < 1;

  if (showMinuteRates) {
    const uptimeMinutes = Math.max(uptimeSeconds / 60, 1);
    return {
      rxRate: {
        value: Math.round((totalRx / uptimeMinutes) * 100) / 100,
        label: uptimeHours < 0.5 ? 'RX/min (early)' : 'RX/min',
      },
      txRate: {
        value: Math.round((totalTx / uptimeMinutes) * 100) / 100,
        label: uptimeHours < 0.5 ? 'TX/min (early)' : 'TX/min',
      },
      confidence: 'low',
    };
  } else {
    // Show hourly rates with uptime context
    const rxPerHour = Math.round((totalRx / uptimeHours) * 100) / 100;
    const txPerHour = Math.round((totalTx / uptimeHours) * 100) / 100;

    let label: string;
    let confidence: 'low' | 'medium' | 'high';

    if (uptimeHours < 6) {
      label = `RX/hr (${Math.round(uptimeHours)}h)`;
      confidence = 'medium';
    } else if (uptimeHours < 24) {
      label = `RX/hr (${Math.round(uptimeHours)}h)`;
      confidence = 'high';
    } else {
      label = 'RX/hr';
      confidence = 'high';
    }

    return {
      rxRate: { value: rxPerHour, label: label },
      txRate: { value: txPerHour, label: label.replace('RX', 'TX') },
      confidence,
    };
  }
});

// Fetch packet data and aggregate into chart format
const fetchChartData = async () => {
  try {
    isLoading.value = true;
    const response = await ApiService.get('/recent_packets', { limit: 50 });

    if (!response.success) {
      chartData.value = [];
      isLoading.value = false;
      nextTick(() => {
        drawChart();
      });
      return;
    }

    // Create time-based aggregation from recent packets
    const packets = (response.data as Packet[]) || [];
    const now = Date.now();
    const hoursBack = 24;
    const timeSlots = 12; // 2-hour slots over 24 hours
    const slotDuration = (hoursBack * 60 * 60 * 1000) / timeSlots;

    const aggregatedData: DataPoint[] = [];

    for (let i = 0; i < timeSlots; i++) {
      const slotStart = now - hoursBack * 60 * 60 * 1000 + i * slotDuration;
      const slotEnd = slotStart + slotDuration;

      const packetsInSlot = packets.filter((p: Packet) => {
        const packetTime = p.timestamp * 1000; // Convert to milliseconds
        return packetTime >= slotStart && packetTime < slotEnd;
      });

      const rxCount = packetsInSlot.filter((p: Packet) => !p.transmitted).length;
      const txCount = packetsInSlot.filter((p: Packet) => p.transmitted).length;

      aggregatedData.push({
        time: new Date(slotStart + slotDuration / 2).toISOString(),
        rxPackets: rxCount,
        txPackets: txCount,
      });
    }

    chartData.value = aggregatedData;
    isLoading.value = false;
    nextTick(() => {
      drawChart();
    });
  } catch {
    chartData.value = [];
    isLoading.value = false;
    nextTick(() => {
      drawChart();
    });
  }
};

interface Packet {
  timestamp: number;
  transmitted: number | boolean;
  type: number;
}

const drawChart = () => {
  if (!chartRef.value) return;

  const canvas = chartRef.value;
  // Use willReadFrequently to optimize canvas reads on Firefox
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  // Get the container dimensions
  const container = canvas.parentElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  // Cap devicePixelRatio at 2 to reduce GPU load on Retina displays
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Set canvas size to match container exactly
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(pixelRatio, pixelRatio);

  const padding = 20; // Back to normal padding for proper spacing

  // Detect theme based on document class or computed styles
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Theme-aware colors
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const baselineColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
  const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
  const loadingTextColor = isDarkMode ? '#666' : '#999';

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Show loading state
  if (isLoading.value) {
    ctx.fillStyle = loadingTextColor;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Loading chart data...', width / 2, height / 2);
    return;
  }

  // If no data, show a message
  if (chartData.value.length === 0) {
    ctx.fillStyle = loadingTextColor;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', width / 2, height / 2);
    return;
  }

  // Check if all data is zero
  const allValuesZero = chartData.value.every((d) => d.rxPackets === 0 && d.txPackets === 0);

  // Chart dimensions - use more of the available space
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Find min/max values for both RX and TX with proper scaling for full height usage
  const allValues = chartData.value.flatMap((d) => [d.rxPackets, d.txPackets]);
  const minPackets = Math.min(...allValues);
  const maxPackets = Math.max(...allValues);

  // Use the minimum as baseline and scale from there to use full height
  const displayMin = minPackets;
  const displayMax = maxPackets;
  const displayRange = Math.max(displayMax - displayMin, 1); // Ensure range is at least 1

  // Draw grid lines first
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  // Draw baseline (zero line) when needed
  if (displayMin <= 0 && displayMax >= 0) {
    ctx.strokeStyle = baselineColor;
    ctx.lineWidth = 2;
    const zeroY = height - padding - ((0 - displayMin) / displayRange) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding, zeroY);
    ctx.lineTo(width - padding, zeroY);
    ctx.stroke();

    // Add zero indicator text only if there's space
    if (zeroY > 20 && zeroY < height - 20) {
      ctx.fillStyle = textColor;
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('0', padding + 2, zeroY - 2);
    }

    // Reset for grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
  }

  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Vertical grid lines
  for (let i = 0; i <= 6; i++) {
    const x = padding + (chartWidth * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Theme-aware line colors with better contrast
  const rxLineColor = isDarkMode ? '#EBA0FC' : '#9333EA'; // Purple - lighter in dark, darker in light
  const txLineColor = isDarkMode ? '#FB787B' : '#DC2626'; // Red - lighter in dark, darker in light

  // Draw RX line chart (purple) - use full chart height
  if (chartData.value.length > 1) {
    ctx.strokeStyle = rxLineColor;
    ctx.lineWidth = 3; // Increased from 2 for better visibility
    ctx.beginPath();

    chartData.value.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (chartData.value.length - 1);
      // Scale to use the full chart height from bottom to top
      const y = height - padding - ((point.rxPackets - displayMin) / displayRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw RX points
    ctx.fillStyle = rxLineColor;
    chartData.value.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (chartData.value.length - 1);
      const y = height - padding - ((point.rxPackets - displayMin) / displayRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI); // Increased from 2 for better visibility
      ctx.fill();
    });
  }

  // Draw TX line chart (red) - use full chart height
  if (chartData.value.length > 1) {
    ctx.strokeStyle = txLineColor;
    ctx.lineWidth = 3; // Increased from 2 for better visibility
    ctx.beginPath();

    chartData.value.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (chartData.value.length - 1);
      // Scale to use the full chart height from bottom to top
      const y = height - padding - ((point.txPackets - displayMin) / displayRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw TX points
    ctx.fillStyle = txLineColor;
    chartData.value.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (chartData.value.length - 1);
      const y = height - padding - ((point.txPackets - displayMin) / displayRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI); // Increased from 2 for better visibility
      ctx.fill();
    });
  }

  // Draw labels
  ctx.fillStyle = textColor;
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';

  // Remove X-axis labels (time) - they were too cramped
  // Remove Y-axis labels (packets) - they were too cramped

  // Add status message when all values are zero
  if (allValuesZero) {
    ctx.fillStyle = textColor;
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('No packet activity in last 24 hours', width / 2, height - 15);
  }
};

onMounted(() => {
  fetchChartData(); // Initial load

  // Set up periodic updates every 30 seconds
  updateInterval.value = window.setInterval(fetchChartData, 30000);

  // Initial draw after mounting
  nextTick(() => {
    drawChart(); // This will show "Loading chart data..."

    // Force a redraw after a short delay to ensure proper sizing
    setTimeout(() => {
      drawChart();
    }, 100);
  });

  // Add resize listener
  window.addEventListener('resize', debouncedResize);
});

// Debounce resize to reduce GPU load
let resizeTimeout: number | null = null;
const debouncedResize = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = window.setTimeout(() => {
    // drawChart will be called when available
    if (chartRef.value) {
      const ctx = chartRef.value.getContext('2d');
      if (ctx) {
        // Force redraw
        nextTick(() => {
          chartRef.value?.dispatchEvent(new Event('resize'));
        });
      }
    }
  }, 150);
};

onBeforeUnmount(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value);
  }
  window.removeEventListener('resize', debouncedResize);
});
</script>

<template>
  <div class="glass-card rounded-[10px] p-4 lg:p-6">
    <h3
      class="text-content-primary dark:text-content-primary text-lg lg:text-xl font-semibold mb-3 lg:mb-4"
    >
      Performance Metrics
    </h3>
    <p
      class="text-content-secondary dark:text-content-primary text-xs lg:text-sm uppercase mb-3 lg:mb-4"
    >
      Packet Activity (Last 24 Hours)
    </p>
    <div class="flex items-center gap-4 lg:gap-6 mb-3 lg:mb-4">
      <div class="flex items-center gap-2">
        <div class="w-5 lg:w-7 h-2 rounded bg-purple-400 dark:bg-accent-purple"></div>
        <span class="text-content-primary dark:text-content-primary text-xs lg:text-sm"
          >Received</span
        >
      </div>
      <div class="flex items-center gap-2">
        <div class="w-5 lg:w-7 h-2 rounded bg-red-400 dark:bg-accent-red"></div>
        <span class="text-content-primary dark:text-content-primary text-xs lg:text-sm"
          >Transmitted</span
        >
      </div>
    </div>
    <div class="relative h-40 lg:h-48">
      <canvas ref="chartRef" class="absolute inset-0 w-full h-full"></canvas>
    </div>

    <!-- Performance Stats -->
    <div class="mt-3 lg:mt-4 grid grid-cols-2 gap-3 lg:gap-4">
      <div class="text-center">
        <div class="text-lg lg:text-2xl font-bold text-content-primary dark:text-content-primary">
          {{ packetStore.packetStats?.total_packets || 0 }}
        </div>
        <div class="text-xs text-content-secondary dark:text-content-muted uppercase tracking-wide">
          Total Received
        </div>
      </div>
      <div class="text-center">
        <div class="text-lg lg:text-2xl font-bold text-content-primary dark:text-content-primary">
          {{ packetStore.packetStats?.transmitted_packets || 0 }}
        </div>
        <div class="text-xs text-content-secondary dark:text-content-muted uppercase tracking-wide">
          Total Transmitted
        </div>
      </div>
    </div>

    <div class="mt-2 lg:mt-3 grid grid-cols-3 gap-2 lg:gap-3 text-center">
      <div>
        <div
          class="text-xs lg:text-sm font-semibold text-purple-500 dark:text-accent-purple flex items-center justify-center gap-1"
        >
          {{ uptimeBasedRates.rxRate.value }}
          <span
            v-if="uptimeBasedRates.confidence === 'low'"
            class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 dark:bg-secondary opacity-70"
            title="Early data - limited uptime"
          ></span>
        </div>
        <div class="text-xs text-content-secondary dark:text-content-muted">
          {{ uptimeBasedRates.rxRate.label }}
        </div>
      </div>
      <div>
        <div
          class="text-xs lg:text-sm font-semibold text-red-500 dark:text-accent-red flex items-center justify-center gap-1"
        >
          {{ uptimeBasedRates.txRate.value }}
          <span
            v-if="uptimeBasedRates.confidence === 'low'"
            class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 dark:bg-secondary opacity-70"
            title="Early data - limited uptime"
          ></span>
        </div>
        <div class="text-xs text-content-secondary dark:text-content-muted">
          {{ uptimeBasedRates.txRate.label }}
        </div>
      </div>
      <div>
        <div
          class="text-xs lg:text-sm font-semibold text-content-primary dark:text-content-primary"
        >
          {{ packetStore.packetStats?.dropped_packets || 0 }}
        </div>
        <div class="text-xs text-content-secondary dark:text-content-muted">Dropped</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
}
</style>
