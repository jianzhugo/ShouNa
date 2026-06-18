import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'auth' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { layout: 'auth' }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/families',
    name: 'Families',
    component: () => import('@/views/FamiliesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/families/:id/members',
    name: 'Members',
    component: () => import('@/views/MembersView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/houses',
    name: 'Houses',
    component: () => import('@/views/HousesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rooms',
    name: 'AllRooms',
    component: () => import('@/views/AllRoomsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/storage',
    name: 'AllStorage',
    component: () => import('@/views/AllStorageView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/houses/:houseId/rooms',
    name: 'Rooms',
    component: () => import('@/views/RoomsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rooms/:roomId/storage',
    name: 'Storage',
    component: () => import('@/views/StorageView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/items',
    name: 'ItemsSearch',
    component: () => import('@/views/ItemsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/storage/:storageId/items',
    name: 'Items',
    component: () => import('@/views/ItemsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/items/:id',
    name: 'ItemDetail',
    component: () => import('@/views/ItemDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/search',
    name: 'Search',
    redirect: to => ({ name: 'ItemsSearch', query: to.query })
  },
  {
    path: '/trash',
    name: 'Trash',
    component: () => import('@/views/TrashView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const familyStore = useFamilyStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    try {
      await authStore.fetchUser()
    } catch {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
  }

  // 确保 family store 已初始化（用于侧边栏成员管理链接）
  if (to.meta.requiresAuth && authStore.isAuthenticated && !familyStore.currentFamilyId) {
    try {
      await familyStore.fetchFamilies()
    } catch {
      // 忽略错误，可能是用户还没有加入任何家庭
    }
  }

  if (to.meta.layout === 'auth' && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

export default router
