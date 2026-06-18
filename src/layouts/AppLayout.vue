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
    <nav class="app-tab-bar">
      <router-link to="/" class="tab-item" active-class="active">
        <i class="fa-solid fa-house"></i>
        <span>首页</span>
      </router-link>
      <router-link to="/items" class="tab-item" active-class="active">
        <i class="fa-solid fa-boxes-stacked"></i>
        <span>物品</span>
      </router-link>
      <router-link to="/houses" class="tab-item add-btn">
        <i class="fa-solid fa-circle-plus"></i>
        <span>添加</span>
      </router-link>
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
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import ToastNotification from '@/components/ToastNotification.vue'
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const currentFamilyId = computed(() => familyStore.currentFamilyId)

onMounted(async () => {
  if (!currentFamilyId.value) {
    await familyStore.fetchFamilies()
  }
})
</script>
