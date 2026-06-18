import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

// 映射 API 返回的 name 字段到 nickname
function mapUser(data) {
  if (!data) return data
  return {
    ...data,
    nickname: data.name || data.nickname
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    user.value = mapUser(res.data)
    return user.value
  }

  async function register(data) {
    const res = await api.post('/auth/register', data)
    user.value = mapUser(res.data)
    return user.value
  }

  async function fetchUser() {
    const res = await api.get('/users/me')
    user.value = mapUser(res.data)
    return user.value
  }

  async function updateProfile(data) {
    const res = await api.put('/users/me', data)
    user.value = { ...user.value, ...mapUser(res.data) }
    return res.data
  }

  async function changePassword(oldPassword, newPassword) {
    return api.put('/users/me/password', { old_password: oldPassword, new_password: newPassword })
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {}
    user.value = null
  }

  return { user, isAuthenticated, login, register, fetchUser, updateProfile, changePassword, logout }
})
