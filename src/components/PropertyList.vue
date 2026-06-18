<template>
  <dl class="prop-list">
    <div v-for="(item, index) in items" :key="index" class="prop-row">
      <dt class="prop-label">{{ item.label }}</dt>
      <dd class="prop-value" :class="{ accent: item.accent }">
        <router-link v-if="item.link" :to="item.link" class="prop-link">{{ item.value }}</router-link>
        <span v-else-if="item.badge" class="badge" :class="'badge-' + (item.badgeType || 'neutral')">{{ item.value }}</span>
        <template v-else>{{ item.value }}</template>
      </dd>
    </div>
  </dl>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] }
})
</script>

<style scoped>
.prop-link {
  color: var(--color-primary);
  text-decoration: none;
}
.prop-link:hover {
  text-decoration: underline;
}
.badge {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  padding: 2px var(--space-2);
  border-radius: var(--radius-md);
  line-height: 1.5;
}
.badge-primary {
  background: var(--color-primary-light, #e0f0ff);
  color: var(--color-primary);
}
.badge-neutral {
  background: var(--color-neutral-100, #f3f4f6);
  color: var(--color-neutral-500, #6b7280);
}
</style>
