<template>
  <AppLayout>
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <span class="current">家庭组管理</span>
    </div>

    <div class="mobile-header">
      <h2>家庭组管理</h2>
      <p>管理你的家庭组</p>
    </div>

    <!-- Page Header -->
    <header class="page-header">
      <div class="page-header-row">
        <div>
          <h2>家庭组管理</h2>
          <p>创建或加入家庭组，与家人一起管理收纳</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="showCreateModal = true">
            <i class="fa-solid fa-plus"></i> 创建家庭组
          </button>
          <button class="btn btn-outline" @click="showJoinModal = true">
            <i class="fa-solid fa-right-to-bracket"></i> 加入家庭组
          </button>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <SkeletonLoader v-if="loading" :count="3" type="card" />

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <i class="fa-solid fa-circle-exclamation"></i>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="fetchFamilies">
        <i class="fa-solid fa-rotate-right"></i> 重试
      </button>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="families.length === 0"
      icon="fa-solid fa-people-group"
      text="暂无家庭组"
      hint="创建或加入一个家庭组开始使用"
    />

    <!-- Family Cards -->
    <section v-else class="card-grid">
      <div
        v-for="family in families"
        :key="family.id"
        class="family-card"
        :class="{ current: family.id === familyStore.currentFamilyId }"
        @click="handleSwitchFamily(family)"
      >
        <div class="family-card-icon">
          <i class="fa-solid fa-house-chimney"></i>
        </div>
        <div class="family-card-body">
          <div class="family-card-name">
            {{ family.name }}
            <span v-if="family.id === familyStore.currentFamilyId" class="badge badge-primary">当前</span>
          </div>
          <div class="family-card-stats">
            <span><i class="fa-solid fa-user"></i> {{ family.member_count || 0 }} 成员</span>
            <span><i class="fa-solid fa-house"></i> {{ family.house_count || 0 }} 房屋</span>
            <span><i class="fa-solid fa-cube"></i> {{ family.item_count || 0 }} 物品</span>
          </div>
        </div>
        <span class="family-card-arrow"><i class="fa-solid fa-chevron-right"></i></span>
      </div>
    </section>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-box">
          <h4>创建家庭组</h4>
          <p>输入家庭组名称，创建后可邀请家人加入</p>
          <div class="form-group">
            <label class="form-label" for="family-name">家庭组名称</label>
            <input
              id="family-name"
              v-model="createName"
              class="form-input"
              placeholder="例如：我的家"
              maxlength="20"
            />
          </div>
          <div class="modal-btns">
            <button class="btn btn-outline" @click="showCreateModal = false">取消</button>
            <button class="btn btn-primary" :disabled="!createName.trim() || creating" @click="handleCreate">
              <i v-if="creating" class="fa-solid fa-spinner fa-spin"></i>
              {{ creating ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Join Modal -->
    <Teleport to="body">
      <div v-if="showJoinModal" class="modal-overlay" @click.self="showJoinModal = false">
        <div class="modal-box">
          <h4>加入家庭组</h4>
          <p>输入邀请码加入已有的家庭组</p>
          <div class="form-group">
            <label class="form-label" for="invite-code">邀请码</label>
            <input
              id="invite-code"
              v-model="inviteCode"
              class="form-input"
              placeholder="请输入邀请码"
              maxlength="10"
            />
          </div>
          <div class="modal-btns">
            <button class="btn btn-outline" @click="showJoinModal = false">取消</button>
            <button class="btn btn-primary" :disabled="!inviteCode.trim() || joining" @click="handleJoin">
              <i v-if="joining" class="fa-solid fa-spinner fa-spin"></i>
              {{ joining ? '加入中...' : '加入' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFamilyStore } from '@/stores/family'
import api from '@/api'
import AppLayout from '@/layouts/AppLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { useToast } from '@/composables/useToast'

const familyStore = useFamilyStore()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const families = ref([])

const showCreateModal = ref(false)
const createName = ref('')
const creating = ref(false)

const showJoinModal = ref(false)
const inviteCode = ref('')
const joining = ref(false)

async function fetchFamilies() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/families')
    families.value = res.data
  } catch (err) {
    error.value = err.message || '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function handleSwitchFamily(family) {
  if (family.id === familyStore.currentFamilyId) return
  familyStore.setCurrentFamily(family.id)
  toast.show('已切换到 ' + family.name, 'success')
}

async function handleCreate() {
  if (!createName.value.trim()) return
  creating.value = true
  try {
    await familyStore.createFamily(createName.value.trim())
    toast.show('家庭组创建成功', 'success')
    showCreateModal.value = false
    createName.value = ''
    await fetchFamilies()
  } catch (err) {
    toast.show(err.message || '创建失败', 'error')
  } finally {
    creating.value = false
  }
}

async function handleJoin() {
  if (!inviteCode.value.trim()) return
  joining.value = true
  try {
    await familyStore.joinFamily(inviteCode.value.trim())
    toast.show('加入成功', 'success')
    showJoinModal.value = false
    inviteCode.value = ''
    await fetchFamilies()
  } catch (err) {
    toast.show(err.message || '加入失败', 'error')
  } finally {
    joining.value = false
  }
}

onMounted(fetchFamilies)
</script>

<style scoped>
.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

@media (max-width: 767px) {
  .page-header-row {
    flex-direction: column;
  }

  .page-header-actions {
    width: 100%;
  }

  .page-header-actions .btn {
    flex: 1;
  }
}

.page-header-actions {
  display: flex;
  gap: var(--space-2);
}

.error-state {
  text-align: center;
  padding: var(--space-10) var(--space-5);
}

.error-state i {
  font-size: 48px;
  color: var(--color-error);
  margin-bottom: var(--space-3);
}

.error-state p {
  font-size: var(--text-base);
  color: var(--color-secondary);
  margin-bottom: var(--space-4);
}

/* Family Card */
.family-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.family-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(232, 116, 59, 0.08);
  transform: translateY(-1px);
}

.family-card.current {
  border-color: var(--color-primary);
  border-width: 2px;
}

.family-card-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.family-card-body {
  flex: 1;
  min-width: 0;
}

.family-card-name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-neutral-900);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.family-card-stats {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-secondary);
}

.family-card-stats i {
  font-size: 10px;
  margin-right: 2px;
}

.family-card-arrow {
  color: var(--border-color);
  font-size: var(--text-sm);
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .family-card-stats {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}
</style>
