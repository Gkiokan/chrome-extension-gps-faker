<template>
  <q-page padding>

    <div class="main">
        <h1 class="q-mt-none q-mb-md text-h4 text-weight-light">GPS Faker </h1>

        <q-btn dense no-caps class="q-px-md" color="grey-9" label="Neue location" @click="showNewLocation = !showNewLocation" />

        <Location v-if="showNewLocation" @done="showNewLocation = false" />

        <h3 class="q-mb-none text-h6 text-weight-light">Locations </h3>

        <q-select outlined dense v-model="selected" :options="locations" class="q-mb-md"
                  label="Aktuelle Auswahl" stack-label
                  menu-anchor="bottom start" menu-self="bottom start" v-if="false">
            <template v-slot:option="scope">
              <q-item dense v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>
                    <span class="q-mr-md text-weight-bold">{{ scope.opt.name }}</span>
                    <small>{{ scope.opt.lat }} | {{ scope.opt.lng }}</small>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>

            <template v-slot:selected-item="scope">
              <q-chip removable dense
                @remove="scope.removeAtIndex(scope.index)"
                :tabindex="scope.tabindex"
                color="white" text-color="secondary" class="q-ma-none q-pr-lg"
              >
                <span class="q-mr-md text-weight-bold">{{ scope.opt.name }}</span>
                <small>{{ scope.opt.lat }} | {{ scope.opt.lng }}</small>
              </q-chip>
            </template>
        </q-select>

        <q-list separator class="q-mb-md">
          <q-item clickable v-ripple  v-for="item in locations" @click="set(item)"
                  :active="isActive(item)" active-class="text-green">
            <q-item-section avatar>
                <q-icon name="gps_not_fixed" v-if="!isActive(item)" />
                <q-icon name="share_location" v-else />
            </q-item-section>
            <q-item-section>
                <span class="q-mr-md text-weight-bold">{{item.name }}</span>
                <small>{{item.lat }} | {{item.lng }}</small>
            </q-item-section>
            <q-item-section side>  </q-item-section>
          </q-item>
        </q-list>

        <div v-if="false">
          <q-btn unelevated color="green-8" label="Setze Lokation" @click="setLocation" />
          <q-btn unelevated label="load" @click="load" />
        </div>

        <q-space style="height: 20px" />
    </div>

  </q-page>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'PageIndex',

    data(){ return {
        showNewLocation: false,
        data: null,
        selected: null,

        locations: [
            { name: 'Keine Auswahl', lat: null, lng: null },
            { name: 'Lindau', lat: '47.555984', lng: '9.684057' },
            { name: 'Reutin', lat: '47.552563', lng: '9.701841' },
            { name: 'Dietmannsried', lat: '47.812837', lng: '10.290245' },
            { name: 'MM', lat: '47.955380', lng: '10.197768' },
            { name: 'Masi', lat: '47.972948', lng: '10.186935' },
            { name: 'Buchloe', lat: '48.031909', lng: '10.715616' },
        ]
    }},

    mounted(){
        this.load()
        this.$q.bex.on('storage.get.response', this.get)
    },

    beforeDestroy(){
        this.$q.bex.off('storage.get.response', this.get)
    },

    watch: {
        // selected(val){
        //     // this.$q.bex.send('storage.set', { key: '_gps_selected', data: val })
        // }
    },

    methods: {
        load(){
            // alert("run load")
            let s = this.$q.bex.send('storage.get', { key: '_gps_selected' })
                    .then( r => console.log("response in storage r ", r) )

            console.log("load s?", s)
        },

        get(val){
            // alert(JSON.stringify(val.data))
            this.selected = val.data
        },

        set(val){
            this.selected = val
            this.setLocation()
        },

        isActive(item){
            if(this.selected)
              return this.selected.name == item.name

            return false
        },

        setLocation(){
            if(!this.selected) return;

            this.$q.bex.send('storage.set', { key: '_gps_selected', data: this.selected })

            this.$q.bex.send('test', { magic: true, selected: this.selected })
                .then( r => {
                    alert("Standort " + this.selected.name + " gesetzt")
                    console.log(r)
                })
        },

        testPayload(){
            console.log("Running test payload")
        }

    }
})
</script>


<style lang="scss" scoped>
.main {
  display: block;
  width: 500px;
  height: 200px;
}
</style>
