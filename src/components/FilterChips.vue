<template>
  <div class="filter-bar">
    <button
      v-for="item in items"
      :key="item.id"
      class="chip"
      :class="{ active: item.id === activeId }"
      @click="$emit('filter', item.id)"
    >
      {{ item.name }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  activeId: { type: [String, Number], default: '' }
})

defineEmits(['filter'])
</script>
