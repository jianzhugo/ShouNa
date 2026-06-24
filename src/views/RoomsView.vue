<template>
  <AppLayout>
    <section class="rooms-view">
      <!-- Mobile breadcrumb -->
      <nav class="breadcrumb" aria-label="面包屑导航">
        <router-link to="/">首页</router-link>
        <span class="sep">/</span>
        <router-link to="/houses">{{ houseName }}</router-link>
        <span class="sep">/</span>
        <span class="current">房间</span>
      </nav>

      <!-- Mobile header -->
      <header class="mobile-header">
        <h2>房间</h2>
        <p>{{ houseName }}</p>
      </header>

      <!-- PC page header -->
      <header class="page-header">
        <div class="page-header-row">
          <div>
            <h2>房间</h2>
            <p>{{ houseName }}</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" @click="showAddModal = true">
              <i class="fa-solid fa-plus"></i>
              添加房间
            </button>
          </div>
        </div>
      </header>

      <!-- Loading -->
      <SkeletonLoader v-if="loading" :count="3" type="card" />

      <!-- Empty -->
      <EmptyState
        v-else-if="rooms.length === 0"
        icon="fa-solid fa-door-open"
        text="还没有添加房间"
        hint="点击下方按钮添加房间"
      />

      <!-- Card grid -->
      <div v-else class="card-grid">
        <AppCard
          v-for="room in rooms"
          :key="room.id"
          :icon="getRoomIcon(room.name)"
          :icon-bg="getRoomColor(room.name).bg"
          :icon-color="getRoomColor(room.name).color"
          :title="room.name"
          :subtitle="`${room.storage_count || 0}个收纳位 · ${room.item_count || 0}件物品`"
          :to="`/rooms/${room.id}/storage`"
        >
          <template #actions>
            <button class="card-delete-btn" @click.prevent.stop="confirmDelete(room)" aria-label="删除房间">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </template>
        </AppCard>
      </div>

      <!-- Add room modal -->
      <Teleport to="body">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal-box" style="text-align: left;">
            <h4 style="text-align: center;">添加房间</h4>
            <div class="form-group">
              <label class="form-label" for="room-name">房间名称</label>
              <input
                id="room-name"
                v-model="newRoomName"
                class="form-input"
                list="room-presets"
                placeholder="输入或选择房间类型"
                @keyup.enter="addRoom"
              />
              <datalist id="room-presets">
                <option value="客厅"></option>
                <option value="主卧"></option>
                <option value="次卧"></option>
                <option value="厨房"></option>
                <option value="卫生间"></option>
                <option value="阳台"></option>
                <option value="储物间"></option>
                <option value="书房"></option>
              </datalist>
            </div>
            <div class="modal-btns">
              <button class="btn btn-outline" @click="showAddModal = false">取消</button>
              <button class="btn btn-primary" :disabled="!newRoomName.trim()" @click="addRoom">添加</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Delete confirm dialog -->
      <ConfirmDialog
        v-model:visible="showDeleteConfirm"
        title="删除房间"
        :message="`确定要删除「${deleteTarget?.name || ''}」吗？该房间下的所有收纳位和物品都会被删除，此操作不可恢复。`"
        confirm-text="删除"
        cancel-text="取消"
        :danger="true"
        @confirm="deleteRoom"
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

const houseId = computed(() => route.params.houseId)
const familyId = computed(() => familyStore.currentFamilyId)

const rooms = ref([])
const houseName = ref('')
const loading = ref(true)
const showAddModal = ref(false)
const newRoomName = ref('')
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const { pendingAction, clearAction } = useFab()

const ROOM_COLORS = {
  '客厅': { bg: '#FFF1EB', color: 'var(--color-primary)' },
  '主卧': { bg: '#F0FDF4', color: 'var(--color-success)' },
  '次卧': { bg: '#EFF6FF', color: 'var(--color-info)' },
  '厨房': { bg: '#FEF3C7', color: 'var(--color-warning)' },
  '卫生间': { bg: '#FDF2F8', color: 'var(--color-pink)' },
  '阳台': { bg: '#ECFDF5', color: 'var(--color-success)' },
  '储物间': { bg: '#F3F4F6', color: 'var(--color-secondary)' },
  '书房': { bg: '#EDE9FE', color: '#7C3AED' }
}

const DEFAULT_ROOM_COLOR = { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' }

function getRoomColor(name) {
  return ROOM_COLORS[name] || DEFAULT_ROOM_COLOR
}

function getRoomIcon(name) {
  const iconMap = {
    '客厅': 'fa-solid fa-couch',
    '主卧': 'fa-solid fa-bed',
    '次卧': 'fa-solid fa-bed',
    '厨房': 'fa-solid fa-kitchen-set',
    '卫生间': 'fa-solid fa-bath',
    '阳台': 'fa-solid fa-sun',
    '储物间': 'fa-solid fa-warehouse',
    '书房': 'fa-solid fa-book'
  }
  return iconMap[name] || 'fa-solid fa-door-open'
}

async function fetchHouseName() {
  try {
    const res = await api.get('/houses/' + houseId.value)
    houseName.value = res.data?.name || '住所'
  } catch {
    houseName.value = '住所'
  }
}

async function fetchRooms() {
  loading.value = true
  try {
    const res = await api.get('/rooms?house=' + houseId.value)
    rooms.value = res.data || []
  } catch {
    rooms.value = []
    showToast('获取房间列表失败', 'error')
  } finally {
    loading.value = false
  }
}

async function addRoom() {
  const name = newRoomName.value.trim()
  if (!name) return
  try {
    const res = await api.post('/rooms', { house_id: Number(houseId.value), name })
    rooms.value.push(res.data)
    newRoomName.value = ''
    showAddModal.value = false
    showToast('房间添加成功')
  } catch {
    showToast('添加房间失败', 'error')
  }
}

function confirmDelete(room) {
  deleteTarget.value = room
  showDeleteConfirm.value = true
}

async function deleteRoom() {
  if (!deleteTarget.value) return
  try {
    await api.del('/rooms/' + deleteTarget.value.id)
    rooms.value = rooms.value.filter(r => r.id !== deleteTarget.value.id)
    showToast('房间已删除')
  } catch {
    showToast('删除房间失败', 'error')
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
  fetchHouseName()
  fetchRooms()
})
</script>

<style scoped>
.rooms-view {
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
