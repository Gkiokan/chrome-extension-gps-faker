<template>
  <q-page padding>

    <div class="main">
        <h1 class="q-mt-none q-mb-md text-h4 text-weight-light">GPS Faker </h1>

        <q-btn dense no-caps class="q-px-md" color="grey-9" label="Neue location" @click="showNewLocation = !showNewLocation" />

        <Location v-if="showNewLocation" @done="showNewLocation = false" />

        <q-separate class="q-my-lg" />

        <h3 class="q-mb-none text-h6 text-weight-light">Locations </h3>


        <q-space style="height: 100px" />

        <q-btn label="get location" @click="getLocation" />

        <pre>{{ data }}</pre>
    </div>

  </q-page>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'PageIndex',

    data(){ return {
        showNewLocation: false,
        data: null
    }},

    methods: {
        getLocation(){
            console.log("blub")
            console.log(navigator)
            navigator.geolocation.getCurrentPosition(function(position) {
                console.log(position);
                this.data = position
            });
        },

    }
})
</script>


<style lang="scss" scoped>
.main {
  display: block;
  width: 500px;
  height: 300px;
}
</style>
