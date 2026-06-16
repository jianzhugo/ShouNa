<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-box" style="width: 400px; text-align: left;">
        <h4 style="text-align: center;">移动物品</h4>
        <p style="text-align: center;">选择新的收纳位置</p>

        <LocationSelector
          :familyId="familyId"
          @change="onLocationChange"
        />

        <div class="modal-btns" style="margin-top: var(--space-4);">
          <button class="btn btn-outline" @click="handleClose">取消</button>
          <button class="btn btn-primary" :disabled="!selectedStorageId" @click="handleMove">确认移动</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'
import { useToast } from '@/composables/useToast'
import LocationSelector from './LocationSelector.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  itemId: { type: Number, default: null },
  familyId: { type: Number, required: true },
  currentStorageId: { type: Number, default: null }
})

const emit = defineEmits(['update:visible', 'moved'])

const { show } = useToast()
const selectedStorageId = ref(null)

function onLocationChange(data) {
  selectedStorageId.value = data.storageId
}

function handleClose() {
  emit('update:visible', false)
}

async function handleMove() {
  if (!selectedStorageId.value || !props.itemId) return
  try {
    await api.put(`/items/${props.itemId}/move`, { storage_spot_id: selectedStorageId.value })
    show('物品已移动', 'success')
    emit('moved')
    handleClose()
  } catch (err) {
    show(err.message || '移动失败', 'error')
  }
}
</script>
