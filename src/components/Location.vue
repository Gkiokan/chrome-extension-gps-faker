<template lang="html">
<div>
    <h3 class="q-my-none text-h6 text-weight-light">Neuen Standort anlegen </h3>

    <q-input outlined dense v-model="location.name" class="q-mb-sm" label="Name" stack-label />

    <div class='row q-col-gutter-sm q-mb-sm'>
        <div class='col'>
            <q-input outlined dense v-model="location.lat" label="Lat" stack-label />
        </div>
        <div class='col'>
            <q-input outlined dense v-model="location.lng" label="Lng" stack-label />
        </div>
    </div>

    <q-input outlined dense v-model="autoparse" label="Auto Parse (lat,lng)" stack-label />

    <q-space style='height: 10px' />

    <div class='row q-col-gutter-sm'>
        <div class='col'>
            <q-btn dense no-caps unelevated class="q-px-px full-width" color="green-8" label="Standort hinzufügen" @click="save" />
        </div>
        <div class=''>
            <q-btn dense no-caps unelevated class="q-px-md" color="red" label="Abbruch" @click="cancel" />
        </div>
    </div>
    

</div>
</template>

<script>
export default {
    name: "Location",

    emits: ['done', 'add'],

    data(){ return {
        location: {
            name: '',
            lat: '',
            lng: ''
        },
        autoparse: '',
    }},

    watch: {
        autoparse(s){
            if( !s )
                return;
            
            // s = "48.80550062508564, 9.516472511724706"
            let split = s.split(',').map( x => x.trim() )
            console.log("[app][auto-parse]", split)

            if( split.length != 2 )
                return;            

            this.location.lat = split[0]
            this.location.lng = split[1]

            this.autoparse = ''
        }
    },

    methods: {
        clear(){
            this.location = {
                name: '',
                lat: '',
                lng: ''
            }
        },

        cancel(){
            this.clear()
            this.$emit('done')
        },

        save(){
            console.log(this.location)

            if(!this.location.name && !this.location.lat && !this.location.lng){
                return this.$q.notify({ 
                    message: "Alle felder ausfüllen!",
                    icon: "warning",
                    color: "negative",
                    position: "top",
                })
            }

            this.$emit('add', this.location)
            this.cancel()
        }

    }
}
</script>

<style lang="css" scoped>
</style>
