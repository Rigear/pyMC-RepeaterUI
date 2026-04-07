<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSystemStore } from '@/stores/system';
import { authClient } from '@/utils/api';

const systemStore = useSystemStore();

const delaysConfig = computed(() => systemStore.stats?.config?.delays || {});

const floodTxDelayFactor = computed(() => {
  const factor = delaysConfig.value.tx_delay_factor;
  if (factor && typeof factor === 'object' && factor !== null && 'parsedValue' in factor) {
    const value = (factor as { parsedValue?: number }).parsedValue;
    if (typeof value === 'number') {
      return value.toFixed(2) + 'x';
    }
  }
  return 'Not set';
});

const directTxDelayFactor = computed(() => {
  const factor = delaysConfig.value.direct_tx_delay_factor;
  return typeof factor === 'number' ? factor.toFixed(2) + 's' : 'Not set';
});

// Edit mode state
const isEditing = ref(false);
const isSaving = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// Edit form values
const floodTxDelayInput = ref(0);
const directTxDelayInput = ref(0);

const startEditing = () => {
  // Parse current values
  const floodFactor = delaysConfig.value.tx_delay_factor;
  if (floodFactor && typeof floodFactor === 'object' && 'parsedValue' in floodFactor) {
    floodTxDelayInput.value = (floodFactor as { parsedValue?: number }).parsedValue || 1.0;
  } else if (typeof floodFactor === 'number') {
    floodTxDelayInput.value = floodFactor;
  } else {
    floodTxDelayInput.value = 1.0;
  }

  const directFactor = delaysConfig.value.direct_tx_delay_factor;
  directTxDelayInput.value = typeof directFactor === 'number' ? directFactor : 0.5;

  isEditing.value = true;
  successMessage.value = '';
  errorMessage.value = '';
};

const cancelEditing = () => {
  isEditing.value = false;
  successMessage.value = '';
  errorMessage.value = '';
};

const saveChanges = async () => {
  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await authClient.post('/api/update_radio_config', {
      tx_delay_factor: floodTxDelayInput.value,
      direct_tx_delay_factor: directTxDelayInput.value,
    });

    const data = response.data;
    if (data.message || data.persisted) {
      successMessage.value = data.message || 'Settings saved successfully';
      isEditing.value = false;

      // Refresh stats to show updated values
      await systemStore.fetchStats();

      // Clear success message after 3 seconds
      setTimeout(() => {
        successMessage.value = '';
      }, 3000);
    } else {
      errorMessage.value = 'Failed to save settings';
    }
  } catch (error: any) {
    console.error('Failed to save delay settings:', error);
    errorMessage.value = error.response?.data?.error || 'Failed to save settings';
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <!-- Success/Error Messages -->
    <div
      v-if="successMessage"
      class="bg-green-100 dark:bg-green-500/20 border border-green-500 dark:border-green-500/50 rounded-lg p-3 text-green-700 dark:text-green-400 text-sm"
    >
      {{ successMessage }}
    </div>
    <div
      v-if="errorMessage"
      class="bg-red-100 dark:bg-red-500/20 border border-red-500 dark:border-red-500/50 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-end gap-2">
      <button
        v-if="!isEditing"
        @click="startEditing"
        class="px-3 sm:px-4 py-2 bg-primary/20 hover:bg-primary/30 text-content-primary dark:text-content-primary rounded-lg border border-primary/50 transition-colors text-sm"
      >
        Edit Settings
      </button>
      <template v-else>
        <button
          @click="cancelEditing"
          :disabled="isSaving"
          class="px-3 sm:px-4 py-2 bg-background-mute dark:bg-white/5 hover:bg-stroke-subtle dark:hover:bg-white/10 text-content-primary dark:text-content-primary rounded-lg border border-stroke-subtle dark:border-stroke/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          @click="saveChanges"
          :disabled="isSaving"
          class="px-3 sm:px-4 py-2 bg-primary/20 hover:bg-primary/30 text-content-primary dark:text-content-primary rounded-lg border border-primary/50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </template>
    </div>

    <!-- Transmission Delays Settings -->
    <div class="bg-background-mute dark:bg-white/5 rounded-lg p-3 sm:p-4 space-y-3">
      <div class="flex flex-col py-2 border-b border-stroke-subtle dark:border-stroke/10 gap-2">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
          <span class="text-content-secondary dark:text-content-muted text-xs sm:text-sm"
            >Flood TX Delay Factor</span
          >
          <div
            v-if="!isEditing"
            class="text-content-primary dark:text-content-primary font-mono text-sm sm:ml-4"
          >
            {{ floodTxDelayFactor }}
          </div>
          <input
            v-else
            v-model.number="floodTxDelayInput"
            type="number"
            step="0.1"
            min="0"
            max="5"
            class="w-full sm:w-32 px-3 py-1.5 bg-background-mute dark:bg-white/5 border border-stroke-subtle dark:border-stroke/10 rounded-lg text-content-primary dark:text-content-primary text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <span class="text-content-muted dark:text-content-muted text-xs"
          >Multiplier for flood packet transmission delays (collision avoidance)</span
        >
      </div>

      <div class="flex flex-col py-2 gap-2">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
          <span class="text-content-secondary dark:text-content-muted text-xs sm:text-sm"
            >Direct TX Delay Factor</span
          >
          <div
            v-if="!isEditing"
            class="text-content-primary dark:text-content-primary font-mono text-sm sm:ml-4"
          >
            {{ directTxDelayFactor }}
          </div>
          <input
            v-else
            v-model.number="directTxDelayInput"
            type="number"
            step="0.1"
            min="0"
            max="5"
            class="w-full sm:w-32 px-3 py-1.5 bg-background-mute dark:bg-white/5 border border-stroke-subtle dark:border-stroke/10 rounded-lg text-content-primary dark:text-content-primary text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <span class="text-content-muted dark:text-content-muted text-xs"
          >Base delay for direct-routed packet transmission (seconds)</span
        >
      </div>
    </div>
  </div>
</template>
