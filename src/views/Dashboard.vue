<script setup lang="ts">
import StatsCards from '@/components/ui/StatsCards.vue';
import PacketTypesChart from '@/components/charts/PacketTypesChart.vue';
import AirtimeUtilizationChart from '@/components/charts/AirtimeUtilizationChart.vue';
import PacketTable from '@/components/tables/PacketTable.vue';

defineOptions({ name: 'DashboardView' });
</script>

<template>
  <div>
    <!-- Stats Cards -->
    <StatsCards />

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
      <AirtimeUtilizationChart />
      <PacketTypesChart />
    </div>

    <!-- Packet Table -->
    <PacketTable />
  </div>
</template>
