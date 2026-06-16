<template>
  <div class="stat-card">
    <div class="stat-icon" :style="{ background: iconBg, color: iconColor }">
      <i :class="icon"></i>
    </div>
    <div class="stat-num">{{ num }}</div>
    <div class="stat-label">{{ label }}</div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '' },
  iconBg: { type: String, default: '#FFF1EB' },
  iconColor: { type: String, default: '#E8743B' },
  num: { type: [Number, String], default: 0 },
  label: { type: String, default: '' }
})
</script>
