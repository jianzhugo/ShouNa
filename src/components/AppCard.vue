<template>
  <router-link v-if="to" :to="to" class="app-card" :style="cardStyle">
    <div class="card-icon" :style="{ background: iconBg, color: iconColor }">
      <i :class="icon"></i>
    </div>
    <div class="card-title">{{ title }}</div>
    <div v-if="subtitle" class="card-sub">{{ subtitle }}</div>
    <span class="card-arrow"><i class="fa-solid fa-chevron-right"></i></span>
  </router-link>
  <div v-else class="app-card" :style="cardStyle" @click="$emit('click')">
    <div class="card-icon" :style="{ background: iconBg, color: iconColor }">
      <i :class="icon"></i>
    </div>
    <div class="card-title">{{ title }}</div>
    <div v-if="subtitle" class="card-sub">{{ subtitle }}</div>
    <span class="card-arrow"><i class="fa-solid fa-chevron-right"></i></span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, required: true },
  iconBg: { type: String, default: '#FFF1EB' },
  iconColor: { type: String, default: '#E8743B' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  topBorder: { type: Boolean, default: false },
  topBorderColor: { type: String, default: '#E8743B' }
})

defineEmits(['click'])

const cardStyle = computed(() => {
  if (!props.topBorder) return {}
  return { borderTop: `3px solid ${props.topBorderColor}` }
})
</script>
