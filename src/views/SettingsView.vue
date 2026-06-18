<template>
  <AppLayout>
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <span class="current">设置</span>
    </div>
    <div class="mobile-header">
      <h2>设置</h2>
    </div>
    <section class="settings-page">
      <div class="page-header">
        <h2>设置</h2>
        <p>管理你的账号和偏好</p>
      </div>

      <nav class="settings-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="settings-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.name }}</span>
        </button>
      </nav>

      <div class="settings-layout">
        <nav class="settings-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="settings-nav-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <i :class="tab.icon"></i>
            <span>{{ tab.name }}</span>
          </button>
        </nav>

        <div class="settings-content">
          <!-- 个人信息 -->
          <template v-if="activeTab === 'profile'">
            <div class="settings-section">
              <h3>个人信息</h3>
              <div class="user-card">
                <div class="user-avatar">
                  <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="头像" class="avatar-img" />
                  <span v-else>{{ authStore.user?.nickname?.[0] || authStore.user?.email?.[0] || 'U' }}</span>
                </div>
                <div class="user-info">
                  <div class="user-name">{{ authStore.user?.nickname || '未设置昵称' }}</div>
                  <div class="user-email">{{ authStore.user?.email }}</div>
                </div>
                <button class="btn btn-sm btn-outline" :disabled="uploadingAvatar" @click="triggerAvatarUpload">
                  <i v-if="uploadingAvatar" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-camera"></i>
                  {{ uploadingAvatar ? '上传中...' : '更换头像' }}
                </button>
                <input ref="avatarInput" type="file" accept="image/*" style="display: none;" @change="handleAvatarChange" />
              </div>
              <div class="form-group">
                <label class="form-label" for="nickname">昵称</label>
                <input
                  id="nickname"
                  v-model="nickname"
                  type="text"
                  class="form-input"
                  placeholder="输入昵称"
                />
              </div>
              <button class="btn btn-primary" :disabled="savingProfile" @click="handleSaveProfile">
                <i v-if="savingProfile" class="fa-solid fa-spinner fa-spin"></i>
                {{ savingProfile ? '保存中...' : '保存昵称' }}
              </button>
            </div>
          </template>

          <!-- 安全 -->
          <template v-if="activeTab === 'security'">
            <div class="settings-section">
              <h3>修改密码</h3>
              <div class="form-group">
                <label class="form-label" for="oldPassword">当前密码</label>
                <input
                  id="oldPassword"
                  v-model="oldPassword"
                  type="password"
                  class="form-input"
                  placeholder="输入当前密码"
                  autocomplete="current-password"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="newPassword">新密码</label>
                <input
                  id="newPassword"
                  v-model="newPassword"
                  type="password"
                  class="form-input"
                  placeholder="输入新密码"
                  autocomplete="new-password"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="confirmPassword">确认新密码</label>
                <input
                  id="confirmPassword"
                  v-model="confirmPassword"
                  type="password"
                  class="form-input"
                  placeholder="再次输入新密码"
                  autocomplete="new-password"
                />
              </div>
              <button class="btn btn-primary" :disabled="savingPassword" @click="handleChangePassword">
                <i v-if="savingPassword" class="fa-solid fa-spinner fa-spin"></i>
                {{ savingPassword ? '保存中...' : '修改密码' }}
              </button>
            </div>

            <div class="settings-section">
              <h3>退出登录</h3>
              <p class="setting-desc">退出当前账号，需要重新登录才能继续使用。</p>
              <button class="btn btn-danger" @click="handleLogout">
                <i class="fa-solid fa-right-from-bracket"></i>
                退出登录
              </button>
            </div>
          </template>

          <!-- 偏好 -->
          <template v-if="activeTab === 'preferences'">
            <div class="settings-section">
              <h3>偏好设置</h3>
              <div class="setting-row">
                <div>
                  <div class="setting-label">拍照自动压缩</div>
                  <div class="setting-desc">上传照片时自动压缩以节省空间</div>
                </div>
                <div class="toggle" :class="{ on: preferences.autoCompress }" @click="preferences.autoCompress = !preferences.autoCompress"></div>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-label">删除前确认</div>
                  <div class="setting-desc">删除物品时弹出确认对话框</div>
                </div>
                <div class="toggle" :class="{ on: preferences.confirmBeforeDelete }" @click="preferences.confirmBeforeDelete = !preferences.confirmBeforeDelete"></div>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-label">操作日志</div>
                  <div class="setting-desc">记录家庭成员的操作历史</div>
                </div>
                <div class="toggle" :class="{ on: preferences.activityLog }" @click="preferences.activityLog = !preferences.activityLog"></div>
              </div>
            </div>
          </template>

          <!-- 分类管理 -->
          <template v-if="activeTab === 'categories'">
            <div class="settings-section">
              <h3>分类管理</h3>
              <div v-if="!isAdmin" class="admin-notice">
                <i class="fa-solid fa-lock"></i>
                <span>仅管理员可以管理分类</span>
              </div>
              <div v-if="isAdmin" class="category-add">
                <input
                  v-model="newCategoryName"
                  type="text"
                  class="form-input"
                  placeholder="输入分类名称"
                  @keyup.enter="handleAddCategory"
                />
                <button class="btn btn-primary" :disabled="!newCategoryName.trim() || addingCategory" @click="handleAddCategory">
                  <i v-if="addingCategory" class="fa-solid fa-spinner fa-spin"></i>
                  {{ addingCategory ? '添加中...' : '添加' }}
                </button>
              </div>
              <SkeletonLoader v-if="loadingCategories" type="text" :count="4" />
              <EmptyState
                v-else-if="categories.length === 0"
                icon="fa-solid fa-tags"
                text="暂无分类"
                hint="添加分类来组织你的物品"
              />
              <ul v-else class="category-list">
                <li v-for="cat in categories" :key="cat.id" class="category-item">
                  <template v-if="editingId === cat.id">
                    <input
                      v-model="editingName"
                      type="text"
                      class="form-input"
                      @keyup.enter="handleSaveCategory(cat)"
                      @keyup.escape="cancelEdit"
                    />
                    <button class="btn btn-sm btn-primary" @click="handleSaveCategory(cat)">保存</button>
                    <button class="btn btn-sm btn-ghost" @click="cancelEdit">取消</button>
                  </template>
                  <template v-else>
                    <span class="category-name">{{ cat.name }}</span>
                    <div v-if="isAdmin" class="category-actions">
                      <button class="btn btn-sm btn-ghost" @click="startEdit(cat)">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                      <button class="btn btn-sm btn-danger" @click="confirmDeleteCategory(cat)">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </template>
                </li>
              </ul>
            </div>
          </template>
        </div>
      </div>
    </section>

    <ConfirmDialog
      v-model:visible="showDeleteCategoryConfirm"
      title="删除分类"
      :message="'确定要删除分类「' + pendingDeleteCategory?.name + '」吗？该分类下的物品将移至「其他」。'"
      confirmText="删除"
      danger
      @confirm="handleDeleteCategory"
    />
  </AppLayout>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import { compressImage } from '@/utils/image'
import api from '@/api'
import AppLayout from '@/layouts/AppLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const { show: showToast } = useToast()

const activeTab = ref('profile')
const tabs = [
  { id: 'profile', name: '个人信息', icon: 'fa-solid fa-user' },
  { id: 'security', name: '安全', icon: 'fa-solid fa-shield-halved' },
  { id: 'preferences', name: '偏好', icon: 'fa-solid fa-sliders' },
  { id: 'categories', name: '分类管理', icon: 'fa-solid fa-tags' }
]

// 个人信息
const nickname = ref(authStore.user?.nickname || '')
const savingProfile = ref(false)
const uploadingAvatar = ref(false)
const avatarInput = ref(null)

watch(() => authStore.user?.nickname, (val) => {
  nickname.value = val || ''
})

function triggerAvatarUpload() {
  avatarInput.value.click()
}

async function handleAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingAvatar.value = true
  try {
    const compressed = await compressImage(file, 200, 0.8)
    const avatarUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(compressed)
    })
    await authStore.updateProfile({
      name: authStore.user.nickname || authStore.user.name,
      avatar: avatarUrl
    })
    showToast('头像已更新', 'success')
  } catch (err) {
    showToast(err.message || '头像上传失败', 'error')
  } finally {
    uploadingAvatar.value = false
    e.target.value = ''
  }
}

async function handleSaveProfile() {
  if (!nickname.value.trim()) {
    showToast('昵称不能为空', 'error')
    return
  }
  savingProfile.value = true
  try {
    await authStore.updateProfile({ name: nickname.value.trim() })
    showToast('昵称已更新', 'success')
  } catch (err) {
    showToast(err.message || '保存失败', 'error')
  } finally {
    savingProfile.value = false
  }
}

// 安全
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)

async function handleChangePassword() {
  if (!oldPassword.value) {
    showToast('请输入当前密码', 'error')
    return
  }
  if (!newPassword.value) {
    showToast('请输入新密码', 'error')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    showToast('两次输入的新密码不一致', 'error')
    return
  }
  savingPassword.value = true
  try {
    await authStore.changePassword(oldPassword.value, newPassword.value)
    showToast('密码已修改', 'success')
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    showToast(err.message || '修改密码失败', 'error')
  } finally {
    savingPassword.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// 偏好
const STORAGE_KEY = 'shouna_preferences'

function loadPreferences() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    autoCompress: true,
    confirmBeforeDelete: true,
    activityLog: true
  }
}

const preferences = reactive(loadPreferences())

watch(preferences, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

// 分类管理
const categories = ref([])
const loadingCategories = ref(false)
const newCategoryName = ref('')
const addingCategory = ref(false)
const editingId = ref(null)
const editingName = ref('')
const showDeleteCategoryConfirm = ref(false)
const pendingDeleteCategory = ref(null)

const isAdmin = computed(() => {
  const familyId = familyStore.currentFamilyId
  const families = familyStore.families
  const current = families.find(f => String(f.id) === String(familyId))
  return current?.role === 'admin' || current?.is_admin
})

async function fetchCategories() {
  const familyId = familyStore.currentFamilyId
  if (!familyId) return

  loadingCategories.value = true
  try {
    const res = await api.get('/categories?family=' + familyId)
    categories.value = res.data || []
  } catch (err) {
    showToast('加载分类失败', 'error')
  } finally {
    loadingCategories.value = false
  }
}

async function handleAddCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return

  addingCategory.value = true
  try {
    const familyId = familyStore.currentFamilyId
    await api.post('/categories', { family_id: familyId, name })
    showToast('分类已添加', 'success')
    newCategoryName.value = ''
    fetchCategories()
  } catch (err) {
    showToast(err.message || '添加失败', 'error')
  } finally {
    addingCategory.value = false
  }
}

function startEdit(cat) {
  editingId.value = cat.id
  editingName.value = cat.name
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
}

async function handleSaveCategory(cat) {
  const name = editingName.value.trim()
  if (!name) {
    showToast('分类名称不能为空', 'error')
    return
  }
  try {
    await api.put('/categories/' + cat.id, { name })
    showToast('分类已更新', 'success')
    cancelEdit()
    fetchCategories()
  } catch (err) {
    showToast(err.message || '更新失败', 'error')
  }
}

function confirmDeleteCategory(cat) {
  pendingDeleteCategory.value = cat
  showDeleteCategoryConfirm.value = true
}

async function handleDeleteCategory() {
  if (!pendingDeleteCategory.value) return
  try {
    await api.del('/categories/' + pendingDeleteCategory.value.id)
    showToast('分类已删除', 'success')
    fetchCategories()
  } catch (err) {
    showToast(err.message || '删除失败', 'error')
  } finally {
    pendingDeleteCategory.value = null
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.settings-page {
  max-width: 960px;
}

.settings-tabs {
  display: none;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}

.settings-tabs::-webkit-scrollbar {
  display: none;
}

@media (max-width: 767px) {
  .settings-tabs {
    display: flex;
  }
}

.settings-tab {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-secondary);
  white-space: nowrap;
  transition: all var(--transition-fast);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.settings-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.settings-tab.active {
  background: var(--color-primary);
  color: #FFF;
  border-color: var(--color-primary);
}

.settings-tab i {
  font-size: var(--text-sm);
}

.settings-content {
  min-width: 0;
}

.user-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-app);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-4);
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #FFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  overflow: hidden;
}

@media (max-width: 767px) {
  .user-avatar {
    width: 48px;
    height: 48px;
  }
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-neutral-900);
}

.user-email {
  font-size: var(--text-sm);
  color: var(--color-secondary);
  margin-top: var(--space-1);
}

.admin-notice {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-warning-light);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-warning);
  margin-bottom: var(--space-4);
}

.category-add {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.category-add .form-input {
  flex: 1;
}

.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-color);
}

.category-item:last-child {
  border-bottom: none;
}

.category-name {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-neutral-900);
}

.category-actions {
  display: flex;
  gap: var(--space-1);
}

.category-item .form-input {
  flex: 1;
}
</style>
