<template>
    <div class="Importer">
        <h3 class="q-my-none text-h6 text-weight-light"> Exporter </h3>

        <q-input outlined readonly type="textarea" dense v-model="input"  placeholder="" stack-label rows="10" /> 

        <div class='row q-col-gutter-sm q-mt-sm'>
            <div class='col'>
                <q-btn dense no-caps unelevated class="q-px-px full-width" color="green-8" label="Kopieren" @click="save" />
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

const emits = defineEmits(['done'])

const $q = useQuasar()
const bex = $q.bex

const input = ref('')
const error = ref('')

const load = async () => {
    console.log("[exporter] load")
    const listInput = await bex.send({ event: 'storage.get', to: 'background', payload: '_gps_customLocations' })
    const list = Array.isArray(listInput) ? listInput : []
    console.log("[exporter] customLocations", list)
    input.value = JSON.stringify(list)
}

const save = async () => {
    await load()

    try {
        await copyToClipboard(input.value)
        message({ message: "Exporter Code kopiert" })
    }
    catch( e ){
        message(e)
        return;
    }

    emits('done')
}

const message = (e) => {
    error.value = e?.message ?? e

    setTimeout(() => {
        error.value = ''
    }, 2000);
    return;    
}

const cancel = () => emits('done')

/**
 * Helper
 */
const copyToClipboard = async (data) => {
    try {
        await navigator.clipboard.writeText(data)
    } catch (e) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = data
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)            
    }
}

defineExpose({ 
    load 
})
</script>