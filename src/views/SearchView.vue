<template>
  <AppLayout>
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="sep">/</span>
      <span class="current">全局搜索</span>
    </div>
    <div class="mobile-header">
      <h2>全局搜索</h2>
    </div>
    <section class="search-page">
      <div class="page-header">
        <h2>全局搜索</h2>
        <p>搜索家庭中的所有物品</p>
      </div>

      <SearchBar
        v-model="keyword"
        placeholder="搜索物品名称、分类、位置..."
        @search="handleSearch"
      />

      <SkeletonLoader v-if="loadingCategories" type="text" :count="1" />
      <FilterChips
        v-else-if="categories.length"
        :items="categoryChips"
        :activeId="activeCategory"
        @filter="handleCategoryFilter"
      />

      <div v-if="searched" class="search-meta">
        <span>共找到 <strong>{{ total }}</strong> 个结果</span>
      </div>

      <SkeletonLoader v-if="loading" type="table" :count="5" />

      <EmptyState
        v-else-if="searched && results.length === 0"
        icon="fa-solid fa-magnifying-glass"
        text="未找到匹配的物品"
        hint="试试其他关键词或分类"
      />

      <template v-else-if="results.length > 0">
        <table class="app-table">
          <thead>
            <tr>
              <th>物品</th>
              <th>分类</th>
              <th>位置</th>
              <th>数量</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in results"
              :key="item.id"
              class="search-row"
              @click="router.push('/items/' + item.id)"
            >
              <td>
                <span class="table-name-cell">
                  <span v-html="highlightText(item.name)"></span>
                </span>
              </td>
              <td>
                <span class="badge badge-neutral">{{ item.category_name || '未分类' }}</span>
              </td>
              <td>{{ item.location || '-' }}</td>
              <td>{{ item.quantity ?? '-' }}</td>
            </tr>
          </tbody>
        </table>

        <ul class="mobile-results">
          <li
            v-for="item in results"
            :key="item.id"
            class="mobile-result-card"
            @click="router.push('/items/' + item.id)"
          >
            <div class="mobile-result-name" v-html="highlightText(item.name)"></div>
            <div class="mobile-result-meta">
              <span class="badge badge-neutral">{{ item.category_name || '未分类' }}</span>
              <span class="mobile-result-location">
                <i class="fa-solid fa-location-dot"></i>
                {{ item.location || '未知位置' }}
              </span>
            </div>
          </li>
        </ul>

        <PaginationBar
          :page="page"
          :limit="limit"
          :total="total"
          @change="handlePageChange"
        />
      </template>
    </section>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFamilyStore } from '@/stores/family'
import { useToast } from '@/composables/useToast'
import api from '@/api'
import AppLayout from '@/layouts/AppLayout.vue'
import SearchBar from '@/components/SearchBar.vue'
import FilterChips from '@/components/FilterChips.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import PaginationBar from '@/components/PaginationBar.vue'

const router = useRouter()
const familyStore = useFamilyStore()
const { show: showToast } = useToast()

const keyword = ref('')
const activeCategory = ref('')
const categories = ref([])
const results = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const loading = ref(false)
const loadingCategories = ref(false)
const searched = ref(false)

const categoryChips = computed(() => {
  const all = [{ id: '', name: '全部' }]
  return all.concat(categories.value.map(c => ({ id: String(c.id), name: c.name })))
})

function highlightText(text) {
  if (!text || !keyword.value) return text || ''
  const escaped = keyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

async function fetchCategories() {
  loadingCategories.value = true
  try {
    const familyId = familyStore.currentFamilyId
    if (!familyId) return
    const res = await api.get('/categories?family=' + familyId)
    categories.value = res.data || []
  } catch (err) {
    showToast('加载分类失败', 'error')
  } finally {
    loadingCategories.value = false
  }
}

async function handleSearch() {
  if (!keyword.value.trim()) {
    results.value = []
    total.value = 0
    searched.value = false
    return
  }
  page.value = 1
  await fetchResults()
}

async function fetchResults() {
  const familyId = familyStore.currentFamilyId
  if (!familyId || !keyword.value.trim()) return

  loading.value = true
  searched.value = true
  try {
    let url = '/items/search?family=' + familyId + '&q=' + encodeURIComponent(keyword.value.trim()) + '&page=' + page.value + '&limit=' + limit.value
    if (activeCategory.value) {
      url += '&category=' + activeCategory.value
    }
    const res = await api.get(url)
    results.value = res.data?.items || res.data || []
    total.value = res.data?.total || results.value.length
  } catch (err) {
    showToast('搜索失败', 'error')
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleCategoryFilter(id) {
  activeCategory.value = id
  if (keyword.value.trim()) {
    page.value = 1
    fetchResults()
  }
}

function handlePageChange(p) {
  page.value = p
  fetchResults()
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.search-page {
  max-width: 960px;
}

.search-meta {
  font-size: var(--text-sm);
  color: var(--color-secondary);
  margin-bottom: var(--space-4);
}

.search-meta strong {
  color: var(--color-primary);
}

.search-row {
  cursor: pointer;
}

.mobile-results {
  display: none;
  list-style: none;
  padding: 0;
  margin: 0;
}

@media (max-width: 767px) {
  .mobile-results {
    display: block;
  }
}

.mobile-result-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.mobile-result-card:hover {
  border-color: var(--color-primary);
}

.mobile-result-name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-900);
  margin-bottom: var(--space-2);
}

.mobile-result-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.mobile-result-location {
  font-size: var(--text-xs);
  color: var(--color-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.mobile-result-location i {
  font-size: 10px;
}
</style>
