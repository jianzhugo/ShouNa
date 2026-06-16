<template>
  <section>
    <div v-for="(log, index) in logs" :key="index" class="timeline-item">
      <div class="timeline-dot" :style="{ background: dotColor(log.action) }"></div>
      <div>
        <div class="timeline-text">{{ log.user_name }} {{ actionText(log.action) }} {{ log.entity_name }}</div>
        <div v-if="log.details" class="timeline-time">{{ log.details }}</div>
        <div class="timeline-time">{{ log.created_at }}</div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  logs: { type: Array, default: () => [] }
})

function actionText(action) {
  const map = {
    create: '创建了',
    update: '更新了',
    delete: '删除了',
    move: '移动了',
    login: '登录了'
  }
  return map[action] || action
}

function dotColor(action) {
  const map = {
    create: 'var(--color-success)',
    update: 'var(--color-info)',
    delete: 'var(--color-error)',
    move: 'var(--color-warning)',
    login: 'var(--color-primary)'
  }
  return map[action] || 'var(--color-primary)'
}
</script>
