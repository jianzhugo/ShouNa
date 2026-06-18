<template>
  <AppLayout>
    <section class="all-rooms-view">
      <!-- Mobile breadcrumb -->
      <nav class="breadcrumb" aria-label="面包屑导航">
        <router-link to="/">首页</router-link>
        <span class="sep">/</span>
        <span class="current">房间</span>
      </nav>

      <!-- Mobile header -->
      <header class="mobile-header">
        <h2>房间</h2>
        <p>{{ rooms.length }}个房间</p>
      </header>

      <!-- PC page header -->
      <header class="page-header">
        <div class="page-header-row">
          <div>
            <h2>房间</h2>
            <p>{{ rooms.length }}个房间</p>
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
        hint="请先在住所中添加房间"
      />

      <!-- Grouped by house -->
      <div v-else>
        <section v-for="group in groupedRooms" :key="group.houseId" class="room-group">
          <h3 class="group-title">
            <i class="fa-solid fa-building"></i>
            {{ group.houseName }}
            <span class="group-count">{{ group.rooms.length }}个房间</span>
          </h3>
          <div class="card-grid">
            <AppCard
              v-for="room in group.rooms"
              :key="room.id"
              :icon="getRoomIcon(room.name)"
              :icon-bg="getRoomColor(room.name).bg"
              :icon-color="getRoomColor(room.name).color"
              :title="room.name"
              :subtitle="`${room.storage_count || 0}个收纳位 · ${room.item_count || 0}件物品`"
              :to="`/rooms/${room.id}/storage`"
            />
          </div>
        </section>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import AppLayout from '@/layouts/AppLayout.vue'
import AppCard from '@/components/AppCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const familyStore = useFamilyStore()
const { show: showToast } = useToast()

const familyId = computed(() => familyStore.currentFamilyId)
const rooms = ref([])
const loading = ref(true)

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

// 按住所分组
const groupedRooms = computed(() => {
  const map = new Map()
  for (const room of rooms.value) {
    const key = room.house_id
    if (!map.has(key)) {
      map.set(key, { houseId: key, houseName: room.house_name || '未知住所', rooms: [] })
    }
    map.get(key).rooms.push(room)
  }
  return Array.from(map.values())
})

async function fetchRooms() {
  if (!familyId.value) return
  loading.value = true
  try {
    const res = await api.get('/rooms?family=' + familyId.value)
    rooms.value = res.data || []
  } catch {
    rooms.value = []
    showToast('获取房间列表失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRooms()
})
</script>

<style scoped>
.all-rooms-view {
  position: relative;
  min-height: 100%;
}

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.room-group {
  margin-bottom: var(--space-6);
}

.room-group:last-child {
  margin-bottom: 0;
}

.group-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.group-title i {
  color: var(--color-secondary);
  font-size: var(--text-sm);
}

.group-count {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--color-text-tertiary);
  margin-left: var(--space-1);
}
</style>
