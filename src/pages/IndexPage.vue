<template>
  <q-page padding>
    <div class="main">

      <div class="flex flex-wrap q-gutter-md" v-if="!isEdit">
          <q-btn dense rounded no-caps class="q-px-md" color="grey-9" label="Neuen Standort anlegen"
            @click="showNewLocation = !showNewLocation" />

          <q-btn dense rounded no-caps class="q-px-md" color="grey-10" label="Import"
            @click="showImporter = !showImporter" />

          <q-btn dense rounded no-caps class="q-px-md" color="red-10" label="Export"
            @click="openExporter()" />
      </div>

      <Location v-if="showNewLocation" @done="showNewLocation = false" @add="addNewLocation" />
      <Importer v-if="showImporter" @done="showImporter = false" @reload="loadCustomLocations" />
      <Exporter v-if="showExporter" @done="showExporter = false" ref="exporterRef" />

      <h3 class="q-mb-none text-h6 text-weight-light">Standorte</h3>

      <q-list separator class="q-mb-md" v-if="!loading">
        <q-item active-class="text-green"
                clickable v-ripple v-for="item in locations"
                :key="item.name" :active="isActive(item)"
                @click="set(item)">
          <q-item-section avatar>
            <q-icon name="gps_not_fixed" v-if="!isActive(item)" />
            <q-icon name="share_location" v-else />
          </q-item-section>
          <q-item-section>
            <span class="q-mr-md text-weight-bold">{{ item.name }}</span>
            <small>{{ item.lat }} | {{ item.lng }}</small>
          </q-item-section>
          <q-item-section side>
            <q-btn round flat icon="delete" @click.stop="removeLocation(item)" v-if="item.removeable" />
          </q-item-section>
        </q-item>
      </q-list>

      <pre v-if="debug">{{selected}}</pre>

      <q-space style="height: 20px" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useQuasar } from 'quasar'

import Location from 'components/Location.vue'
import Importer from 'components/Importer.vue'
import Exporter from 'components/Exporter.vue'

const $q = useQuasar()
const bex = $q.bex

// --- Reactive state ---
const debug           = false
const loading         = ref(false)

const showNewLocation = ref(false)
const showImporter    = ref(false)
const showExporter    = ref(false)
const exporterRef     = ref(null)

const isEdit          = computed( () => {
  if( showNewLocation.value||showImporter.value||showExporter.value )
    return true 

  return false
})

const selected        = ref(null)
const customLocations = ref([])

const defaultLocations = [
  { name: 'Keine Auswahl', lat: null, lng: null, removeable: false },
  { name: 'Lindau', lat: '47.555984', lng: '9.684057', removeable: false },
  { name: 'Reutin', lat: '47.552563', lng: '9.701841', removeable: false },
  { name: 'Dietmannsried', lat: '47.812837', lng: '10.290245', removeable: false },
  { name: 'MM', lat: '47.955380', lng: '10.197768', removeable: false },
  { name: 'Masi', lat: '47.972948', lng: '10.186935', removeable: false },
  { name: 'Buchloe', lat: '48.031909', lng: '10.715616', removeable: false }
]

const locations = computed(() => [...defaultLocations, ...customLocations.value])

const openExporter = async () => {
  showExporter.value = true
  await nextTick()
  exporterRef.value?.load()
}

function setCustomLocations(val) {
  if (val.data) customLocations.value = val.data
}

function setSelected(val) {
  if (val.data) selected.value = val.data
}

function isActive(item) {
  // console.log("isactive", selected.value?.name, item.name, selected.value?.name == item.name)
  return selected.value?.name == item.name
}

/** 
 * something?  
 * */
function set(val) {
  selected.value = val
  setLocation()
}

function setLocation() {
  if (!selected.value) return
  console.log("[app] Set location handler", selected.value)

  bex.send({ event: 'storage.set', to: 'background', payload: { key: '_gps_selected', value: selected.value } })
  bex.send({ event: 'setLocation', to: 'background', payload: selected.value })
}

/**
 * Location CRUD
 */
async function loadSelected() {
    // bex.send('storage.get', { key: '_gps_selected', responseTo: 'storage.get.selected.response' })
    const selectedFromStore = await bex.send({ event: 'storage.get', to: 'background', payload: '_gps_selected' })
    console.log("[app] load selected", selectedFromStore)
    selected.value = selectedFromStore ?? null  
}

async function loadCustomLocations() {
    // bex.send('storage.get', { key: '_gps_customLocations', responseTo: 'storage.get.customLocations.response' })
    const list = await bex.send({ event: 'storage.get', to: 'background', payload: '_gps_customLocations' })
    customLocations.value = Array.isArray(list) ? list : []    
    console.log("[app] loaded custom locations", customLocations.value)
}

async function addNewLocation(item) {
  customLocations.value.push({ ...item, removeable: true })
  const tx = await bex.send({ event: 'storage.set', to: 'background', payload: { key: '_gps_customLocations', value: customLocations.value } })
  console.log("[app] save new location", tx, item)
}

async function removeLocation(item) {
  customLocations.value = customLocations.value.filter(x => x.name !== item.name)
  const tx = await bex.send({ event: 'storage.set', to: 'background', payload: { key: '_gps_customLocations', value: customLocations.value } })
  console.log("[app] remove location", tx, item)
}

// --- Lifecycle ---
onMounted( async () => {
  await loadCustomLocations()
  await loadSelected()

  bex.on('storage.get.selected.response', setSelected)
  bex.on('storage.get.customLocations.response', setCustomLocations)
})

onBeforeUnmount(() => {
  bex.off('storage.get.selected.response', setSelected)
  bex.off('storage.get.customLocations.response', setCustomLocations)
})
</script>

<style lang="scss" scoped>
.main {
  display: block;
  width: 100%;
  height: 200px;
}
</style>
