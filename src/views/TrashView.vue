<template>
  <AppLayout>
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <span class="current">回收站</span>
    </div>
    <div class="mobile-header">
      <h2>回收站</h2>
    </div>
    <section class="trash-page">
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h2>回收站</h2>
            <p>管理已删除的物品和数据</p>
          </div>
          <button
            v-if="items.length > 0"
            class="btn btn-danger"
            @click="showClearAll = true"
          >
            <i class="fa-solid fa-trash"></i>
            清空回收站
          </button>
        </div>
      </div>

      <FilterChips
        :items="typeFilters"
        :activeId="activeType"
        @filter="handleTypeFilter"
      />

      <SkeletonLoader v-if="loading" type="table" :count="5" />

      <EmptyState
        v-else-if="items.length === 0"
        icon="fa-solid fa-trash-can"
        text="回收站为空"
        hint="删除的物品会在这里保留"
      />

      <template v-else>
        <table class="app-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>原位置</th>
              <th>删除时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.type + '-' + item.id">
              <td>
                <span class="table-name-cell">{{ item.name }}</span>
              </td>
              <td>
                <span class="badge" :class="typeBadgeClass(item.type)">{{ typeLabel(item.type) }}</span>
              </td>
              <td>{{ item.original_location || '-' }}</td>
              <td>{{ item.deleted_at || '-' }}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-restore" @click="handleRestore(item)">
                    <i class="fa-solid fa-rotate-left"></i>
                    恢复
                  </button>
                  <button class="btn btn-sm btn-danger" @click="confirmPermanentDelete(item)">
                    <i class="fa-solid fa-xmark"></i>
                    彻底删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <ul class="mobile-trash-list">
          <li v-for="item in items" :key="item.type + '-' + item.id" class="mobile-trash-card">
            <div class="mobile-trash-header">
              <span class="mobile-trash-name">{{ item.name }}</span>
              <span class="badge" :class="typeBadgeClass(item.type)">{{ typeLabel(item.type) }}</span>
            </div>
            <div class="mobile-trash-info">
              <span v-if="item.original_location">
                <i class="fa-solid fa-location-dot"></i>
                {{ item.original_location }}
              </span>
              <span v-if="item.deleted_at">
                <i class="fa-regular fa-clock"></i>
                {{ item.deleted_at }}
              </span>
            </div>
            <div class="mobile-trash-actions">
              <button class="btn btn-sm btn-restore" @click="handleRestore(item)">
                <i class="fa-solid fa-rotate-left"></i>
                恢复
              </button>
              <button class="btn btn-sm btn-danger" @click="confirmPermanentDelete(item)">
                <i class="fa-solid fa-xmark"></i>
                彻底删除
              </button>
            </div>
          </li>
        </ul>
      </template>

      <button
        v-if="items.length > 0"
        class="btn btn-danger btn-block mobile-clear-btn"
        @click="showClearAll = true"
      >
        <i class="fa-solid fa-trash"></i>
        清空回收站
      </button>
    </section>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="彻底删除"
      :message="'确定要彻底删除「' + pendingDelete?.name + '」吗？此操作不可恢复。'"
      confirmText="彻底删除"
      danger
      @confirm="handlePermanentDelete"
    />

    <ConfirmDialog
      v-model:visible="showClearAll"
      title="清空回收站"
      message="确定要清空回收站吗？所有数据将被永久删除，此操作不可恢复。"
      confirmText="全部删除"
      danger
      @confirm="handleClearAll"
    />
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import api from '@/api'
import AppLayout from '@/layouts/AppLayout.vue'
import FilterChips from '@/components/FilterChips.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const familyStore = useFamilyStore()
const { show: showToast } = useToast()

const items = ref([])
const loading = ref(false)
const activeType = ref('')
const showDeleteConfirm = ref(false)
const showClearAll = ref(false)
const pendingDelete = ref(null)

const typeFilters = [
  { id: '', name: '全部' },
  { id: 'item', name: '物品' },
  { id: 'storage', name: '收纳位' },
  { id: 'room', name: '房间' },
  { id: 'house', name: '住所' }
]

function typeLabel(type) {
  const map = { item: '物品', storage: '收纳位', room: '房间', house: '住所' }
  return map[type] || type
}

function typeBadgeClass(type) {
  const map = { item: 'badge-info', storage: 'badge-primary', room: 'badge-warning', house: 'badge-success' }
  return map[type] || 'badge-neutral'
}

async function fetchTrash() {
  const familyId = familyStore.currentFamilyId
  if (!familyId) return

  loading.value = true
  try {
    let url = '/trash?family=' + familyId
    if (activeType.value) {
      url += '&type=' + activeType.value
    }
    const res = await api.get(url)
    items.value = res.data || []
  } catch (err) {
    showToast('加载回收站失败', 'error')
  } finally {
    loading.value = false
  }
}

function handleTypeFilter(id) {
  activeType.value = id
  fetchTrash()
}

async function handleRestore(item) {
  try {
    await api.post('/trash/' + item.type + '/' + item.id + '/restore')
    showToast('已恢复「' + item.name + '」')
    fetchTrash()
  } catch (err) {
    showToast(err.message || '恢复失败', 'error')
  }
}

function confirmPermanentDelete(item) {
  pendingDelete.value = item
  showDeleteConfirm.value = true
}

async function handlePermanentDelete() {
  if (!pendingDelete.value) return
  try {
    await api.del('/trash/' + pendingDelete.value.type + '/' + pendingDelete.value.id)
    showToast('已彻底删除', 'success')
    fetchTrash()
  } catch (err) {
    showToast(err.message || '删除失败', 'error')
  } finally {
    pendingDelete.value = null
  }
}

async function handleClearAll() {
  try {
    const promises = items.value.map(item =>
      api.del('/trash/' + item.type + '/' + item.id)
    )
    await Promise.all(promises)
    showToast('回收站已清空', 'success')
    items.value = []
  } catch (err) {
    showToast('清空失败', 'error')
    fetchTrash()
  }
}

onMounted(() => {
  fetchTrash()
})
</script>

<style scoped>
.trash-page {
  max-width: 960px;
}

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.btn-restore {
  background: var(--color-success-light);
  color: var(--color-success);
}

.btn-restore:hover {
  background: #DCFCE7;
}

.mobile-trash-list {
  display: none;
  list-style: none;
  padding: 0;
  margin: 0;
}

@media (max-width: 767px) {
  .mobile-trash-list {
    display: block;
  }

  .page-header-row .btn-danger {
    display: none;
  }
}

.mobile-trash-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.mobile-trash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.mobile-trash-name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-900);
}

.mobile-trash-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-secondary);
  margin-bottom: var(--space-3);
}

.mobile-trash-info span {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.mobile-trash-info i {
  font-size: 10px;
}

.mobile-trash-actions {
  display: flex;
  gap: var(--space-2);
}

.mobile-clear-btn {
  display: none;
  margin-top: var(--space-4);
}

@media (max-width: 767px) {
  .mobile-clear-btn {
    display: flex;
  }
}
</style>
