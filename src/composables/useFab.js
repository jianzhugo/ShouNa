import { ref } from 'vue'

// 共享状态（模块级，所有组件实例共用）
const fabOpen = ref(false)
const pendingAction = ref(null) // 'add-current' | 'add-item' | null

export function useFab() {
  function toggleFab() {
    fabOpen.value = !fabOpen.value
  }

  function closeFab() {
    fabOpen.value = false
  }

  function requestAddCurrent() {
    pendingAction.value = 'add-current'
    fabOpen.value = false
  }

  function requestAddItem() {
    pendingAction.value = 'add-item'
    fabOpen.value = false
  }

  function clearAction() {
    pendingAction.value = null
  }

  return {
    fabOpen,
    pendingAction,
    toggleFab,
    closeFab,
    requestAddCurrent,
    requestAddItem,
    clearAction
  }
}
