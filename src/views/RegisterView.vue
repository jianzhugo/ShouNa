<template>
  <AuthLayout>
    <template #default>
      <div class="auth-form-inner">
        <router-link to="/login" class="back-link">
          <i class="fa-solid fa-arrow-left"></i>
          返回登录
        </router-link>

        <h2>创建账号</h2>
        <p class="subtitle">注册家庭收纳备忘，开始管理你的物品</p>

        <form @submit.prevent="handleRegister">
          <div v-if="error" class="form-error">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ error }}
          </div>

          <div class="form-group">
            <label class="form-label" for="email">邮箱地址</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-envelope input-icon"></i>
              <input
                id="email"
                v-model="email"
                type="email"
                class="form-input has-icon"
                placeholder="请输入邮箱"
                autocomplete="email"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="name">昵称</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-user input-icon"></i>
              <input
                id="name"
                v-model="name"
                type="text"
                class="form-input has-icon"
                placeholder="请输入昵称"
                autocomplete="nickname"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">密码</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-lock input-icon"></i>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input has-icon"
                placeholder="请输入密码"
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                class="input-toggle"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              >
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
            <div v-if="password" class="password-strength">
              <div class="strength-bar">
                <div class="strength-fill" :style="{ width: strengthPercent + '%' }" :class="strengthClass"></div>
              </div>
              <span class="strength-text" :class="strengthClass">{{ strengthLabel }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">确认密码</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-lock input-icon"></i>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="form-input has-icon"
                placeholder="请再次输入密码"
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                class="input-toggle"
                @click="showConfirmPassword = !showConfirmPassword"
                :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'"
              >
                <i :class="showConfirmPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
            <p v-if="confirmPassword && password !== confirmPassword" class="field-error">两次密码不一致</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="inviteCode">邀请码 <span class="optional-tag">选填</span></label>
            <div class="input-wrapper">
              <i class="fa-solid fa-ticket input-icon"></i>
              <input
                id="inviteCode"
                v-model="inviteCode"
                type="text"
                class="form-input has-icon"
                placeholder="如有邀请码请输入"
              />
            </div>
            <p class="field-hint">输入邀请码可加入已有家庭</p>
          </div>

          <!-- No invite code: show family name field -->
          <div v-if="!inviteCode" class="form-group">
            <label class="form-label" for="familyName">家庭名称</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-house input-icon"></i>
              <input
                id="familyName"
                v-model="familyName"
                type="text"
                class="form-input has-icon"
                placeholder="请输入家庭名称"
                required
              />
            </div>
            <p class="field-hint">首位用户可直接注册创建家庭</p>
          </div>

          <!-- With invite code: show action options -->
          <div v-if="inviteCode" class="form-group">
            <label class="form-label">选择操作</label>
            <div class="action-cards">
              <button
                type="button"
                class="action-card"
                :class="{ active: action === 'join' }"
                @click="action = 'join'"
              >
                <i class="fa-solid fa-users action-card-icon"></i>
                <span class="action-card-title">加入该家庭</span>
                <span class="action-card-desc">加入邀请码对应的家庭</span>
              </button>
              <button
                type="button"
                class="action-card"
                :class="{ active: action === 'create' }"
                @click="action = 'create'"
              >
                <i class="fa-solid fa-house action-card-icon"></i>
                <span class="action-card-title">创建新家庭</span>
                <span class="action-card-desc">创建自己的家庭，同时加入邀请码对应的家庭</span>
              </button>
            </div>
          </div>

          <!-- If "create" selected with invite code: show family name -->
          <div v-if="inviteCode && action === 'create'" class="form-group">
            <label class="form-label" for="familyNameCreate">家庭名称</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-house input-icon"></i>
              <input
                id="familyNameCreate"
                v-model="familyName"
                type="text"
                class="form-input has-icon"
                placeholder="请输入新家庭名称"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            :disabled="loading"
          >
            <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>

        <p class="auth-link">
          已有账号？<router-link to="/login">立即登录</router-link>
        </p>
      </div>
    </template>

    <template #right>
      <div class="auth-brand-decor">
        <div class="decor-circle decor-circle-1"></div>
        <div class="decor-circle decor-circle-2"></div>
        <div class="decor-circle decor-circle-3"></div>
      </div>
      <div class="auth-right-content">
        <div class="brand-icon">
          <i class="fa-solid fa-house-chimney"></i>
        </div>
        <h3>家庭收纳备忘</h3>
        <p>轻松管理家中物品，<br>让生活更有条理</p>
        <ul class="brand-features">
          <li><i class="fa-solid fa-boxes-stacked"></i>物品分类管理</li>
          <li><i class="fa-solid fa-users"></i>家庭成员协作</li>
          <li><i class="fa-solid fa-magnifying-glass"></i>快速查找定位</li>
        </ul>
      </div>
    </template>
  </AuthLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import AuthLayout from '@/layouts/AuthLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const email = ref('')
const name = ref('')
const password = ref('')
const confirmPassword = ref('')
const inviteCode = ref('')
const familyName = ref('')
const action = ref('join')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')

const passwordStrength = computed(() => {
  const val = password.value
  if (!val) return 0
  let score = 0
  if (val.length >= 6) score++
  if (val.length >= 8) score++
  if (/[A-Z]/.test(val)) score++
  if (/[0-9]/.test(val)) score++
  if (/[^A-Za-z0-9]/.test(val)) score++
  return Math.min(score, 4)
})

const strengthPercent = computed(() => passwordStrength.value * 25)
const strengthClass = computed(() => {
  const map = ['', 'weak', 'fair', 'good', 'strong']
  return map[passwordStrength.value]
})
const strengthLabel = computed(() => {
  const map = ['', '弱', '一般', '良好', '强']
  return map[passwordStrength.value]
})

function validate() {
  if (!email.value) return '请输入邮箱'
  if (!name.value) return '请输入昵称'
  if (!password.value) return '请输入密码'
  if (password.value.length < 6) return '密码至少6位'
  if (password.value !== confirmPassword.value) return '两次密码不一致'
  if (!inviteCode.value && !familyName.value) return '请输入家庭名称'
  if (inviteCode.value && action.value === 'create' && !familyName.value) return '请输入新家庭名称'
  return ''
}

async function handleRegister() {
  const validationError = validate()
  if (validationError) {
    error.value = validationError
    return
  }

  error.value = ''
  loading.value = true

  try {
    const data = {
      email: email.value,
      name: name.value,
      password: password.value
    }

    if (inviteCode.value) {
      data.invite_code = inviteCode.value
      data.action = action.value
      if (action.value === 'create') {
        data.family_name = familyName.value
      }
    } else {
      data.action = 'create'
      data.family_name = familyName.value
    }

    const res = await authStore.register(data)
    if (res.families && res.families.length > 0) {
      familyStore.setCurrentFamily(res.families[0].id)
    }
    router.push('/')
  } catch (err) {
    error.value = err.message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form-inner {
  width: 100%;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-secondary);
  margin-bottom: var(--space-6);
}

.back-link:hover {
  color: var(--color-primary);
}

.form-error {
  background: var(--color-error-light);
  color: var(--color-error);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-400);
  font-size: var(--text-sm);
  pointer-events: none;
}

.form-input.has-icon {
  padding-left: var(--space-8);
}

.input-toggle {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-400);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: var(--space-1);
  background: none;
  border: none;
}

.input-toggle:hover {
  color: var(--color-neutral-600);
}

.optional-tag {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-normal);
  color: var(--color-neutral-400);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
  margin-top: var(--space-1);
}

.field-error {
  font-size: var(--text-xs);
  color: var(--color-error);
  margin-top: var(--space-1);
}

/* Password strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--color-neutral-200);
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: width var(--transition-fast);
}

.strength-fill.weak { background: var(--color-error); }
.strength-fill.fair { background: var(--color-warning); }
.strength-fill.good { background: var(--color-info); }
.strength-fill.strong { background: var(--color-success); }

.strength-text {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  min-width: 24px;
}

.strength-text.weak { color: var(--color-error); }
.strength-text.fair { color: var(--color-warning); }
.strength-text.good { color: var(--color-info); }
.strength-text.strong { color: var(--color-success); }

/* Action cards */
.action-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;
  font-family: var(--font-family);
}

.action-card:hover {
  border-color: var(--color-primary);
}

.action-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.action-card-icon {
  font-size: var(--text-lg);
  color: var(--color-primary);
  margin-bottom: var(--space-1);
}

.action-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-900);
}

.action-card-desc {
  font-size: var(--text-xs);
  color: var(--color-secondary);
}

.auth-link {
  text-align: center;
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-secondary);
}

.auth-link a {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

/* Right side branding */
.auth-brand-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decor-circle {
  position: absolute;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
}

.decor-circle-1 {
  width: 200px;
  height: 200px;
  top: -40px;
  right: -60px;
}

.decor-circle-2 {
  width: 120px;
  height: 120px;
  bottom: 60px;
  left: -30px;
}

.decor-circle-3 {
  width: 80px;
  height: 80px;
  bottom: -20px;
  right: 40px;
}

.brand-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-3xl);
  margin: 0 auto var(--space-6);
}

.brand-features {
  list-style: none;
  margin-top: var(--space-8);
  text-align: left;
}

.brand-features li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: var(--text-sm);
  opacity: 0.9;
}

.brand-features li i {
  width: 20px;
  text-align: center;
  font-size: var(--text-sm);
}
</style>
