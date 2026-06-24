<template>
  <div class="app-layout">
    <aside class="app-sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">
          <i class="fa-solid fa-box-open"></i>
        </div>
        <span class="sidebar-brand-text">家庭收纳备忘</span>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section-title">导航</div>
        <router-link to="/" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-house"></i>
          <span>仪表盘</span>
        </router-link>
        <router-link to="/items" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-boxes-stacked"></i>
          <span>物品列表</span>
        </router-link>
        <div class="sidebar-section-title">数据</div>
        <router-link to="/houses" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-building"></i>
          <span>住所</span>
        </router-link>
        <router-link to="/rooms" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-door-open"></i>
          <span>房间</span>
        </router-link>
        <router-link to="/storage" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-box-open"></i>
          <span>收纳位</span>
        </router-link>
        <router-link to="/families" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-people-group"></i>
          <span>家庭管理</span>
        </router-link>
        <router-link v-if="currentFamilyId" :to="`/families/${currentFamilyId}/members`" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-users"></i>
          <span>成员管理</span>
        </router-link>
        <div class="sidebar-section-title">系统</div>
        <router-link to="/trash" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-trash-can"></i>
          <span>回收站</span>
        </router-link>
        <router-link to="/settings" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-gear"></i>
          <span>设置</span>
        </router-link>
      </nav>
      <div class="sidebar-user" v-if="authStore.user">
        <div class="sidebar-avatar" :style="{ background: 'var(--color-primary)' }">
          {{ authStore.user.nickname?.[0] || authStore.user.email?.[0] || 'U' }}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">{{ authStore.user.nickname || authStore.user.email }}</div>
          <div class="sidebar-user-email">{{ authStore.user.email }}</div>
        </div>
      </div>
    </aside>
    <div class="app-main">
      <header class="app-toolbar">
        <nav class="app-breadcrumb">
          <router-link to="/">首页</router-link>
          <span class="sep">/</span>
          <span class="current">{{ $route.meta.title || $route.name }}</span>
        </nav>
      </header>
      <main class="app-scroll">
        <slot />
      </main>
    </div>
    <ToastNotification />

    <!-- FAB 遮罩 -->
    <div v-if="fabOpen" class="fab-overlay" @click="closeFab"></div>

    <!-- FAB 菜单 -->
    <div v-if="fabOpen && fabConfig.showAddCurrent" class="fab-menu">
      <button class="fab-menu-item add-current" @click="requestAddCurrent">
        <i :class="fabConfig.currentIcon"></i>
        {{ fabConfig.currentLabel }}
      </button>
      <button class="fab-menu-item add-item" @click="requestAddItem">
        <i class="fa-solid fa-box"></i>
        直接添加物品
      </button>
    </div>
    <div v-else-if="fabOpen && fabConfig.showAddItem" class="fab-menu">
      <button class="fab-menu-item add-item" @click="requestAddItem">
        <i class="fa-solid fa-box"></i>
        直接添加物品
      </button>
    </div>

    <!-- 直接添加物品 - ItemForm 底部弹窗 -->
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

    <nav class="app-tab-bar">
      <router-link to="/" class="tab-item" active-class="active">
        <i class="fa-solid fa-house"></i>
        <span>首页</span>
      </router-link>
      <router-link to="/items" class="tab-item" active-class="active">
        <i class="fa-solid fa-boxes-stacked"></i>
        <span>物品</span>
      </router-link>
      <button class="tab-item add-btn" @click="toggleFab" aria-label="添加">
        <i :class="fabOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-circle-plus'"></i>
        <span>{{ fabOpen ? '关闭' : '添加' }}</span>
      </button>
      <router-link to="/trash" class="tab-item" active-class="active">
        <i class="fa-solid fa-trash-can"></i>
        <span>回收站</span>
      </router-link>
      <router-link to="/settings" class="tab-item" active-class="active">
        <i class="fa-solid fa-gear"></i>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useFab } from '@/composables/useFab'
import { useToast } from '@/composables/useToast'
import api from '@/api'
import ToastNotification from '@/components/ToastNotification.vue'
import ItemForm from '@/components/ItemForm.vue'

const authStore = useAuthStore()
const familyStore = useFamilyStore()
const route = useRoute()
const { show: showToast } = useToast()
const currentFamilyId = computed(() => familyStore.currentFamilyId)

const { fabOpen, pendingAction, toggleFab, closeFab, requestAddCurrent, requestAddItem, clearAction } = useFab()

const showItemForm = ref(false)
const familyId = computed(() => Number(familyStore.currentFamilyId))

// 根据当前路由计算 FAB 菜单配置
const fabConfig = computed(() => {
  const name = route.name
  if (name === 'Houses') {
    return { showAddCurrent: true, currentLabel: '添加住所', currentIcon: 'fa-solid fa-house', showAddItem: true }
  }
  if (name === 'Rooms') {
    return { showAddCurrent: true, currentLabel: '添加房间', currentIcon: 'fa-solid fa-door-open', showAddItem: true }
  }
  if (name === 'Storage') {
    return { showAddCurrent: true, currentLabel: '添加收纳位', currentIcon: 'fa-solid fa-box-archive', showAddItem: true }
  }
  // 其他页面只显示"直接添加物品"
  return { showAddCurrent: false, currentLabel: '', currentIcon: '', showAddItem: true }
})

// 监听 FAB 动作：处理"直接添加物品"
watch(pendingAction, (action) => {
  if (action === 'add-item') {
    // ItemsView 有自己的添加物品表单，由其自行处理
    if (route.name === 'Items') return
    showItemForm.value = true
    clearAction()
  }
  // 'add-current' 由各视图自行监听处理
})

// 路由变化时关闭 FAB
watch(() => route.path, () => {
  closeFab()
})

async function onItemSave(itemData) {
  try {
    await api.post('/items', itemData)
    showItemForm.value = false
    showToast('物品添加成功')
  } catch {
    showToast('添加物品失败', 'error')
  }
}

onMounted(async () => {
  if (!currentFamilyId.value) {
    await familyStore.fetchFamilies()
  }
})
</script>
