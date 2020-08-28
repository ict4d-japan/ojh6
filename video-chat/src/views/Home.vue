<template>
  <div>
    <q-page-container v-if="active_room">              
      　<VideoChat />        
    </q-page-container>
    <q-page-container v-else>          
        <SignIn />
    </q-page-container>    
  </div>
</template>

<script>
import SignIn from '../components/SignIn.vue'
import VideoChat from '../components/VideoChat.vue'
import { db } from "../../firebase/firestore"

export default {
  name: 'Home',
  components: {
    SignIn,
    VideoChat
  },  
  created(){

  },
  computed: {
    active_room() {
      return this.$store.getters.active_room
    }
  },
  data() {
    return {
    
    };
  },
  mounted(){
    // 破棄される前にleave
    window.onbeforeunload = this.leave
  },
  beforeDestroy() {
    // 破棄される前にleave
    window.removeEventListener("beforeunload", this.leave);   
  },
  methods: {
     leave(event) {
      this.$store.dispatch('leave') 
     }
  }
};
</script>

<style>
</style>
