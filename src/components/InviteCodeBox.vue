<template>
  <div class="invite-box">
    <div class="invite-code-area">
      <div class="invite-label">邀请码</div>
      <div class="invite-code">{{ code }}</div>
      <div class="invite-hint">
        已使用 {{ usedCount }}/{{ maxUses }} 次
        <span v-if="expiresAt"> · 有效期至 {{ expiresAt }}</span>
      </div>
    </div>
    <div class="invite-actions">
      <button class="btn btn-primary btn-sm" @click="$emit('copy')">
        <i class="fa-solid fa-copy"></i> 复制
      </button>
      <button class="btn btn-outline btn-sm" @click="$emit('reset')">
        <i class="fa-solid fa-rotate"></i> 重置
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  code: { type: String, default: '' },
  expiresAt: { type: String, default: '' },
  maxUses: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 }
})

defineEmits(['copy', 'reset'])
</script>
