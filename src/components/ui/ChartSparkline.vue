<script setup lang="ts">
/**
 * ChartSparkline.vue
 *
 * A compact Chart.js-based sparkline component for dashboard stat cards.
 * Displays a smooth trendline with moving average smoothing and downsampling.
 *
 * Features:
 * - Moving average smoothing (~20% window size)
 * - Downsample to 12 points for clean rendering
 * - Smooth bezier curves with 0.4 tension
 * - Responsive canvas with consistent card layout
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, markRaw } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, Filler);

defineOptions({ name: 'ChartSparkline' });

// ============================================================================
// Types
// ============================================================================

interface Props {
  title: string;
  value: number | string;
  color: string;
  data?: number[];
  showChart?: boolean;
  secondaryValue?: number | string;
  secondaryLabel?: string;
  secondaryColor?: string;
  secondaryData?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  showChart: true,
  secondaryValue: undefined,
  secondaryLabel: '',
  secondaryColor: '',
  secondaryData: () => [],
});

// ============================================================================
// State
// ============================================================================

const canvasRef = ref<HTMLCanvasElement | null>(null);
const chartInstance = ref<ChartJS | null>(null);

// ============================================================================
// Data Processing
// ============================================================================

/**
 * Apply moving average smoothing and downsample to target points.
 * Window size: ~20% of data length (min 3, max 15)
 * Target output: 12 points for clean rendering
 */
const smoothData = (data: number[]): number[] => {
  if (data.length < 3) return data;

  const windowSize = Math.min(15, Math.max(3, Math.floor(data.length * 0.2)));
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const halfWindow = Math.floor(windowSize / 2);
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const window = data.slice(start, end);
    result.push(window.reduce((a, b) => a + b, 0) / window.length);
  }

  // Downsample to ~12 points
  const targetPoints = Math.min(12, result.length);
  const step = result.length / targetPoints;
  const downsampled: number[] = [];

  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.floor(i * step);
    downsampled.push(result[idx]);
  }

  return downsampled;
};

const processedData = computed(() => {
  if (!props.data || props.data.length === 0) return [];
  return smoothData(props.data);
});

const processedSecondaryData = computed(() => {
  if (!props.secondaryData || props.secondaryData.length === 0) return [];
  return smoothData(props.secondaryData);
});

// ============================================================================
// Chart Lifecycle
// ============================================================================

const createChart = () => {
  if (!canvasRef.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  // Destroy existing chart
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }

  const data = processedData.value;
  if (data.length < 2) return;

  const datasets: any[] = [
    {
      data: data,
      borderColor: props.color,
      borderWidth: 2.5,
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 0,
    },
  ];

  const secData = processedSecondaryData.value;
  if (secData.length >= 2 && props.secondaryColor) {
    datasets.push({
      data: secData,
      borderColor: props.secondaryColor,
      borderWidth: 2,
      borderDash: [4, 3],
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 0,
    });
  }

  chartInstance.value = markRaw(
    new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i.toString()),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            display: false,
            grid: { display: false },
          },
          y: {
            display: false,
            grid: { display: false },
            // Add padding to prevent clipping at edges
            grace: '10%',
          },
        },
        elements: {
          line: {
            capBezierPoints: true,
          },
        },
      },
    }),
  );
};

const updateChart = () => {
  if (!chartInstance.value) {
    createChart();
    return;
  }

  const data = processedData.value;
  if (data.length < 2) return;

  chartInstance.value.data.labels = data.map((_, i) => i.toString());
  chartInstance.value.data.datasets[0].data = data;

  const secData = processedSecondaryData.value;
  if (secData.length >= 2 && props.secondaryColor) {
    if (chartInstance.value.data.datasets.length < 2) {
      // Add secondary dataset dynamically if chart was created without it
      chartInstance.value.data.datasets.push({
        data: secData,
        borderColor: props.secondaryColor,
        borderWidth: 2,
        borderDash: [4, 3],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
      } as any);
    } else {
      chartInstance.value.data.datasets[1].data = secData;
    }
  }

  chartInstance.value.update('default');
};

watch(
  () => props.data,
  () => {
    nextTick(() => updateChart());
  },
  { deep: true },
);

watch(
  () => props.color,
  () => {
    if (chartInstance.value) {
      chartInstance.value.data.datasets[0].borderColor = props.color;
      chartInstance.value.update('none');
    }
  },
);

onMounted(() => {
  nextTick(() => createChart());
});

onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
});
</script>

<template>
  <div class="sparkline-card">
    <!-- Header: Title and Value -->
    <div class="card-header">
      <p class="card-title">{{ title }}</p>
      <div class="card-values">
        <span class="card-value" :style="{ color }">{{
          typeof value === 'number' ? value.toLocaleString() : value
        }}</span>
        <span
          v-if="secondaryValue !== undefined"
          class="card-secondary-value"
          :style="{ color: secondaryColor }"
        >
          {{ secondaryLabel
          }}{{
            typeof secondaryValue === 'number' ? secondaryValue.toLocaleString() : secondaryValue
          }}
        </span>
      </div>
    </div>

    <!-- Full-width chart area (always present for consistent height) -->
    <div class="card-chart">
      <canvas v-if="showChart" ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<style scoped>
.sparkline-card {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 12px 14px;
  backdrop-filter: blur(50px);
  overflow: hidden;
  transition:
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.02);
}

.dark .sparkline-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.card-title {
  color: rgba(75, 85, 99, 0.7);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.3s ease;
}

.dark .card-title {
  color: rgba(255, 255, 255, 0.6);
}

.card-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.card-values {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.card-secondary-value {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

.card-chart {
  width: 100%;
  height: 28px;
  overflow: hidden;
}

.card-chart canvas {
  width: 100% !important;
  height: 100% !important;
}

@media (min-width: 1024px) {
  .sparkline-card {
    padding: 14px 16px;
  }

  .card-header {
    margin-bottom: 10px;
  }

  .card-title {
    font-size: 12px;
  }

  .card-value {
    font-size: 26px;
  }

  .card-chart {
    height: 32px;
  }
}
</style>
