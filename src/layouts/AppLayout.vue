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
        <router-link to="/houses" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-building"></i>
          <span>房屋管理</span>
        </router-link>
        <router-link to="/search" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>搜索物品</span>
        </router-link>
        <div class="sidebar-section-title">管理</div>
        <router-link to="/families" class="sidebar-item" active-class="active">
          <i class="fa-solid fa-people-group"></i>
          <span>家庭管理</span>
        </router-link>
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
        <div class="toolbar-spacer"></div>
        <router-link to="/search" class="toolbar-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>搜索物品...</span>
        </router-link>
      </header>
      <main class="app-scroll">
        <slot />
      </main>
    </div>
    <nav class="app-tab-bar">
      <router-link to="/" class="tab-item" active-class="active">
        <i class="fa-solid fa-house"></i>
        <span>首页</span>
      </router-link>
      <router-link to="/houses" class="tab-item" active-class="active">
        <i class="fa-solid fa-building"></i>
        <span>房屋</span>
      </router-link>
      <router-link to="/search" class="tab-item add-btn">
        <i class="fa-solid fa-circle-plus"></i>
        <span>搜索</span>
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
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
</script>
