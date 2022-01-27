<template lang="html">
<div>
    <h3 class="q-mb-none text-h6 text-weight-light">Neue Location anlegen </h3>

    <q-input filled dense v-model="location.name" class="q-mb-sm" label="Name" stack-label />

    <div class='row q-col-gutter-sm'>
        <div class='col'>
            <q-input filled dense v-model="location.lat" label="Lat" stack-label />
        </div>
        <div class='col'>
            <q-input filled dense v-model="location.lng" label="Lng" stack-label />
        </div>
    </div>

    <q-space style='height: 20px' />

    <q-btn dense unelevated class="q-px-px full-width" color="green-8" label="save" @click="save" />

</div>
</template>

<script>
export default {
    name: "Location",

    emits: ['done'],

    data(){ return {
        location: {
            name: '',
            lat: '',
            lng: ''
        }
    }},

    methods: {
        clear(){
            this.location = {
                name: '',
                lat: '',
                lng: ''
            }
        },

        save(){
            console.log(this.location)
            this.clear()
            this.$emit('done')
        }

    }
}
</script>

<style lang="css" scoped>
</style>
