<template>
  <div>
    <template v-if="type === 'card'">
      <div v-for="i in count" :key="i" class="skeleton skeleton-card" style="margin-bottom: var(--space-3);"></div>
    </template>
    <template v-else-if="type === 'text'">
      <div v-for="i in count" :key="i" class="skeleton skeleton-text" :class="{ short: i === count }"></div>
    </template>
    <template v-else-if="type === 'table'">
      <div class="skeleton skeleton-card" style="margin-bottom: var(--space-3);"></div>
      <div v-for="i in count" :key="i" style="display: flex; gap: var(--space-3); margin-bottom: var(--space-2);">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: var(--radius-md); flex-shrink: 0;"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text" style="width: 50%;"></div>
          <div class="skeleton skeleton-text short" style="width: 30%;"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 3 },
  type: { type: String, default: 'card' }
})
</script>
