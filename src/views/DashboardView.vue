<template>
  <AppLayout>
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <span class="current">仪表盘</span>
    </div>

    <div class="mobile-header">
      <h2>你好, {{ userName }}</h2>
      <p>欢迎回到家庭收纳备忘</p>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="loading" :count="4" type="card" />

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <i class="fa-solid fa-circle-exclamation"></i>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="fetchData">
        <i class="fa-solid fa-rotate-right"></i> 重试
      </button>
    </div>

    <!-- Content -->
    <template v-else-if="data">
      <!-- Stat Cards -->
      <section class="stat-row">
        <StatCard
          icon="fa-solid fa-house"
          :icon-bg="'var(--color-primary-light)'"
          :icon-color="'var(--color-primary)'"
          :num="data.stats.house_count"
          label="住所数"
        />
        <StatCard
          icon="fa-solid fa-door-open"
          :icon-bg="'var(--color-success-light)'"
          :icon-color="'var(--color-success)'"
          :num="data.stats.room_count"
          label="房间数"
        />
        <StatCard
          icon="fa-solid fa-box-archive"
          :icon-bg="'var(--color-info-light)'"
          :icon-color="'var(--color-info)'"
          :num="data.stats.storage_count"
          label="收纳位数"
        />
        <StatCard
          icon="fa-solid fa-cube"
          :icon-bg="'var(--color-pink-light)'"
          :icon-color="'var(--color-pink)'"
          :num="data.stats.item_count"
          label="物品数"
        />
      </section>

      <!-- Main + Sidebar -->
      <div class="dashboard-layout">
        <section class="dashboard-main">
          <h3 class="section-title">最近物品</h3>

          <EmptyState
            v-if="!data.recent_items || data.recent_items.length === 0"
            icon="fa-solid fa-box-open"
            text="暂无物品记录"
            hint="添加你的第一个收纳物品吧"
          />

          <template v-else>
            <!-- PC: Table -->
            <table class="app-table">
              <thead>
                <tr>
                  <th>物品</th>
                  <th>分类</th>
                  <th>数量</th>
                  <th>位置</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in data.recent_items" :key="item.id">
                  <td>
                    <div class="table-name-cell">
                      <span>{{ item.name }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-neutral">{{ item.category }}</span>
                  </td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ item.location }}</td>
                  <td>{{ item.updated_at }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Mobile: Card list -->
            <ul class="mobile-item-list">
              <li v-for="item in data.recent_items" :key="item.id" class="mobile-item-card">
                <div class="mobile-item-top">
                  <span class="mobile-item-name">{{ item.name }}</span>
                  <span class="badge badge-neutral">{{ item.category }}</span>
                </div>
                <div class="mobile-item-bottom">
                  <span class="mobile-item-location">
                    <i class="fa-solid fa-location-dot"></i> {{ item.location }}
                  </span>
                  <span class="mobile-item-time">{{ item.updated_at }}</span>
                </div>
              </li>
            </ul>
          </template>
        </section>

        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <!-- House item counts -->
          <section class="sidebar-section">
            <h3 class="section-title">房屋物品统计</h3>
            <EmptyState
              v-if="!data.houses || data.houses.length === 0"
              icon="fa-solid fa-house"
              text="暂无房屋"
            />
            <ul v-else class="house-progress-list">
              <li v-for="house in data.houses" :key="house.id" class="house-progress-item">
                <div class="house-progress-header">
                  <span class="house-progress-name">{{ house.name }}</span>
                  <span class="house-progress-count">{{ house.item_count }} 件</span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: house.progress + '%' }"
                  ></div>
                </div>
              </li>
            </ul>
          </section>

          <!-- Family members -->
          <section class="sidebar-section">
            <h3 class="section-title">家庭成员</h3>
            <EmptyState
              v-if="!data.members || data.members.length === 0"
              icon="fa-solid fa-users"
              text="暂无成员"
            />
            <ul v-else class="member-list">
              <li v-for="member in data.members" :key="member.id" class="member-item">
                <div class="member-avatar" :style="{ background: 'var(--color-primary)' }">
                  {{ member.nickname?.[0] || member.email?.[0] || 'U' }}
                </div>
                <div class="member-info">
                  <span class="member-name">{{ member.nickname || member.email }}</span>
                  <span v-if="member.role === 'admin'" class="badge badge-primary">管理员</span>
                </div>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import api from '@/api'
import AppLayout from '@/layouts/AppLayout.vue'
import StatCard from '@/components/StatCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const authStore = useAuthStore()
const familyStore = useFamilyStore()

const loading = ref(false)
const error = ref('')
const data = ref(null)

const userName = computed(() => {
  return authStore.user?.nickname || authStore.user?.email || '用户'
})

async function fetchData() {
  if (!familyStore.currentFamilyId) return
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/dashboard?family=' + familyStore.currentFamilyId)
    data.value = res.data
  } catch (err) {
    error.value = err.message || '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

watch(() => familyStore.currentFamilyId, () => {
  fetchData()
})
</script>

<style scoped>
.dashboard-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-6);
}

@media (max-width: 767px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-neutral-900);
  margin-bottom: var(--space-4);
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

/* Mobile item list */
.mobile-item-list {
  list-style: none;
}

@media (min-width: 768px) {
  .mobile-item-list {
    display: none;
  }
}

.mobile-item-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-2);
}

.mobile-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-1);
}

.mobile-item-name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-900);
}

.mobile-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--color-secondary);
}

.mobile-item-location i {
  font-size: 10px;
}

/* Sidebar */
.sidebar-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
}

.sidebar-section + .sidebar-section {
  margin-top: var(--space-4);
}

/* House progress */
.house-progress-list {
  list-style: none;
}

.house-progress-item {
  margin-bottom: var(--space-3);
}

.house-progress-item:last-child {
  margin-bottom: 0;
}

.house-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-1);
}

.house-progress-name {
  font-size: var(--text-sm);
  color: var(--color-neutral-900);
  font-weight: var(--font-weight-medium);
}

.house-progress-count {
  font-size: var(--text-xs);
  color: var(--color-secondary);
}

.progress-bar {
  height: 6px;
  background: var(--color-neutral-100);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Member list */
.member-list {
  list-style: none;
}

.member-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}

.member-item + .member-item {
  border-top: 1px solid var(--border-color);
}

.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: #FFF;
  flex-shrink: 0;
}

.member-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.member-name {
  font-size: var(--text-sm);
  color: var(--color-neutral-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
