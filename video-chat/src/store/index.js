import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

import Twilio, {
  connect,
  createLocalTracks,
  createLocalVideoTrack,
} from "twilio-video";
import axios from "axios";

import { db } from "../../firebase/firestore"
import * as config from '../config'


export default new Vuex.Store({
  state() {
    return {
      username: null,
      user: null,
      facilitator: false,
      sid: null,
      signin: false,
      members: [],
      room_name: null,
      active_room: null,
      twilio_participants: [],
      tracks: {},
      messages: [],
      members_unsubscribe: null,
      message_unsubscribe: null,
      changed_unsubscribe: null,
      changed_member: null,
      remove_member: null
    }
  },
  getters:{
    user(state){
      return {username: state.username,sid: state.sid,facilitator: state.facilitator,user: state.user}
    },
    members(state){
      return state.members
    },
    active_room(state){
      return state.active_room
    },
    twilio_participants(state){
      return state.twilio_participants
    },
    tracks(state){
      return state.tracks
    },
    messages(state){
      return state.messages
    },
    changed_member(state){
      return state.changed_member
    },
    remove_member(state){
      return state.remove_member
    }                                             

    
  },
  mutations: {    
    set_user(state,payload){
      state.username = payload.username
      state.user = payload.room.localParticipant
      state.sid = payload.room.localParticipant.sid
      state.facilitator = payload.facilitator
      state.signin = true
      state.active_room = payload.room      
    },
    leave(state){

      if(state.active_room){
        console.log('leave:' + state.active_room.name)
        state.active_room.disconnect()        
      }
      state.active_room = null
      state.username = null
      state.signin = false      
    },
    update_track(state,payload){
      let participant = payload.participant
      let publication = payload.publication
      let remove = payload.remove
      if(typeof(state.tracks[participant.sid]) == "undefined"){
        //state.tracks[participant.sid] = {}        
        Vue.set(state.tracks, participant.sid, {})
      }      
      console.log(participant)
      console.log(publication)
      if(remove){               
        //state.tracks[participant.sid][publication.kind] = null
        Vue.set(state.tracks[participant.sid], publication.kind, null);        
      }else{
        //state.tracks[participant.sid][publication.kind] = publication
        Vue.set(state.tracks[participant.sid], publication.kind, publication);        
      }      
    },
    // sid => kind => track
    update_participants(state){

      //state.twilio_participants = state.active_room.participants      
      //なかったら追加
      state.active_room.participants.forEach(p =>{
        let item = state.twilio_participants.find(tp => tp.identity === p.identity)
        if(!item){
          Vue.set(state.twilio_participants,state.twilio_participants.length,p)
          //state.twilio_participants.push(p)
        }      
      })
      //ないものは削除
      let rm = []
      state.twilio_participants.forEach((tp,index) =>{
        let item = null
        state.active_room.participants.forEach(p => {
          if(p.identity === tp.identity){
            item = p
          }
        })
        if(item){
          if(tp === item){
          }else{
             Vue.set(state.twilio_participants,index,item)
          }
        }else{
          rm.push(index)
        }
      })
      rm.forEach(i =>{
          state.twilio_participants.splice(i,1)
      })      
    },

    add_participant(state,payload){
      if(!state.twilio_participants.map(p => p.identity).includes(payload.identity)){
        state.twilio_participants.push(payload)              
      }  
    },
    remove_participant(state,payload){    
      state.twilio_participants.forEach((p, index) => {
        if(p.identity == payload.identity) {
          state.twilio_participants.splice(index, 1);
        }
      });
    },
    replace_members(state,payload){
      state.members = payload
    },    
    add_member(state,payload){
      state.members.push(payload)
    },
    update_member(state,payload){
      state.members.forEach((m,i)=>{
        if(m.sid == payload.sid){
          state.members[i] = payload
        }
      })
    },    
    remove_member(state,payload){
      state.remove_member = payload
    },        
    changed_member(state,payload){
      state.changed_member = payload
    }

  },  
  actions: {
    async create_chat({commit,dispatch},payload){
           
      if(this.state.active_room){
        this.commit('leave')
      }
      let connectOptions = {
        name: payload.room,
        //logLevel: 'debug',
        audio: true,
        video: { width: 400,height: 300 }
      }
      return await axios
        .get(`https://${config.TWILIO_DOMAIN}/video-token`)
        .then(async (body) => {
          const token = body.data.token
     
          //Twilio.connect(token, connectOptions)
          return await Twilio.connect(token, connectOptions)          
            .then((room) => {
              console.log(`Connected to Room ${room.name}`);
                            
              //create_chat
              payload.room = room
              commit('set_user',payload) //username,uid

              // save to firestore
              db.collection("rooms").doc(room.sid).set({
                name: room.name,
                sid: room.sid,
                state: room.state,
                created_at: new Date().getTime()
              })
              db.collection("rooms").doc(room.sid).collection('members').doc(room.localParticipant.sid).set({
                username: payload.username,
                sid: room.localParticipant.sid,
                state: room.localParticipant.state,
                facilitator: payload.facilitator,
                score: 50,
                long_score: 0,
                duration: 0,
                created_at: new Date().getTime()
              })              

              dispatch('update_participants')
           
              room.on("participantConnected", function(participant) {
                console.log(participant)
                dispatch('update_participants')             
              })         
              // When a Participant leaves the Room, detach its Tracks.
              room.on('participantDisconnected', function(participant) {
                console.log('participantDisconnected')
                dispatch('update_participants') 
              });                            
            })
            .catch(function (error) {
              console.error(error)
              //
              dispatch('leave')
              throw error
          });
        })
        .catch(function (error) {
          console.error(error)
          throw error          
        });

    },
    update_participants({commit,state}){

      commit('update_participants')

      //update tracks
      state.twilio_participants.forEach(participant =>{
        participant.tracks.forEach(publication => {
          if (publication.isSubscribed) {          
              commit('update_track',{participant,publication: publication.track})                   
          }
        });
        participant.on('trackSubscribed', publication =>  commit('update_track',{participant,publication}));
        //let remove = true
        participant.on('trackUnsubscribed', publication =>  commit('update_track',{participant,publication,remove: true}));        

      })

    },
    leave({commit,state,dispatch}){
      // disconnect
      console.log('leave')
      db.collection("rooms").doc(state.active_room.sid).collection('members').doc(state.user.sid).update({
        state: 'disconnected'
      })      
      commit('leave')    
      dispatch('stop_listener')        
    },

    start_listener({commit,state}){

      if (this.members_unsubscribe) {
        console.warn('listener is running. ', this.members_unsubscribe )
        this.members_unsubscribe()
        this.members_unsubscribe = null
      }

      this.members_unsubscribe = db.collection("rooms").doc(state.active_room.sid).collection('members').where('state', "==",'connected').orderBy('created_at').onSnapshot(function(snapshot) {
        var members = [];
        snapshot.forEach(function(doc) {          
          members.push(doc.data())    
        })
        commit('replace_members',members)
      })

      if (this.changed_unsubscribe) {
        console.warn('listener is running. ', this.changed_unsubscribe )
        this.changed_unsubscribe()
        this.changed_unsubscribe = null
      }      

      this.changed_unsubscribe = db.collection("rooms").doc(state.active_room.sid).collection('members').where('state', "==",'connected').orderBy('created_at').onSnapshot(function(snapshot) {
          var members = [];
          snapshot.docChanges().forEach(function(change) {                
              if (change.type === "modified") {
                commit('changed_member',change.doc.data())
              }      
              if (change.type === "removed") {
                commit('remove_member',change.doc.data())
              }                    
          });          
      });
      

      if (this.message_unsubscribe) {
        console.warn('listener is running. ', this.message_unsubscribe )
        this.message_unsubscribe()
        this.message_unsubscribe = null
      }
      this.message_unsubscribe = db.collection("rooms").doc(state.active_room.sid).collection('messages').orderBy('created_at').onSnapshot(function(snapshot) {          
          snapshot.docChanges().forEach(function(change) {
            console.log(change)
            if (change.type === "added") {
              let data = change.doc.data()
              data.id = change.doc.id
              Vue.set(state.messages,state.messages.length,data)                            
              console.log(change.doc.data())
            }
        });
          //state.messages = messages     
      });      

    },

      // 8. リスナーの停止
        stop_listener ({state }) {
          if (this.members_unsubscribe ) {
            console.log('listener is stopping. ', this.members_unsubscribe )
            this.members_unsubscribe()
            this.members_unsubscribe = null
          }
          if (this.message_unsubscribe ) {
            console.log('listener is stopping. ', this.message_unsubscribe )
            this.message_unsubscribe()
            this.message_unsubscribe = null
          }          
          if (this.changed_unsubscribe ) {
            console.log('listener is stopping. ', this.changed_unsubscribe )
            this.changed_unsubscribe()
            this.changed_unsubscribe = null
          }               
        },
    save_message({commit,state},payload){

      db.collection("rooms").doc(state.active_room.sid).collection('messages').add({    
        member_id: state.user.sid,        
        room_id: state.active_room.sid,
        username: state.username,
        body: payload.text,        
        duration: payload.duration,        
        confidence: payload.confidence,
        created_at: new Date().getTime()
      })      

    },
    add_member({commit},payload){

    },
    remove_member({commit},payload){

    }
  },
  modules: {
  },
});
