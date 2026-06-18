<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-box">
        <h4>{{ title }}</h4>
        <p>{{ message }}</p>
        <div class="modal-btns">
          <button class="btn btn-outline" @click="handleCancel">{{ cancelText }}</button>
          <button class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" @click="handleConfirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  danger: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

function handleConfirm() {
  emit('update:visible', false)
  emit('confirm')
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}
</script>
