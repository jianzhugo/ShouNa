<template>
  <nav v-if="totalPages > 1" class="pagination">
    <button class="page-btn" :disabled="page <= 1" @click="emitChange(page - 1)">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <button
      v-for="p in visiblePages"
      :key="p"
      class="page-btn"
      :class="{ active: p === page }"
      @click="emitChange(p)"
    >
      {{ p }}
    </button>
    <button class="page-btn" :disabled="page >= totalPages" @click="emitChange(page + 1)">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  limit: { type: Number, default: 20 },
  total: { type: Number, required: true }
})

const emit = defineEmits(['change'])

const totalPages = computed(() => Math.ceil(props.total / props.limit) || 1)

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = props.page
  const delta = 2

  const start = Math.max(1, current - delta)
  const end = Math.min(total, current + delta)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

function emitChange(p) {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('change', p)
}
</script>
