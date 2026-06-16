<template>
  <div class="empty-state">
    <i :class="icon"></i>
    <p>{{ text }}</p>
    <p v-if="hint" class="empty-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'fa-solid fa-inbox' },
  text: { type: String, default: '' },
  hint: { type: String, default: '' }
})
</script>
