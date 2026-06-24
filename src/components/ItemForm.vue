<template>
  <form class="item-form" @submit.prevent="handleSave">
    <div class="form-group">
      <label class="form-label">名称 <span style="color: var(--color-error);">*</span></label>
      <input class="form-input" v-model="form.name" placeholder="物品名称" required />
    </div>

    <div class="form-group">
      <label class="form-label">分类</label>
      <select class="form-select" v-model="form.category_id">
        <option value="">请选择分类</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">数量</label>
      <input class="form-input" type="number" v-model.number="form.quantity" min="1" placeholder="1" />
    </div>

    <div class="form-group">
      <label class="form-label">备注</label>
      <textarea class="form-input" v-model="form.note" rows="3" placeholder="备注信息"></textarea>
    </div>

    <div class="form-group">
      <label class="form-label">照片</label>
      <PhotoGrid
        :photos="form.photos"
        :can-add="true"
        :can-delete="true"
        @add="handlePhotoAdd"
        @delete="handlePhotoDelete"
        @preview="handlePhotoPreview"
      />
      <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="handleFileChange" />
    </div>

    <LocationSelector
      :familyId="familyId"
      :defaultHouseId="defaultHouseId"
      :defaultRoomId="defaultRoomId"
      :defaultStorageId="defaultStorageId"
      @change="onLocationChange"
    />

    <div class="modal-btns" style="margin-top: var(--space-4);">
      <button type="button" class="btn btn-outline" @click="$emit('cancel')">取消</button>
      <button type="submit" class="btn btn-primary">保存</button>
    </div>
  </form>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { compressImage } from '@/utils/image'
import PhotoGrid from './PhotoGrid.vue'
import LocationSelector from './LocationSelector.vue'

const props = defineProps({
  item: { type: Object, default: null },
  familyId: { type: Number, required: true },
  defaultHouseId: { type: Number, default: null },
  defaultRoomId: { type: Number, default: null },
  defaultStorageId: { type: Number, default: null }
})

const emit = defineEmits(['save', 'cancel'])

const categories = ref([])
const fileInput = ref(null)

const form = ref({
  name: '',
  category_id: '',
  quantity: 1,
  note: '',
  photos: [],
  houseId: null,
  roomId: null,
  storageId: null
})

// Track deleted photo IDs for backend handling
const deletedPhotoIds = ref([])

const locationData = ref({ houseId: null, roomId: null, storageId: null })

onMounted(async () => {
  if (props.item) {
    form.value.name = props.item.name || ''
    form.value.category_id = props.item.category_id || ''
    form.value.quantity = props.item.quantity || 1
    form.value.note = props.item.note || ''
    form.value.photos = (props.item.photos || []).map(p => ({ id: p.id, url: p.url }))
  }
  if (props.defaultStorageId) {
    form.value.storageId = props.defaultStorageId
  }
  await fetchCategories()
})

async function fetchCategories() {
  try {
    const res = await api.get(`/categories?family=${props.familyId}`)
    categories.value = res.data || []
  } catch {
    categories.value = []
  }
}

function onLocationChange(data) {
  locationData.value = data
}

function handlePhotoAdd() {
  fileInput.value.click()
}

async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const compressed = await compressImage(file)
    const url = URL.createObjectURL(compressed)
    form.value.photos.push({ id: 'new_' + Date.now(), url, file: compressed, isNew: true })
  } catch {
    // fallback to original file
    const url = URL.createObjectURL(file)
    form.value.photos.push({ id: 'new_' + Date.now(), url, file, isNew: true })
  }
  e.target.value = ''
}

function handlePhotoDelete(photoId) {
  const photo = form.value.photos.find(p => p.id === photoId)
  form.value.photos = form.value.photos.filter(p => p.id !== photoId)
  // Track existing (non-new) photo IDs for backend deletion
  if (photo && !photo.isNew) {
    deletedPhotoIds.value.push(photoId)
  }
}

function handlePhotoPreview(photo) {
  window.open(photo.url, '_blank')
}

function handleSave() {
  if (!form.value.name.trim()) return
  emit('save', {
    name: form.value.name.trim(),
    category_id: form.value.category_id || null,
    quantity: form.value.quantity || 1,
    note: form.value.note,
    photos: form.value.photos,
    deletedPhotoIds: deletedPhotoIds.value,
    storage_spot_id: locationData.value.storageId || props.defaultStorageId,
    house_id: locationData.value.houseId || props.defaultHouseId,
    room_id: locationData.value.roomId || props.defaultRoomId,
    custom_storage_name: locationData.value.customStorageName || null
  })
}
</script>

<style scoped>
.item-form textarea.form-input {
  resize: vertical;
  min-height: 80px;
}
</style>
