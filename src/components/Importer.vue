<template>
    <div class="Importer">
        <h3 class="q-my-none text-h6 text-weight-light"> Importer </h3>

        <q-input outlined type="textarea" dense v-model="input"  placeholder="Import Code" stack-label rows="20" /> 

        <div class='row q-col-gutter-sm q-mt-sm'>
            <div class='col'>
                <q-btn dense no-caps unelevated class="q-px-px full-width" color="green-8" label="Importieren" @click="save" />
            </div>
            <div class=''>
                <q-btn dense no-caps unelevated class="q-px-md" color="red" label="Abbruch" @click="cancel" />
            </div>
        </div>

        <div class="q-mt-sm text-red-500" v-if="error"> {{error}} </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const emits = defineEmits(['done', 'reload'])

const $q = useQuasar()
const bex = $q.bex

const input = ref('')
const error = ref('')

const save = async () => {
    const listInput = await bex.send({ event: 'storage.get', to: 'background', payload: '_gps_customLocations' })
    const list = Array.isArray(listInput) ? listInput : []    

    console.log("[importer] customLocations", list)

    let newLocations = []

    try {
        newLocations = JSON.parse(input.value)
    }
    catch( e ){
        error.value = e?.message ?? e

        setTimeout(() => {
            error.value = ''
        }, 2000);
        return;
    }

    // Merge without duplicates
    const merged = [...list]
    newLocations.forEach(newLoc => {
        const exists = list.some(existing => 
            existing.lat === newLoc.lat && 
            existing.lng === newLoc.lng && 
            existing.name === newLoc.name
        )
        
        if (!exists) {
            merged.push({ ...newLoc, removeable: true })
        }
    })

    // handle save
    // Save merged list
    await bex.send({ 
        event: 'storage.set', to: 'background', 
        payload: { 
            key: '_gps_customLocations', 
            value: merged 
        } 
    })    

    emits('reload')
    emits('done')
}

const cancel = () => emits('done')


/**
 * Helpers
 */
const isValidLocation = (location) => {
  return location && 
         typeof location === 'object' &&
         typeof location.lat === 'string' &&
         typeof location.lng === 'string' &&
         typeof location.name === 'string' &&
         location.lat.trim() !== '' &&
         location.lng.trim() !== '' &&
         location.name.trim() !== '' &&
         !isNaN(parseFloat(location.lat)) &&
         !isNaN(parseFloat(location.lng))
}
</script>