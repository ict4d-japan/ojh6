<template>
  <div class="flex flex-center" style="margin-top: 100px">
    <div class="q-pa-md" style="min-width: 600px;max-width: 800px">
      <q-card class="my-card">
        <q-card-section>
          <div class="text-h6">Sign In</div>
        </q-card-section>

        <q-separator />


        <q-card-section>
          <q-form @submit="signin" class="q-gutter-md">

            <q-select outlined v-model="room" :options="room_options" label="Room" />


            <q-input
              v-model="username"
              label="Username"
              lazy-rules
              :rules="[ val => val && val.length > 0 || 'Please type something']"
            />

      <q-toggle
        v-model="facilitator"
        label="Facilitator"
      />

            <div>
              <q-btn label="Join" type="submit" color="primary" :loading="loading" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script>

export default {
  data() {
    return {
      username: null,
      loading: false,
      facilitator: false,
      disabled: false,
      room: 'ICT4D',
      room_options: [
        'ICT4D','test'
      ]
    };
  },

  methods: {
    signin() {
      this.loading = true
      this.$store.dispatch('create_chat',{username: this.username,facilitator: this.facilitator,room: this.room}).then().catch(function (error) {
        this.loading = false
        this.notify_error(error.message)
      }.bind(this))
   
    },
  notify_error(message){  
    this.$q.notify({
        color: "red",
        textColor: "white",
        icon: "cloud_done",
        message: message,
      });      
  }    
  },

};
</script>