<template>
  <AuthLayout>
    <template #default>
      <!-- Left side: Login form -->
      <div class="auth-form-inner">
        <div class="auth-logo">
          <i class="fa-solid fa-house-chimney"></i>
        </div>
        <h2>欢迎回来</h2>
        <p class="subtitle">登录你的家庭收纳备忘账号</p>

        <form @submit.prevent="handleLogin">
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
            <label class="form-label" for="password">密码</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-lock input-icon"></i>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input has-icon"
                placeholder="请输入密码"
                autocomplete="current-password"
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
          </div>

          <div class="form-row">
            <label class="checkbox-label">
              <input v-model="remember" type="checkbox" class="checkbox-input" />
              <span class="checkbox-text">记住我</span>
            </label>
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            :disabled="loading"
          >
            <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <p class="auth-link">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </p>
      </div>
    </template>

    <template #right>
      <!-- Right side: Branding panel -->
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
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import AuthLayout from '@/layouts/AuthLayout.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const remember = ref(false)
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    const data = await authStore.login(email.value, password.value)
    if (data.families && data.families.length > 0) {
      familyStore.setCurrentFamily(data.families[0].id)
    }
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.message || '登录失败，请检查邮箱和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form-inner {
  width: 100%;
}

.auth-logo {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: var(--text-xl);
  margin-bottom: var(--space-6);
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

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

@media (max-width: 767px) {
  .form-row {
    margin-bottom: var(--space-4);
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.checkbox-text {
  font-size: var(--text-sm);
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
