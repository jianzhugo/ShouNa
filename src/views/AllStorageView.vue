<template>
  <AppLayout>
    <section class="all-storage-view">
      <!-- Mobile breadcrumb -->
      <nav class="breadcrumb" aria-label="面包屑导航">
        <router-link to="/">首页</router-link>
        <span class="sep">/</span>
        <span class="current">收纳位</span>
      </nav>

      <!-- Mobile header -->
      <header class="mobile-header">
        <h2>收纳位</h2>
        <p>{{ storages.length }}个收纳位</p>
      </header>

      <!-- PC page header -->
      <header class="page-header">
        <div class="page-header-row">
          <div>
            <h2>收纳位</h2>
            <p>{{ storages.length }}个收纳位</p>
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
        hint="请先在房间中添加收纳位"
      />

      <!-- Grouped by room -->
      <div v-else>
        <section v-for="group in groupedStorages" :key="group.roomId" class="storage-group">
          <h3 class="group-title">
            <i class="fa-solid fa-door-open"></i>
            {{ group.houseName }} · {{ group.roomName }}
            <span class="group-count">{{ group.storages.length }}个收纳位</span>
          </h3>
          <div class="card-grid">
            <AppCard
              v-for="spot in group.storages"
              :key="spot.id"
              :icon="getStorageIcon(spot.name)"
              :icon-bg="getStorageColor(spot.name).bg"
              :icon-color="getStorageColor(spot.name).color"
              :title="spot.name"
              :subtitle="`${spot.item_count || 0}件物品`"
              :to="`/storage/${spot.id}/items`"
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
const storages = ref([])
const loading = ref(true)

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

// 按房间分组
const groupedStorages = computed(() => {
  const map = new Map()
  for (const spot of storages.value) {
    const key = spot.room_id
    if (!map.has(key)) {
      map.set(key, {
        roomId: key,
        roomName: spot.room_name || '未知房间',
        houseName: spot.house_name || '未知住所',
        storages: []
      })
    }
    map.get(key).storages.push(spot)
  }
  return Array.from(map.values())
})

async function fetchStorages() {
  if (!familyId.value) return
  loading.value = true
  try {
    const res = await api.get('/storage?family=' + familyId.value)
    storages.value = res.data || []
  } catch {
    storages.value = []
    showToast('获取收纳位列表失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStorages()
})
</script>

<style scoped>
.all-storage-view {
  position: relative;
  min-height: 100%;
}

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.storage-group {
  margin-bottom: var(--space-6);
}

.storage-group:last-child {
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
