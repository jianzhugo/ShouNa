<template>
  <AppLayout>
    <!-- Mobile breadcrumb -->
    <nav class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <router-link v-if="locationInfo.houseName" :to="'/houses/' + locationInfo.houseId + '/rooms'">{{ locationInfo.houseName }}</router-link>
      <span v-if="locationInfo.houseName" class="sep">/</span>
      <router-link v-if="locationInfo.roomName" :to="'/rooms/' + locationInfo.roomId + '/storage'">{{ locationInfo.roomName }}</router-link>
      <span v-if="locationInfo.roomName" class="sep">/</span>
      <router-link v-if="locationInfo.storageName" :to="'/storage/' + locationInfo.storageId + '/items'">{{ locationInfo.storageName }}</router-link>
      <span v-if="locationInfo.storageName" class="sep">/</span>
      <span class="current">{{ item?.name || '物品详情' }}</span>
    </nav>

    <!-- Loading -->
    <SkeletonLoader v-if="loading" type="text" :count="8" />

    <!-- Error / not found -->
    <EmptyState
      v-else-if="!item"
      icon="fa-solid fa-circle-exclamation"
      text="物品不存在"
      hint="该物品可能已被删除"
    />

    <!-- Detail content -->
    <section v-else class="detail-layout">
      <!-- Left: item info -->
      <article class="detail-main">
        <!-- Page header with name + action buttons inline -->
        <header class="detail-header">
          <h2>{{ item.name }}</h2>
          <div class="detail-actions">
            <button class="btn btn-outline" @click="openEdit"><i class="fa-solid fa-pen"></i> 编辑</button>
            <button class="btn btn-outline" @click="openMove"><i class="fa-solid fa-arrows-up-down-left-right"></i> 移动</button>
            <button class="btn btn-danger" @click="openDelete"><i class="fa-solid fa-trash-can"></i> 删除</button>
          </div>
        </header>

        <!-- PhotoGrid -->
        <PhotoGrid
          :photos="item.photos || []"
          :can-add="true"
          :can-delete="true"
          @add="handlePhotoAdd"
          @delete="handlePhotoDelete"
          @preview="handlePhotoPreview"
        />
        <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="handleFileChange" />

        <!-- PropertyList -->
        <PropertyList :items="propertyItems" />
      </article>
    </section>

    <!-- Edit modal -->
    <Teleport to="body">
      <div v-if="formVisible" class="modal-overlay" @click.self="formVisible = false">
        <div class="modal-box" style="width: 480px; text-align: left; max-height: 80vh; overflow-y: auto;">
          <h4 style="text-align: center;">编辑物品</h4>
          <ItemForm
            :item="item"
            :family-id="familyId"
            :default-storage-id="item.storage_spot_id"
            :default-house-id="locationInfo.houseId"
            :default-room-id="locationInfo.roomId"
            @save="handleFormSave"
            @cancel="formVisible = false"
          />
        </div>
      </div>
    </Teleport>

    <!-- Move dialog -->
    <MoveItemDialog
      v-model:visible="moveVisible"
      :item-id="itemId"
      :family-id="familyId"
      :current-storage-id="item ? item.storage_spot_id : null"
      @moved="onItemMoved"
    />

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      title="删除物品"
      :message="'确定要删除「' + (item ? item.name : '') + '」吗？此操作不可撤销。'"
      confirm-text="删除"
      :danger="true"
      @confirm="handleDelete"
    />
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import { compressImage } from '@/utils/image'
import AppLayout from '@/layouts/AppLayout.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import PropertyList from '@/components/PropertyList.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import ItemForm from '@/components/ItemForm.vue'
import MoveItemDialog from '@/components/MoveItemDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const familyStore = useFamilyStore()
const { show } = useToast()

const itemId = computed(() => Number(route.params.id))
const familyId = computed(() => {
  const id = familyStore.currentFamilyId
  return id ? Number(id) : 0
})

// Data
const item = ref(null)
const loading = ref(false)
const locationInfo = ref({
  houseId: null,
  houseName: '',
  roomId: null,
  roomName: '',
  storageId: null,
  storageName: ''
})
const fileInput = ref(null)

// Form modal
const formVisible = ref(false)

// Move dialog
const moveVisible = ref(false)

// Delete dialog
const deleteVisible = ref(false)

// PropertyList items
const propertyItems = computed(() => {
  if (!item.value) return []
  return [
    { label: '名称', value: item.value.name },
    { label: '分类', value: item.value.category_name || '未分类', badge: true, badgeType: item.value.category_name ? 'primary' : 'neutral' },
    { label: '数量', value: item.value.quantity || 1 },
    { label: '位置', value: item.value.location_path || '-', accent: true, link: item.value.storage_spot_id ? '/storage/' + item.value.storage_spot_id + '/items' : '' },
    { label: '备注', value: item.value.note || '-' },
    { label: '添加人', value: item.value.creator_name || '-' },
    { label: '添加时间', value: formatDate(item.value.created_at) },
    { label: '修改时间', value: formatDate(item.value.updated_at) },
  ]
})

async function fetchItem() {
  loading.value = true
  try {
    const res = await api.get('/items/' + itemId.value)
    item.value = res.data
    if (item.value) {
      fetchLocationInfo(item.value)
    }
  } catch {
    item.value = null
  } finally {
    loading.value = false
  }
}

function fetchLocationInfo(itemData) {
  if (!itemData) return
  locationInfo.value = {
    houseId: itemData.house_id || null,
    houseName: itemData.house_name || '',
    roomId: itemData.room_id || null,
    roomName: itemData.room_name || '',
    storageId: itemData.storage_spot_id || null,
    storageName: itemData.storage_name || ''
  }
}

function openEdit() {
  formVisible.value = true
}

function openMove() {
  moveVisible.value = true
}

function openDelete() {
  deleteVisible.value = true
}

async function handleFormSave(formData) {
  try {
    // Handle new photo uploads
    const newPhotos = formData.photos?.filter(p => p.isNew && p.file) || []
    for (const photo of newPhotos) {
      const photoFormData = new FormData()
      photoFormData.append('photo', photo.file, 'photo.jpg')
      await api.upload('/items/' + itemId.value + '/photos', photoFormData)
    }

    // Handle deleted photos
    const deletedIds = formData.deletedPhotoIds || []
    for (const photoId of deletedIds) {
      await api.del('/photos/' + photoId)
    }

    // If custom storage name provided, create the storage spot first
    let storageSpotId = formData.storage_spot_id
    if (!storageSpotId && formData.custom_storage_name && formData.room_id) {
      const res = await api.post('/storage', { room_id: formData.room_id, name: formData.custom_storage_name })
      storageSpotId = res.data.id
    }

    // Update item basic info (without photos array)
    const updateData = {
      name: formData.name,
      category_id: formData.category_id,
      quantity: formData.quantity,
      note: formData.note,
      storage_spot_id: storageSpotId,
      house_id: formData.house_id,
      room_id: formData.room_id
    }
    await api.put('/items/' + itemId.value, updateData)

    show('物品已更新', 'success')
    formVisible.value = false
    fetchItem()
  } catch (err) {
    show(err.message || '更新失败', 'error')
  }
}

function onItemMoved() {
  fetchItem()
}

async function handleDelete() {
  try {
    await api.del('/items/' + itemId.value)
    show('物品已删除', 'success')
    deleteVisible.value = false
    if (item.value && item.value.storage_spot_id) {
      router.push('/storage/' + item.value.storage_spot_id + '/items')
    } else {
      router.push('/')
    }
  } catch (err) {
    show(err.message || '删除失败', 'error')
  }
}

function handlePhotoAdd() {
  fileInput.value.click()
}

async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append('photo', compressed, 'photo.jpg')
    await api.upload('/items/' + itemId.value + '/photos', formData)
    show('照片已添加', 'success')
    fetchItem()
  } catch (err) {
    show(err.message || '上传失败', 'error')
  }
  e.target.value = ''
}

async function handlePhotoDelete(photoId) {
  try {
    await api.del('/photos/' + photoId)
    show('照片已删除', 'success')
    fetchItem()
  } catch (err) {
    show(err.message || '删除失败', 'error')
  }
}

function handlePhotoPreview(photo) {
  window.open(photo.url, '_blank')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

watch(itemId, () => {
  fetchItem()
})

onMounted(() => {
  fetchItem()
})
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.detail-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-black);
  color: var(--color-neutral-900);
  letter-spacing: -0.5px;
  margin: 0;
}

.detail-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-actions {
    width: 100%;
  }

  .detail-actions .btn {
    flex: 1;
  }
}
</style>
