<template>
  <div class="search-bar">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      @keyup.enter="$emit('search')"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索...' }
})

const emit = defineEmits(['update:modelValue', 'search'])

let debounceTimer = null

function handleInput(e) {
  const value = e.target.value
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:modelValue', value)
    emit('search')
  }, 300)
}
</script>
