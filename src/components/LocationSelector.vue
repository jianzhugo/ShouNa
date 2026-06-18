<template>
  <div class="location-selector">
    <div class="form-group">
      <label class="form-label">房屋</label>
      <select class="form-select" v-model="selectedHouseId" @change="onHouseChange">
        <option value="">请选择房屋</option>
        <option v-for="house in houses" :key="house.id" :value="house.id">{{ house.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">房间</label>
      <select class="form-select" v-model="selectedRoomId" @change="onRoomChange" :disabled="!selectedHouseId">
        <option value="">请选择房间</option>
        <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">收纳位置</label>
      <select class="form-select" v-model="selectedStorageId" :disabled="!selectedRoomId">
        <option value="">请选择收纳位置</option>
        <option v-for="storage in storages" :key="storage.id" :value="storage.id">{{ storage.name }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '@/api'

const props = defineProps({
  familyId: { type: Number, required: true },
  defaultHouseId: { type: Number, default: null },
  defaultRoomId: { type: Number, default: null },
  defaultStorageId: { type: Number, default: null }
})

const emit = defineEmits(['update:houseId', 'update:roomId', 'update:storageId', 'change'])

const houses = ref([])
const rooms = ref([])
const storages = ref([])
const selectedHouseId = ref('')
const selectedRoomId = ref('')
const selectedStorageId = ref('')

async function fetchHouses() {
  try {
    const res = await api.get(`/houses?family=${props.familyId}`)
    houses.value = res.data || []
    if (props.defaultHouseId) {
      selectedHouseId.value = props.defaultHouseId
      await fetchRooms()
    }
    // Emit initial location after default cascade completes
    emitChange()
  } catch {
    houses.value = []
  }
}

async function fetchRooms() {
  if (!selectedHouseId.value) {
    rooms.value = []
    return
  }
  try {
    const res = await api.get(`/rooms?house=${selectedHouseId.value}`)
    rooms.value = res.data || []
    if (props.defaultRoomId) {
      selectedRoomId.value = props.defaultRoomId
      await fetchStorages()
    }
    // Emit after cascade completes
    emitChange()
  } catch {
    rooms.value = []
  }
}

async function fetchStorages() {
  if (!selectedRoomId.value) {
    storages.value = []
    return
  }
  try {
    const res = await api.get(`/storage?room=${selectedRoomId.value}`)
    storages.value = res.data || []
    if (props.defaultStorageId) {
      selectedStorageId.value = props.defaultStorageId
    }
    // Emit after cascade completes
    emitChange()
  } catch {
    storages.value = []
  }
}

function onHouseChange() {
  selectedRoomId.value = ''
  selectedStorageId.value = ''
  rooms.value = []
  storages.value = []
  fetchRooms()
  emitChange()
}

function onRoomChange() {
  selectedStorageId.value = ''
  storages.value = []
  fetchStorages()
  emitChange()
}

function emitChange() {
  emit('update:houseId', selectedHouseId.value || null)
  emit('update:roomId', selectedRoomId.value || null)
  emit('update:storageId', selectedStorageId.value || null)
  emit('change', {
    houseId: selectedHouseId.value || null,
    roomId: selectedRoomId.value || null,
    storageId: selectedStorageId.value || null
  })
}

watch(selectedStorageId, () => {
  emitChange()
})

onMounted(() => {
  fetchHouses()
})
</script>
