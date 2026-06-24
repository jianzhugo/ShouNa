<template>
  <AppLayout>
    <section class="storage-view">
      <!-- Mobile breadcrumb -->
      <nav class="breadcrumb" aria-label="面包屑导航">
        <router-link to="/">首页</router-link>
        <span class="sep">/</span>
        <router-link to="/houses">{{ houseName }}</router-link>
        <span class="sep">/</span>
        <router-link :to="`/houses/${houseId}/rooms`">{{ roomName }}</router-link>
        <span class="sep">/</span>
        <span class="current">收纳位</span>
      </nav>

      <!-- Mobile header -->
      <header class="mobile-header">
        <h2>收纳位</h2>
        <p>{{ houseName }} · {{ roomName }}</p>
      </header>

      <!-- PC page header -->
      <header class="page-header">
        <div class="page-header-row">
          <div>
            <h2>收纳位</h2>
            <p>{{ houseName }} · {{ roomName }}</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" @click="showAddModal = true">
              <i class="fa-solid fa-plus"></i>
              添加收纳位
            </button>
          </div>
        </div>
      </header>

      <!-- Loading -->
      <SkeletonLoader v-if="loading" :count="3" type="card" />

      <!-- Empty -->
      <EmptyState
        v-else-if="storages.length === 0"
        icon="fa-solid fa-box-archive"
        text="还没有添加收纳位"
        hint="点击下方按钮添加收纳位"
      />

      <!-- Card grid -->
      <div v-else class="card-grid">
        <AppCard
          v-for="spot in storages"
          :key="spot.id"
          :icon="getStorageIcon(spot.name)"
          :icon-bg="getStorageColor(spot.name).bg"
          :icon-color="getStorageColor(spot.name).color"
          :title="spot.name"
          :subtitle="`${spot.item_count || 0}件物品`"
          :to="`/storage/${spot.id}/items`"
        >
          <template #actions>
            <button class="card-delete-btn" @click.prevent.stop="confirmDelete(spot)" aria-label="删除收纳位">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </template>
        </AppCard>
      </div>

      <!-- Add storage modal -->
      <Teleport to="body">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal-box" style="text-align: left;">
            <h4 style="text-align: center;">添加收纳位</h4>
            <div class="form-group">
              <label class="form-label" for="storage-name">收纳位名称</label>
              <input
                id="storage-name"
                v-model="newStorageName"
                class="form-input"
                list="storage-presets"
                placeholder="输入或选择收纳位类型"
                @keyup.enter="addStorage"
              />
              <datalist id="storage-presets">
                <option value="衣柜"></option>
                <option value="床头柜"></option>
                <option value="电视柜"></option>
                <option value="书桌抽屉"></option>
                <option value="收纳箱"></option>
                <option value="吊柜"></option>
                <option value="鞋柜"></option>
                <option value="橱柜"></option>
              </datalist>
            </div>
            <div class="modal-btns">
              <button class="btn btn-outline" @click="showAddModal = false">取消</button>
              <button class="btn btn-primary" :disabled="!newStorageName.trim()" @click="addStorage">添加</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Delete confirm dialog -->
      <ConfirmDialog
        v-model:visible="showDeleteConfirm"
        title="删除收纳位"
        :message="`确定要删除「${deleteTarget?.name || ''}」吗？该收纳位下的所有物品都会被删除，此操作不可恢复。`"
        confirm-text="删除"
        cancel-text="取消"
        :danger="true"
        @confirm="deleteStorage"
      />

    </section>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import AppLayout from '@/layouts/AppLayout.vue'
import AppCard from '@/components/AppCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useFab } from '@/composables/useFab'

const route = useRoute()
const familyStore = useFamilyStore()
const { show: showToast } = useToast()

const roomId = computed(() => route.params.roomId)
const familyId = computed(() => familyStore.currentFamilyId)

const storages = ref([])
const houseName = ref('')
const roomName = ref('')
const houseId = ref(null)
const loading = ref(true)
const showAddModal = ref(false)
const newStorageName = ref('')
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const { pendingAction, clearAction } = useFab()

const STORAGE_COLORS = {
  '衣柜': { bg: '#FFF1EB', color: 'var(--color-primary)' },
  '床头柜': { bg: '#F0FDF4', color: 'var(--color-success)' },
  '电视柜': { bg: '#EFF6FF', color: 'var(--color-info)' },
  '书桌抽屉': { bg: '#FEF3C7', color: 'var(--color-warning)' },
  '收纳箱': { bg: '#FDF2F8', color: 'var(--color-pink)' },
  '吊柜': { bg: '#F3F4F6', color: 'var(--color-secondary)' },
  '鞋柜': { bg: '#ECFDF5', color: 'var(--color-success)' },
  '橱柜': { bg: '#EDE9FE', color: '#7C3AED' }
}

const DEFAULT_STORAGE_COLOR = { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' }

function getStorageColor(name) {
  return STORAGE_COLORS[name] || DEFAULT_STORAGE_COLOR
}

function getStorageIcon(name) {
  const iconMap = {
    '衣柜': 'fa-solid fa-shirt',
    '床头柜': 'fa-solid fa-bed',
    '电视柜': 'fa-solid fa-tv',
    '书桌抽屉': 'fa-solid fa-desk',
    '收纳箱': 'fa-solid fa-box',
    '吊柜': 'fa-solid fa-box-open',
    '鞋柜': 'fa-solid fa-shoe-prints',
    '橱柜': 'fa-solid fa-kitchen-set'
  }
  return iconMap[name] || 'fa-solid fa-box-archive'
}

async function fetchRoomInfo() {
  try {
    const res = await api.get('/rooms/' + roomId.value)
    roomName.value = res.data?.name || '房间'
    houseId.value = res.data?.house_id || null
    if (houseId.value) {
      await fetchHouseName()
    }
  } catch {
    roomName.value = '房间'
  }
}

async function fetchHouseName() {
  if (!houseId.value) return
  try {
    const res = await api.get('/houses/' + houseId.value)
    houseName.value = res.data?.name || '住所'
  } catch {
    houseName.value = '住所'
  }
}

async function fetchStorages() {
  loading.value = true
  try {
    const res = await api.get('/storage?room=' + roomId.value)
    storages.value = res.data || []
  } catch {
    storages.value = []
    showToast('获取收纳位列表失败', 'error')
  } finally {
    loading.value = false
  }
}

async function addStorage() {
  const name = newStorageName.value.trim()
  if (!name) return
  try {
    const res = await api.post('/storage', { room_id: Number(roomId.value), name })
    storages.value.push(res.data)
    newStorageName.value = ''
    showAddModal.value = false
    showToast('收纳位添加成功')
  } catch {
    showToast('添加收纳位失败', 'error')
  }
}

function confirmDelete(spot) {
  deleteTarget.value = spot
  showDeleteConfirm.value = true
}

async function deleteStorage() {
  if (!deleteTarget.value) return
  try {
    await api.del('/storage/' + deleteTarget.value.id)
    storages.value = storages.value.filter(s => s.id !== deleteTarget.value.id)
    showToast('收纳位已删除')
  } catch {
    showToast('删除收纳位失败', 'error')
  } finally {
    deleteTarget.value = null
  }
}

watch(pendingAction, (action) => {
  if (action === 'add-current') {
    showAddModal.value = true
    clearAction()
  }
})

onMounted(() => {
  fetchRoomInfo()
  fetchStorages()
})
</script>

<style scoped>
.storage-view {
  position: relative;
  min-height: 100%;
}

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .page-header-actions {
    display: none;
  }
}

.card-grid {
  position: relative;
}

.card-delete-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--color-neutral-400);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
  z-index: 1;
}

.app-card:hover .card-delete-btn {
  opacity: 1;
}

.card-delete-btn:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: var(--color-error-light);
}
</style>
