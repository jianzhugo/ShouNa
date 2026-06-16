<template>
  <div class="photo-grid">
    <template v-for="photo in photos" :key="photo.id">
      <div style="position: relative;">
        <img :src="photo.url" :alt="photo.id" @click="$emit('preview', photo)" />
        <button
          v-if="canDelete"
          class="photo-delete-btn"
          @click.stop="$emit('delete', photo.id)"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </template>
    <div v-if="canAdd" class="photo-add" @click="$emit('add')">
      <i class="fa-solid fa-plus"></i>
      <span>添加照片</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  photos: { type: Array, default: () => [] },
  canAdd: { type: Boolean, default: true },
  canDelete: { type: Boolean, default: false }
})

defineEmits(['add', 'delete', 'preview'])
</script>

<style scoped>
.photo-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: var(--text-xs);
}
.photo-delete-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}
</style>
