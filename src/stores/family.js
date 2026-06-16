import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useFamilyStore = defineStore('family', () => {
  const families = ref([])
  const currentFamilyId = ref(localStorage.getItem('currentFamilyId') || null)

  async function fetchFamilies() {
    const res = await api.get('/families')
    families.value = res.data
    if (!currentFamilyId.value && res.data.length > 0) {
      currentFamilyId.value = res.data[0].id
      localStorage.setItem('currentFamilyId', res.data[0].id)
    }
    return res.data
  }

  function setCurrentFamily(id) {
    currentFamilyId.value = id
    localStorage.setItem('currentFamilyId', id)
  }

  async function createFamily(name) {
    const res = await api.post('/families', { name })
    families.value.push(res.data)
    return res.data
  }

  async function joinFamily(inviteCode) {
    const res = await api.post('/families/join', { invite_code: inviteCode })
    return res.data
  }

  return { families, currentFamilyId, fetchFamilies, setCurrentFamily, createFamily, joinFamily }
})
