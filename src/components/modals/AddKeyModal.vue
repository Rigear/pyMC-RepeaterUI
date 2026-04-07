<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  show: boolean;
  selectedNodeName?: string;
  selectedNodeId?: number;
}

interface Emits {
  (e: 'close'): void;
  (e: 'add', data: { name: string; floodPolicy: 'allow' | 'deny'; parentId?: number }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const keyName = ref('');
const notes = ref('');
const floodPolicy = ref<'allow' | 'deny'>('allow');

// Auto-detect if it's a region or private key based on # prefix
const isRegion = computed(() => keyName.value.startsWith('#'));

// Icon and type info
const keyType = computed(() => ({
  type: isRegion.value ? 'Region' : 'Private Key',
  description: isRegion.value ? 'Regional organizational key' : 'Individual assigned key',
}));

// Watch for changes to auto-update notes
watch(
  isRegion,
  (newValue) => {
    if (newValue) {
      notes.value = 'This will create a new region for organizing keys';
    } else {
      notes.value = 'This will create a new private key entry';
    }
  },
  { immediate: true },
);

// Form validation
const isValid = computed(() => {
  return keyName.value.trim().length > 0;
});

// Handle form submission
const handleAdd = () => {
  if (!isValid.value) return;

  emit('add', {
    name: keyName.value.trim(),
    floodPolicy: floodPolicy.value,
    parentId: props.selectedNodeId,
  });

  // Reset form
  keyName.value = '';
  notes.value = '';
  floodPolicy.value = 'allow';
};

// Handle cancel
const handleCancel = () => {
  // Reset form
  keyName.value = '';
  notes.value = '';
  floodPolicy.value = 'allow';
  emit('close');
};

// Handle backdrop click
const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleCancel();
  }
};
</script>

<template>
  <!-- Modal Backdrop -->
  <div
    v-if="show"
    @click="handleBackdropClick"
    class="fixed inset-0 bg-black/40 backdrop-blur-lg z-[99999] flex items-center justify-center p-4"
    style="
      backdrop-filter: blur(8px) saturate(180%);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    "
  >
    <!-- Modal Content -->
    <div
      class="bg-white dark:bg-surface-elevated backdrop-blur-xl rounded-[20px] p-6 w-full max-w-md border border-stroke-subtle dark:border-white/10"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-xl font-semibold text-content-primary dark:text-content-primary">
            Add New Entry
          </h3>
          <p class="text-content-secondary dark:text-content-muted text-sm mt-1">
            <span v-if="props.selectedNodeName">
              Add to: <span class="text-primary font-mono">{{ props.selectedNodeName }}</span>
            </span>
            <span v-else> Add to root level (#uk) </span>
          </p>
        </div>
        <button @click="handleCancel" class="text-white/60 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleAdd" class="space-y-4">
        <!-- Key Name Input -->
        <div>
          <label for="keyName" class="block text-sm font-medium text-white mb-2">
            <div class="flex items-center gap-2">
              <!-- Dynamic Icon -->
              <svg
                v-if="isRegion"
                class="w-4 h-4 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
              <svg
                v-else
                class="w-4 h-4 text-accent-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Region/Key Name
            </div>
          </label>
          <input
            id="keyName"
            v-model="keyName"
            type="text"
            placeholder="Enter name (prefix with # for regions)"
            class="w-full px-4 py-3 bg-white dark:bg-white/5 border border-stroke-subtle dark:border-stroke/20 rounded-lg text-content-primary dark:text-content-primary placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            autocomplete="off"
          />
        </div>

        <!-- Type Indicator -->
        <div
          class="bg-gray-50 dark:bg-white/5 border border-stroke-subtle dark:border-stroke/10 rounded-lg p-4"
        >
          <div class="flex items-center gap-3 mb-2">
            <div class="flex items-center gap-2">
              <!-- Type Icon -->
              <svg
                v-if="isRegion"
                class="w-5 h-5 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-accent-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1221 9z"
                />
              </svg>
              <span :class="isRegion ? 'text-secondary' : 'text-accent-green'" class="font-medium">
                {{ keyType.type }}
              </span>
            </div>
            <div
              class="flex-1 h-px"
              :class="isRegion ? 'bg-secondary/20' : 'bg-accent-green/20'"
            ></div>
          </div>
          <p class="text-content-secondary dark:text-content-muted text-sm">
            {{ keyType.description }}
          </p>
        </div>

        <!-- Flood Policy -->
        <div>
          <label
            class="block text-sm font-medium text-content-primary dark:text-content-primary mb-3"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Flood Policy
            </div>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <!-- Allow Option -->
            <label class="relative cursor-pointer group">
              <input type="radio" v-model="floodPolicy" value="allow" class="sr-only" />
              <div
                class="flex items-center gap-3 p-3 bg-background-mute dark:bg-white/5 border border-stroke-subtle dark:border-stroke/20 rounded-lg group-has-[:checked]:border-accent-green/50 group-has-[:checked]:bg-accent-green/10 transition-colors"
              >
                <div
                  class="flex items-center justify-center w-4 h-4 border-2 border-stroke dark:border-stroke/30 rounded-full group-has-[:checked]:border-accent-green group-has-[:checked]:bg-accent-green transition-all"
                >
                  <div
                    class="w-2 h-2 rounded-full bg-white scale-0 group-has-[:checked]:scale-100 transition-transform"
                  ></div>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-accent-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span class="font-medium text-accent-green text-sm">Allow</span>
                  </div>
                  <p class="text-content-secondary dark:text-content-muted text-xs mt-1">
                    Permit flooding
                  </p>
                </div>
              </div>
            </label>

            <!-- Deny Option -->
            <label class="relative cursor-pointer group">
              <input type="radio" v-model="floodPolicy" value="deny" class="sr-only" />
              <div
                class="flex items-center gap-3 p-3 bg-background-mute dark:bg-white/5 border border-stroke-subtle dark:border-stroke/20 rounded-lg group-has-[:checked]:border-accent-red/50 group-has-[:checked]:bg-accent-red/10 transition-colors"
              >
                <div
                  class="flex items-center justify-center w-4 h-4 border-2 border-stroke dark:border-stroke/30 rounded-full group-has-[:checked]:border-accent-red group-has-[:checked]:bg-accent-red transition-all"
                >
                  <div
                    class="w-2 h-2 rounded-full bg-white scale-0 group-has-[:checked]:scale-100 transition-transform"
                  ></div>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-accent-red"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span class="font-medium text-accent-red text-sm">Deny</span>
                  </div>
                  <p class="text-content-secondary dark:text-content-muted text-xs mt-1">
                    Block flooding
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="handleCancel"
            class="flex-1 px-4 py-3 bg-background-mute dark:bg-white/5 hover:bg-stroke-subtle dark:hover:bg-white/10 border border-stroke-subtle dark:border-stroke/20 text-content-primary dark:text-content-primary rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!isValid"
            :class="[
              'flex-1 px-4 py-3 rounded-lg transition-colors font-medium',
              isValid
                ? 'bg-accent-green/20 hover:bg-accent-green/30 border border-accent-green/50 text-accent-green'
                : 'bg-background-mute dark:bg-stroke/5 border border-stroke-subtle dark:border-stroke/20 text-content-muted dark:text-content-muted cursor-not-allowed',
            ]"
          >
            Add {{ keyType.type }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
