<template>
  <AppLayout>
    <section class="houses-view">
      <!-- Mobile breadcrumb -->
      <nav class="breadcrumb" aria-label="面包屑导航">
        <router-link to="/">首页</router-link>
        <span class="sep">/</span>
        <span class="current">住所</span>
      </nav>

      <!-- Mobile header -->
      <header class="mobile-header">
        <h2>住所</h2>
        <p>管理你的房屋和房间</p>
      </header>

      <!-- PC page header -->
      <header class="page-header">
        <div class="page-header-row">
          <div>
            <h2>住所</h2>
            <p>管理你的房屋和房间</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" @click="showAddModal = true">
              <i class="fa-solid fa-plus"></i>
              添加住所
            </button>
          </div>
        </div>
      </header>

      <!-- Loading -->
      <SkeletonLoader v-if="loading" :count="3" type="card" />

      <!-- Empty -->
      <EmptyState
        v-else-if="houses.length === 0"
        icon="fa-solid fa-house"
        text="还没有添加住所"
        hint="点击下方按钮添加你的第一个住所"
      />

      <!-- Card grid -->
      <div v-else class="card-grid">
        <AppCard
          v-for="house in houses"
          :key="house.id"
          icon="fa-solid fa-house"
          icon-bg="var(--color-primary-light)"
          icon-color="var(--color-primary)"
          :title="house.name"
          :subtitle="`${house.room_count || 0}个房间 · ${house.item_count || 0}件物品`"
          :to="`/houses/${house.id}/rooms`"
          @click.right.prevent
        >
          <template #actions>
            <button class="card-delete-btn" @click.prevent.stop="confirmDelete(house)" aria-label="删除住所">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </template>
        </AppCard>
      </div>

      <!-- FAB (mobile) -->
      <button class="fab" @click="fabOpen = !fabOpen" aria-label="添加">
        <i :class="fabOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-plus'"></i>
      </button>
      <div v-if="fabOpen" class="fab-menu">
        <button class="fab-menu-item add-current" @click="showAddModal = true; fabOpen = false">
          <i class="fa-solid fa-house"></i>
          添加住所
        </button>
        <button class="fab-menu-item add-item" @click="showItemForm = true; fabOpen = false">
          <i class="fa-solid fa-box"></i>
          直接添加物品
        </button>
      </div>

      <!-- Add house modal -->
      <Teleport to="body">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal-box" style="text-align: left;">
            <h4 style="text-align: center;">添加住所</h4>
            <div class="form-group">
              <label class="form-label" for="house-name">住所名称</label>
              <input
                id="house-name"
                v-model="newHouseName"
                class="form-input"
                placeholder="例如：家、公司宿舍"
                @keyup.enter="addHouse"
              />
            </div>
            <div class="modal-btns">
              <button class="btn btn-outline" @click="showAddModal = false">取消</button>
              <button class="btn btn-primary" :disabled="!newHouseName.trim()" @click="addHouse">添加</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Delete confirm dialog -->
      <ConfirmDialog
        v-model:visible="showDeleteConfirm"
        title="删除住所"
        :message="`确定要删除「${deleteTarget?.name || ''}」吗？该住所下的所有房间和物品都会被删除，此操作不可恢复。`"
        confirm-text="删除"
        cancel-text="取消"
        :danger="true"
        @confirm="deleteHouse"
      />

      <!-- Item form bottom sheet (mobile) / modal (PC) -->
      <Teleport to="body">
        <div v-if="showItemForm" class="bottom-sheet-overlay" @click.self="showItemForm = false"></div>
        <div v-if="showItemForm" class="bottom-sheet">
          <div class="sheet-handle"></div>
          <h3>添加物品</h3>
          <ItemForm
            :family-id="familyId"
            @save="onItemSave"
            @cancel="showItemForm = false"
          />
        </div>
      </Teleport>
    </section>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import AppLayout from '@/layouts/AppLayout.vue'
import AppCard from '@/components/AppCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ItemForm from '@/components/ItemForm.vue'

const router = useRouter()
const familyStore = useFamilyStore()
const { show: showToast } = useToast()

const houses = ref([])
const loading = ref(true)
const showAddModal = ref(false)
const newHouseName = ref('')
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const fabOpen = ref(false)
const showItemForm = ref(false)

const familyId = computed(() => familyStore.currentFamilyId)

async function fetchHouses() {
  loading.value = true
  try {
    const res = await api.get('/houses?family=' + familyId.value)
    houses.value = res.data || []
  } catch {
    houses.value = []
    showToast('获取住所列表失败', 'error')
  } finally {
    loading.value = false
  }
}

async function addHouse() {
  const name = newHouseName.value.trim()
  if (!name) return
  try {
    const res = await api.post('/houses', { family_id: familyId.value, name })
    houses.value.push(res.data)
    newHouseName.value = ''
    showAddModal.value = false
    showToast('住所添加成功')
  } catch {
    showToast('添加住所失败', 'error')
  }
}

function confirmDelete(house) {
  deleteTarget.value = house
  showDeleteConfirm.value = true
}

async function deleteHouse() {
  if (!deleteTarget.value) return
  try {
    await api.del('/houses/' + deleteTarget.value.id)
    houses.value = houses.value.filter(h => h.id !== deleteTarget.value.id)
    showToast('住所已删除')
  } catch {
    showToast('删除住所失败', 'error')
  } finally {
    deleteTarget.value = null
  }
}

async function onItemSave(itemData) {
  try {
    await api.post('/items', itemData)
    showItemForm.value = false
    showToast('物品添加成功')
  } catch {
    showToast('添加物品失败', 'error')
  }
}

onMounted(() => {
  fetchHouses()
})
</script>

<style scoped>
.houses-view {
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

.card-grid .app-card {
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
