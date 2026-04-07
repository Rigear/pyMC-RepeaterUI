<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTreeStateStore } from '@/stores/treeState';

interface TreeNodeData {
  id: number;
  name: string;
  children: TreeNodeData[];
  floodPolicy: 'allow' | 'deny';
  transport_key?: string;
  last_used?: Date;
}

interface Props {
  node: TreeNodeData;
  selectedNodeId: number | null;
  level: number;
  disabled?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [nodeId: number];
}>();

// Use the global tree state store
const treeStore = useTreeStateStore();

// State for showing full key
const showFullKey = ref(false);

// Use the global expanded state instead of local state
const isExpanded = computed({
  get: () => treeStore.isNodeExpanded(props.node.id),
  set: (value: boolean) => {
    if (value) {
      treeStore.addExpandedNode(props.node.id);
    } else {
      treeStore.removeExpandedNode(props.node.id);
    }
  },
});

// Memoize whether node has children to prevent unnecessary reactivity
const hasChildren = computed(() => props.node.children.length > 0);

// Format the last used time to human readable format
function formatLastUsed(date: Date | undefined): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 365) {
    return `${diffDays}d ago`;
  } else {
    return `${diffYears}y ago`;
  }
}

// Get truncated transport key for display
function getTruncatedKey(key: string | undefined): string {
  if (!key) return 'No key';
  if (key.length <= 16) return key;
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
}

function toggleExpanded() {
  if (hasChildren.value) {
    const newValue = !isExpanded.value;
    isExpanded.value = newValue;
  }
}

function selectNode() {
  emit('select', props.node.id);
}

function handleChildSelect(nodeId: number) {
  emit('select', nodeId);
}

function toggleShowFullKey(event: Event) {
  event.stopPropagation();
  showFullKey.value = !showFullKey.value;
}

function copyToClipboard(event: Event) {
  event.stopPropagation();
  if (props.node.transport_key && window.navigator?.clipboard) {
    window.navigator.clipboard.writeText(props.node.transport_key);
  }
}
</script>

<template>
  <div class="select-none">
    <!-- Node Content -->
    <div
      :class="[
        'flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 rounded-lg cursor-pointer transition-all duration-200',
        props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5',
        selectedNodeId === node.id && !props.disabled
          ? 'bg-primary/20 text-primary'
          : 'text-white/80 hover:text-white',
        `ml-${level * 4}`,
      ]"
      @click="!props.disabled && selectNode()"
    >
      <!-- Expand/Collapse Arrow -->
      <div
        class="flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"
        @click.stop="toggleExpanded"
      >
        <svg
          v-if="hasChildren"
          :class="[
            'w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform duration-200',
            isExpanded ? 'rotate-90' : 'rotate-0',
          ]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Node Icon -->
      <div class="flex-shrink-0">
        <!-- Region icon (hashtag) for names starting with # -->
        <svg
          v-if="props.node.name.startsWith('#')"
          class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary"
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
        <!-- Private key icon for all other names -->
        <svg
          v-else
          class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-green"
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
      </div>

      <!-- Node Name -->
      <span
        :class="[
          'font-mono text-xs sm:text-sm transition-colors duration-200 break-all',
          selectedNodeId === node.id ? 'text-primary font-medium' : '',
        ]"
      >
        {{ node.name }}
      </span>

      <!-- Transport Key Display -->
      <div v-if="node.transport_key" class="hidden sm:flex items-center gap-1 ml-2">
        <div class="relative group">
          <!-- Key Icon with tooltip -->
          <button
            @click="toggleShowFullKey"
            class="p-1 rounded hover:bg-white/10 transition-colors"
            :title="showFullKey ? 'Hide full key' : 'Show full key'"
          >
            <svg
              class="w-3 h-3 text-white/60 hover:text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          <!-- Truncated key display -->
          <span
            v-if="!showFullKey"
            class="text-xs font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"
          >
            {{ getTruncatedKey(node.transport_key) }}
          </span>

          <!-- Full key display - improved popup -->
          <div
            v-if="showFullKey"
            class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md"
            @click="showFullKey = false"
          >
            <div
              class="bg-black/20 border border-white/20 rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4"
              @click.stop
            >
              <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-semibold text-white">Transport Key</h3>
                <button
                  @click="showFullKey = false"
                  class="text-white/60 hover:text-white transition-colors"
                >
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

              <div class="bg-black/20 border border-white/10 rounded-md p-4 mb-4">
                <div class="text-sm font-mono text-white/80 break-all leading-relaxed">
                  {{ node.transport_key }}
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  @click="copyToClipboard"
                  class="px-4 py-2 bg-accent-green/20 hover:bg-accent-green/30 border border-accent-green/50 text-accent-green rounded-lg transition-colors flex items-center gap-2"
                  title="Copy to clipboard"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Last Used Display and Flood Policy Badge Container -->
      <div class="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
        <!-- Last Used Display - Hidden on mobile -->
        <div v-if="node.last_used" class="hidden sm:flex items-center gap-1">
          <svg class="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-xs text-white/50" :title="node.last_used.toLocaleString()">
            {{ formatLastUsed(node.last_used) }}
          </span>
        </div>

        <!-- Never Used Display -->
        <div v-else class="hidden sm:flex items-center gap-1">
          <svg class="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-xs text-white/30 italic">Never</span>
        </div>

        <!-- Flood Policy Badge -->
        <span
          :class="[
            'px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md transition-colors',
            node.floodPolicy === 'allow'
              ? 'bg-accent-green/10 text-accent-green/90 border border-accent-green/20'
              : 'bg-accent-red/10 text-accent-red/90 border border-accent-red/20',
          ]"
        >
          {{ node.floodPolicy === 'allow' ? 'ALLOW' : 'DENY' }}
        </span>

        <!-- Children Count Badge -->
        <span
          v-if="hasChildren"
          class="hidden sm:inline-block px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full ml-1"
        >
          >
          {{ node.children.length }}
        </span>
      </div>
    </div>

    <!-- Children (Recursive) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0 overflow-hidden"
      enter-to-class="opacity-100 max-h-screen overflow-visible"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 max-h-screen overflow-visible"
      leave-to-class="opacity-0 max-h-0 overflow-hidden"
    >
      <div v-if="isExpanded && node.children.length > 0" class="space-y-1">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected-node-id="selectedNodeId"
          :level="level + 1"
          :disabled="props.disabled"
          @select="handleChildSelect"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Custom indentation classes */
.ml-0 {
  margin-left: 0rem;
}
.ml-4 {
  margin-left: 1rem;
}
.ml-8 {
  margin-left: 2rem;
}
.ml-12 {
  margin-left: 3rem;
}
.ml-16 {
  margin-left: 4rem;
}
.ml-20 {
  margin-left: 5rem;
}
.ml-24 {
  margin-left: 6rem;
}
.ml-28 {
  margin-left: 7rem;
}
.ml-32 {
  margin-left: 8rem;
}
</style>
