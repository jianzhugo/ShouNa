<template>
  <AppLayout>
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <router-link to="/families">家庭组管理</router-link>
      <span class="sep">/</span>
      <span class="current">成员管理</span>
    </div>

    <div class="mobile-header">
      <h2>成员管理</h2>
      <p>管理家庭组成员与邀请</p>
    </div>

    <header class="page-header">
      <h2>成员管理</h2>
      <p>查看和管理家庭成员，邀请新成员加入</p>
    </header>

    <!-- Loading -->
    <SkeletonLoader v-if="loading" :count="4" type="card" />

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <i class="fa-solid fa-circle-exclamation"></i>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="fetchMembers">
        <i class="fa-solid fa-rotate-right"></i> 重试
      </button>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Invite Code Box -->
      <InviteCodeBox
        v-if="inviteInfo"
        :code="inviteInfo.code"
        :expires-at="inviteInfo.expires_at"
        :max-uses="inviteInfo.max_uses"
        :used-count="inviteInfo.used_count"
        @copy="handleCopyCode"
        @reset="showResetConfirm = true"
      />

      <!-- Member List -->
      <section>
        <h3 class="section-title">成员列表</h3>

        <EmptyState
          v-if="members.length === 0"
          icon="fa-solid fa-users"
          text="暂无成员"
        />

        <template v-else>
          <!-- PC: Table -->
          <table class="app-table">
            <thead>
              <tr>
                <th>成员</th>
                <th>角色</th>
                <th>加入时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in members" :key="member.id">
                <td>
                  <div class="table-name-cell">
                    <div class="member-avatar" :style="{ background: member.avatar ? 'transparent' : 'var(--color-primary)' }">
                      <img v-if="member.avatar" :src="member.avatar" :alt="member.nickname" class="avatar-img" />
                      <template v-else>{{ member.nickname?.[0] || member.email?.[0] || 'U' }}</template>
                    </div>
                    <div>
                      <div class="member-name">{{ member.nickname || member.email }}</div>
                      <div v-if="member.nickname" class="member-email">{{ member.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="member.role === 'admin' ? 'badge badge-primary' : 'badge badge-neutral'">
                    {{ member.role === 'admin' ? '管理员' : '成员' }}
                  </span>
                </td>
                <td>{{ member.joined_at }}</td>
                <td>
                  <button
                    v-if="isAdmin && member.id !== currentUserId"
                    class="btn btn-danger btn-sm"
                    @click="handleRemoveClick(member)"
                  >
                    <i class="fa-solid fa-user-minus"></i> 移除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile: Card list -->
          <ul class="mobile-member-list">
            <li v-for="member in members" :key="member.id" class="mobile-member-card">
              <div class="mobile-member-top">
                <div class="member-avatar" :style="{ background: member.avatar ? 'transparent' : 'var(--color-primary)' }">
                  <img v-if="member.avatar" :src="member.avatar" :alt="member.nickname" class="avatar-img" />
                  <template v-else>{{ member.nickname?.[0] || member.email?.[0] || 'U' }}</template>
                </div>
                <div class="mobile-member-info">
                  <div class="member-name">{{ member.nickname || member.email }}</div>
                  <div v-if="member.nickname" class="member-email">{{ member.email }}</div>
                </div>
                <span :class="member.role === 'admin' ? 'badge badge-primary' : 'badge badge-neutral'">
                  {{ member.role === 'admin' ? '管理员' : '成员' }}
                </span>
              </div>
              <div class="mobile-member-bottom">
                <span class="mobile-member-time">{{ member.joined_at }}</span>
                <button
                  v-if="isAdmin && member.id !== currentUserId"
                  class="btn btn-danger btn-sm"
                  @click="handleRemoveClick(member)"
                >
                  <i class="fa-solid fa-user-minus"></i> 移除
                </button>
              </div>
            </li>
          </ul>
        </template>
      </section>
    </template>

    <!-- Reset Invite Confirm -->
    <ConfirmDialog
      v-model:visible="showResetConfirm"
      title="重置邀请码"
      message="重置后当前邀请码将失效，是否继续？"
      confirm-text="重置"
      :danger="true"
      @confirm="handleResetInvite"
    />

    <!-- Remove Member Confirm -->
    <ConfirmDialog
      v-model:visible="showRemoveConfirm"
      title="移除成员"
      :message="'确定要将 ' + (removeTarget?.nickname || removeTarget?.email) + ' 从家庭组中移除吗？'"
      confirm-text="移除"
      :danger="true"
      @confirm="handleRemoveConfirm"
    />
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'
import AppLayout from '@/layouts/AppLayout.vue'
import InviteCodeBox from '@/components/InviteCodeBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const members = ref([])
const inviteInfo = ref(null)

const showResetConfirm = ref(false)
const showRemoveConfirm = ref(false)
const removeTarget = ref(null)

const familyId = computed(() => route.params.id)
const currentUserId = computed(() => authStore.user?.id)
const isAdmin = computed(() => {
  const current = members.value.find(m => String(m.id) === String(currentUserId.value))
  return current?.role === 'admin'
})

async function fetchMembers() {
  if (!familyId.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/families/' + familyId.value + '/members')
    // Map API fields: user_id -> id, name -> nickname
    const rawMembers = res.data?.members || res.data || []
    members.value = rawMembers.map(m => ({
      id: m.user_id || m.id,
      nickname: m.name || m.nickname,
      email: m.email,
      avatar: m.avatar,
      role: m.role,
      joined_at: m.joined_at
    }))

    // Fetch invite info from family details
    try {
      const familyRes = await api.get('/families')
      const families = familyRes.data || []
      const currentFamily = families.find(f => String(f.id) === String(familyId.value))
      if (currentFamily?.invite_code) {
        inviteInfo.value = {
          code: currentFamily.invite_code,
          expires_at: currentFamily.invite_code_expires_at,
          max_uses: currentFamily.invite_code_max_uses,
          used_count: currentFamily.invite_code_used_count
        }
      }
    } catch {
      // Invite info fetch failed, continue without it
    }
  } catch (err) {
    error.value = err.message || '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function handleCopyCode() {
  if (!inviteInfo.value?.code) return
  try {
    await navigator.clipboard.writeText(inviteInfo.value.code)
    toast.show('邀请码已复制', 'success')
  } catch {
    toast.show('复制失败，请手动复制', 'error')
  }
}

async function handleResetInvite() {
  try {
    const res = await api.post('/families/' + familyId.value + '/reset-invite')
    const data = res.data || res
    inviteInfo.value = {
      code: data.invite_code,
      expires_at: data.invite_code_expires_at,
      max_uses: data.invite_code_max_uses,
      used_count: data.invite_code_used_count
    }
    toast.show('邀请码已重置', 'success')
  } catch (err) {
    toast.show(err.message || '重置失败', 'error')
  }
}

function handleRemoveClick(member) {
  removeTarget.value = member
  showRemoveConfirm.value = true
}

async function handleRemoveConfirm() {
  if (!removeTarget.value) return
  try {
    await api.del('/families/' + familyId.value + '/members/' + removeTarget.value.id)
    toast.show('成员已移除', 'success')
    members.value = members.value.filter(m => m.id !== removeTarget.value.id)
  } catch (err) {
    toast.show(err.message || '移除失败', 'error')
  } finally {
    removeTarget.value = null
  }
}

onMounted(fetchMembers)
</script>

<style scoped>
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

/* Member avatar */
.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: #FFF;
  flex-shrink: 0;
  overflow: hidden;
}

.member-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-900);
}

.member-email {
  font-size: var(--text-xs);
  color: var(--color-secondary);
}

/* Mobile member list */
.mobile-member-list {
  list-style: none;
}

@media (min-width: 768px) {
  .mobile-member-list {
    display: none;
  }
}

.mobile-member-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-2);
}

.mobile-member-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.mobile-member-info {
  flex: 1;
  min-width: 0;
}

.mobile-member-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 44px;
}

.mobile-member-time {
  font-size: var(--text-xs);
  color: var(--color-secondary);
}
</style>
