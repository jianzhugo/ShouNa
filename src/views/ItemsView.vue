<template>
  <AppLayout>
    <!-- Mobile breadcrumb -->
    <nav class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <router-link v-if="locationNames.houseName" :to="'/houses/' + locationNames.houseId + '/rooms'">{{ locationNames.houseName }}</router-link>
      <span v-if="locationNames.houseName" class="sep">/</span>
      <router-link v-if="locationNames.roomName" :to="'/rooms/' + locationNames.roomId + '/storage'">{{ locationNames.roomName }}</router-link>
      <span v-if="locationNames.roomName" class="sep">/</span>
      <router-link v-if="locationNames.storageName" :to="'/storage/' + storageId + '/items'">{{ locationNames.storageName }}</router-link>
      <span v-if="locationNames.storageName" class="sep">/</span>
      <span class="current">物品</span>
    </nav>

    <!-- Mobile header -->
    <header class="mobile-header">
      <h2>物品管理</h2>
      <p v-if="locationNames.storageName">{{ locationNames.storageName }}</p>
    </header>

    <!-- PC toolbar -->
    <template v-if="false"><!-- handled by AppLayout breadcrumb --></template>

    <!-- SearchBar -->
    <SearchBar v-model="searchQuery" placeholder="搜索物品名称..." @search="fetchItems" />

    <!-- FilterChips -->
    <FilterChips :items="filterItems" :active-id="activeCategory" @filter="handleFilter" />

    <!-- Loading -->
    <SkeletonLoader v-if="loading" type="table" :count="5" />

    <!-- Empty -->
    <EmptyState
      v-else-if="items.length === 0"
      icon="fa-solid fa-box-open"
      text="暂无物品"
      hint="点击添加物品开始收纳管理"
    />

    <!-- PC: data table -->
    <table v-else class="app-table">
      <thead>
        <tr>
          <th>物品</th>
          <th>分类</th>
          <th>数量</th>
          <th>备注</th>
          <th>添加时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>
            <router-link :to="'/items/' + item.id" class="table-name-cell">
              <img
                v-if="item.photos && item.photos.length > 0"
                :src="item.photos[0].url"
                :alt="item.name"
                class="table-thumb"
              />
              <div v-else class="table-thumb" style="display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-box" style="color: var(--color-secondary); font-size: var(--text-sm);"></i>
              </div>
              <span>{{ item.name }}</span>
            </router-link>
          </td>
          <td>
            <span v-if="item.category_name" class="badge badge-primary">{{ item.category_name }}</span>
            <span v-else class="badge badge-neutral">未分类</span>
          </td>
          <td>{{ item.quantity || 1 }}</td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.note || '-' }}</td>
          <td>{{ formatDate(item.created_at) }}</td>
          <td>
            <div class="table-actions">
              <button class="table-action-btn" title="编辑" @click="openEdit(item)">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="table-action-btn" title="移动" @click="openMove(item)">
                <i class="fa-solid fa-arrow-right-arrow-left"></i>
              </button>
              <button class="table-action-btn danger" title="删除" @click="openDelete(item)">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Mobile: card list -->
    <div v-if="!loading && items.length > 0" class="mobile-item-list">
      <router-link
        v-for="item in items"
        :key="item.id"
        :to="'/items/' + item.id"
        class="mobile-item-card"
      >
        <img
          v-if="item.photos && item.photos.length > 0"
          :src="item.photos[0].url"
          :alt="item.name"
          class="mobile-item-thumb"
        />
        <div v-else class="mobile-item-icon">
          <i class="fa-solid fa-box"></i>
        </div>
        <div class="mobile-item-info">
          <div class="mobile-item-name">{{ item.name }}</div>
          <div class="mobile-item-meta">
            <span v-if="item.category_name" class="badge badge-primary">{{ item.category_name }}</span>
            <span class="mobile-item-qty">x{{ item.quantity || 1 }}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right mobile-item-arrow"></i>
      </router-link>
    </div>

    <!-- PaginationBar -->
    <PaginationBar
      v-if="total > 0"
      :page="page"
      :limit="limit"
      :total="total"
      @change="handlePageChange"
    />

    <!-- FAB (mobile) -->
    <button class="fab" @click="openAdd">
      <i class="fa-solid fa-plus"></i>
    </button>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="formVisible" class="modal-overlay" @click.self="formVisible = false">
        <div class="modal-box" style="width: 480px; text-align: left; max-height: 80vh; overflow-y: auto;">
          <h4 style="text-align: center;">{{ editingItem ? '编辑物品' : '添加物品' }}</h4>
          <ItemForm
            :item="editingItem"
            :family-id="familyId"
            :default-storage-id="Number(storageId)"
            @save="handleFormSave"
            @cancel="formVisible = false"
          />
        </div>
      </div>
    </Teleport>

    <!-- Move dialog -->
    <MoveItemDialog
      v-model:visible="moveVisible"
      :item-id="moveItemId"
      :family-id="familyId"
      :current-storage-id="Number(storageId)"
      @moved="onItemMoved"
    />

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      title="删除物品"
      :message="'确定要删除「' + (deleteItemName || '') + '」吗？此操作不可撤销。'"
      confirm-text="删除"
      :danger="true"
      @confirm="handleDelete"
    />
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import AppLayout from '@/layouts/AppLayout.vue'
import SearchBar from '@/components/SearchBar.vue'
import FilterChips from '@/components/FilterChips.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import EmptyState from '@/components/EmptyState.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import ItemForm from '@/components/ItemForm.vue'
import MoveItemDialog from '@/components/MoveItemDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const familyStore = useFamilyStore()
const { show } = useToast()

const storageId = computed(() => route.params.storageId)
const familyId = computed(() => {
  const id = familyStore.currentFamilyId
  return id ? Number(id) : 0
})

// Data
const items = ref([])
const loading = ref(false)
const searchQuery = ref('')
const activeCategory = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const categories = ref([])

// Location names for breadcrumb
const locationNames = ref({
  houseId: null,
  houseName: '',
  roomId: null,
  roomName: '',
  storageName: ''
})

// Form modal
const formVisible = ref(false)
const editingItem = ref(null)

// Move dialog
const moveVisible = ref(false)
const moveItemId = ref(null)

// Delete dialog
const deleteVisible = ref(false)
const deleteItemId = ref(null)
const deleteItemName = ref('')

// Filter items: "全部" + categories
const filterItems = computed(() => {
  const all = [{ id: '', name: '全部' }]
  return all.concat(categories.value.map(c => ({ id: c.id, name: c.name })))
})

async function fetchLocationInfo() {
  try {
    const res = await api.get('/storage-spots/' + storageId.value)
    const data = res.data
    locationNames.value = {
      houseId: data.house_id,
      houseName: data.house_name || '',
      roomId: data.room_id,
      roomName: data.room_name || '',
      storageName: data.name || ''
    }
  } catch {
    locationNames.value = { houseId: null, houseName: '', roomId: null, roomName: '', storageName: '' }
  }
}

async function fetchCategories() {
  if (!familyId.value) return
  try {
    const res = await api.get('/categories?family=' + familyId.value)
    categories.value = res.data || []
  } catch {
    categories.value = []
  }
}

async function fetchItems() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      storage: storageId.value,
      page: page.value,
      limit: limit.value
    })
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (activeCategory.value) params.set('category', activeCategory.value)

    const res = await api.get('/items?' + params.toString())
    items.value = res.data || []
    total.value = res.total || 0
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleFilter(categoryId) {
  activeCategory.value = categoryId
  page.value = 1
  fetchItems()
}

function handlePageChange(p) {
  page.value = p
  fetchItems()
}

function openAdd() {
  editingItem.value = null
  formVisible.value = true
}

function openEdit(item) {
  editingItem.value = { ...item }
  formVisible.value = true
}

function openMove(item) {
  moveItemId.value = item.id
  moveVisible.value = true
}

function openDelete(item) {
  deleteItemId.value = item.id
  deleteItemName.value = item.name
  deleteVisible.value = true
}

async function handleFormSave(formData) {
  try {
    if (editingItem.value) {
      await api.put('/items/' + editingItem.value.id, formData)
      show('物品已更新', 'success')
    } else {
      await api.post('/items', formData)
      show('物品已添加', 'success')
    }
    formVisible.value = false
    editingItem.value = null
    fetchItems()
  } catch (err) {
    show(err.message || '操作失败', 'error')
  }
}

function onItemMoved() {
  fetchItems()
}

async function handleDelete() {
  if (!deleteItemId.value) return
  try {
    await api.del('/items/' + deleteItemId.value)
    show('物品已删除', 'success')
    deleteVisible.value = false
    deleteItemId.value = null
    deleteItemName.value = ''
    fetchItems()
  } catch (err) {
    show(err.message || '删除失败', 'error')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

watch(storageId, () => {
  page.value = 1
  activeCategory.value = ''
  searchQuery.value = ''
  fetchLocationInfo()
  fetchCategories()
  fetchItems()
})

onMounted(() => {
  fetchLocationInfo()
  fetchCategories()
  fetchItems()
})
</script>

<style scoped>
.mobile-item-list {
  display: none;
}

@media (max-width: 767px) {
  .mobile-item-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .app-table {
    display: none;
  }
}

.mobile-item-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast);
}

.mobile-item-card:hover {
  border-color: var(--color-primary);
}

.mobile-item-thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--border-color);
  flex-shrink: 0;
}

.mobile-item-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: var(--text-lg);
  flex-shrink: 0;
}

.mobile-item-info {
  flex: 1;
  min-width: 0;
}

.mobile-item-name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-item-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.mobile-item-qty {
  font-size: var(--text-xs);
  color: var(--color-secondary);
}

.mobile-item-arrow {
  color: var(--border-color);
  font-size: var(--text-sm);
  flex-shrink: 0;
}
</style>
