<template>
  <dl class="prop-list">
    <div v-for="(item, index) in items" :key="index" class="prop-row">
      <dt class="prop-label">{{ item.label }}</dt>
      <dd class="prop-value" :class="{ accent: item.accent }">{{ item.value }}</dd>
    </div>
  </dl>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] }
})
</script>
