<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="q-px-md bg-dark text-subtitle1">
        <q-toolbar-title class="text-subtitle2">
            GPS Faker 
            <span class="text-bold text-grey-6"> V2 </span>
            <small class="text-red-5 q-pl-sm">v{{ $q.version }}</small>
        </q-toolbar-title>        
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'

const leftDrawerOpen = ref(false)

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

onMounted( () => {

})
</script>
