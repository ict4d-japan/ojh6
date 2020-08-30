<template>
  <div style="margin-top: 20px;">
    <div class="row justify-center q-gutter-sm">
      <div class="col-2">
        <q-card class>
          <q-card-section class="bg-teal text-white">
            <div class="text-h6" v-if="active_room">Room: {{active_room.name}}</div>
            <div class="text-caption" v-if="active_room">{{active_room.sid}}</div>
          </q-card-section>

          <q-card-section>
            <q-list bordered separator class="bg-grey-1">
              <q-item clickable v-ripple v-for="m in members" :key="m.sid">
                <q-item-section>{{m.username}}</q-item-section>
                <q-item-section side>{{m.score}}</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-7">
        <div class="row" id="my_track">
          <!-- my stream -->
          <div class="col-4">
            <q-card class="my_video">
              <q-card-actions>
                <p class="username" v-if="user">{{user.username}}</p>
                <div id="my_video"  ref="my_video">
                  <video autoplay :srcObject.prop="local_stream" mute="true" style="width: 100%"></video>
                </div>
              </q-card-actions>

              <q-card-actions>
                <q-icon name="mic" size="sm" color="green" @click="mic_mute(true)" v-if="local_audio"/>
                <q-icon name="mic_off" size="sm"  color="red" @click="mic_mute(false)" v-if="!local_audio"/>
                <q-icon name="videocam" size="sm" color="green" @click="video_mute(true)" v-if="local_video" />
                <q-icon name="videocam_off" size="sm" color="red"  @click="video_mute(false)" v-if="!local_video" />                
                <q-space />
                <q-btn @click="leave" flat label="leave" name="leave" />
              </q-card-actions>
            </q-card>
          </div>
          <div class="col-7">      
            <div class="row q-pa-sm">   
            <div id="result-div" ></div>
            </div>

            <div>      
            <div class="overlay"  v-if="warning">
               <div class="txt">{{warning}}</div>
            </div>
            </div>

          </div>
        </div>

        <div class="row" id="remote_tracks">
          <q-separator style="margin-top: 10px;margin-bottom: 10px" />
          <!-- remote -->
          <q-card
            class="my_video"
            :ref="'user_'+v.sid"
            v-for="v in remote_members"
            v-bind:key="v.sid"
          >
            <q-card-actions>
              <p class="remote_username">{{v.username}}</p>

              <div :ref="'video_'+v.sid" class="remote_video" color="priority">
                <!-- video -->
              </div>
            </q-card-actions>

            <q-card-actions align="center">
              <template v-if="user.facilitator">
                <q-btn flat color="primary" :label="get_member_info(v,'long_score')" />
                <q-btn  label="長い" color="grey" rounded size="md" @click="add_long_score(v,10)"/>
                <q-btn  label="長くない" color="primary" rounded size="sm" @click="add_long_score(v,-10)"/>
        
                <q-btn push color="primary" round icon="thumb_up" size="sm" @click="add_score(v,10)"/>
                <q-btn push color="red" round icon="thumb_down" size="sm" @click="add_score(v,-10)"/>                  
                
              </template>
            </q-card-actions>
          </q-card>
        </div>
      </div>
      <div class="col-2">
        <q-card>
          <q-card-section class="bg-teal text-white">
            <div class="text-h6">Logs</div>
          </q-card-section>

          <q-card-section style="min-height: 500px;">
            <q-scroll-area style="height: 400px; ">
              <q-item v-for="(m,i) in reverse_messages" :key="i">
                <q-item-section>        
                  <!-- <q-item-label>Single line item</q-item-label> -->
                  <q-item-label>{{m.body}}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-item-label caption>{{m.username}}</q-item-label>
                </q-item-section>
              </q-item>
            </q-scroll-area>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from "vue/dist/vue.esm.js";
import axios from "axios";
import { db } from "../../firebase/firestore"
import firebase from 'firebase/app'

//import recognizeMic from 'watson-speech/speech-to-text/recognize-microphone';
//const watson = require('watson-developer-cloud');
//const SpeechToTextV1 = require("ibm-watson/speech-to-text/v1");
//const { IamAuthenticator } = require("ibm-watson/auth");

const SPECIAL_WORDS = ['バルス','ザオリク','完全リセット']

export default {
  data() {
    return {
      local_stream: null,
      participants_tracks: [],
      recognition: false,
      rec: null,
      remote_tracks: [],
      remote_members: [],
      members_info: {},
      remote_videos: [],
      local_video: true,
      local_audio: true,
      warning: false,      
      recognized: false
    };
  },
  watch: {
    active_room: {
      handler: function () {
        console.log("watch");
        console.log(this.active_room);
      },
      deep: true,
    },
    twilio_participants: {
      handler: function () {
        console.log("participants changed");
        console.log(this.twilio_participants);
        console.log(this.active_room.participants);
      },
      deep: true,
    },
    tracks: {
      handler: function () {
          this.create_remote_tracks();
      },
      deep: true,
    },
    members: {
      handler: function (a, old) {
          this.create_remote_tracks()
      },
      deep: true,
    },
    changed_member: {
      handler: function () {
          this.change_effect(this.changed_member)
          this.members_info[this.changed_member.sid] = this.changed_member
      },
      deep: true,
    },
    remove_member: {
      handler: function () {
          this.remote_members.forEach((r,i)=>{
              if(r.sid==this.remove_member.sid){
                  this.remote_members.splice(i,1)
              }
          })
      },
      deep: true,
    },  
    messages: {
      handler: function () {
          this.special_words_effect(this.messages.slice(-1)[0].body)
      },
      deep: true,
    },  
  },
  computed: {
    active_room() {
      return this.$store.getters.active_room;
    },
    user() {
      return this.$store.getters.user;
    },
    twilio_participants() {
      console.log("participants");
      return this.$store.getters.twilio_participants;
    },
    tracks() {
      console.log("tracks");
      return this.$store.getters.tracks;
    },
    members() {
      return this.$store.getters.members;
    },
    changed_member(){
      return this.$store.getters.changed_member;
    },
    remove_member(){
      return this.$store.getters.remove_member;
    },    
    messages() {
      return this.$store.getters.messages;
    },
    reverse_messages() {
      return this.messages.slice().reverse();
    },
  },
  mounted() {
    this.$store.dispatch("start_listener");
    this.show_localstream();
    this.start_speech_to_text();
    /////this.watson_speech_to_text();
  },
  methods: {

    leave(event) {
      if (this.rec) {
        this.rec.stop();
      }
      this.$store.dispatch("leave");
    },
    video_mute(state=true){
      this.active_room.localParticipant.videoTracks.forEach(publication => {
        if(state){
            publication.track.disable();
        }else{
            publication.track.enable();
        }          
          this.local_video = !state 
      });
    },
    mic_mute(state=true){
      console.log(state)
      this.active_room.localParticipant.audioTracks.forEach(publication => {
        if(state){          
            publication.track.disable();
        }else{
            publication.track.enable();
            this.start_speech_to_text();   
        }         
        this.local_audio = !state 
      });
    },
    show_localstream() {
      // プレビュー画面の表示
      let self = this;
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          console.log(stream);
          self.local_stream = stream;
        });
    },
    get_member_info(member,key){
      if(this.members_info[member.sid]){
        return this.members_info[member.sid][key]
      }
    },
    change_effect(member){
      console.log('change_effect')
        let klass=""
        if(member.score < 10 ){          
           klass="video1"
        }else if(member.score < 20 && member.score >= 10){
          klass="video1"
        }else if(member.score < 30 && member.score >= 20){
          klass="video2"
        }else if(member.score < 40 && member.score >= 30){
          klass="video3"
        }else if(member.score < 50 && member.score >= 40){
          klass="video4"
        }else if(member.score < 60 && member.score >= 50){
          klass="video5"
        }else if(member.score < 70 && member.score >= 60){
          klass="video6"
        }else if(member.score < 80 && member.score >= 70){
          klass="video7"
        }else if(member.score < 90 && member.score >= 80){
          klass="video8"
        }else if(member.score < 100 && member.score >= 90){
          klass="video9"          
        }else if(member.score < 110 && member.score >= 100){
          klass="video10"          
        }else if(member.score < 120 && member.score >= 110){
          klass="video11"          
        }else if(member.score < 130 && member.score >= 120){
          klass="video12"          
        }else if(member.score < 140 && member.score >= 130 ){
          klass="video13"          
        }else if(member.score < 150 && member.score >= 140  ){
          klass="video14"          
        }else if(member.score >= 150  ){
          klass="video15"          
        }else{
          klass=""            
        }      
        let opacity=1.0
        console.log(member.long_score)

        if(member.long_score < 50 && member.long_score >= 30 ){          
           opacity = 0.9
        }else if(member.long_score < 60 && member.long_score >= 50 ){          
           opacity = 0.8
        }else if(member.long_score < 70 && member.long_score >= 60 ){          
           opacity = 0.5         
        }else if(member.long_score < 80 && member.long_score >= 70 ){          
           opacity = 0.3        
        }else if(member.long_score < 100 && member.long_score >= 80 ){          
           opacity = 0.2
        }else if(member.long_score >= 100 ){          
           opacity = 0.0
        }else{

        }
        
      if(member.sid == this.user.sid){
        //自分
        console.log('me')
        this.$refs.my_video.classList = []
        this.$refs.my_video.classList.add(klass)     
        this.$refs.my_video.style.opacity = opacity

      }else{
        //remote
        this.$refs["video_"+member.sid]
        this.$refs["video_"+member.sid][0].classList = []
        this.$refs["video_"+member.sid][0].classList.add(klass)     
        this.$refs["video_"+member.sid][0].style.opacity = opacity        
      }

    },
    add_score(member,score=10){
          db.collection('rooms').doc(this.active_room.sid).collection('members').doc(member.sid).update({
            score: firebase.firestore.FieldValue.increment(score)
        });
    },

    add_long_score(member,score=10){
          db.collection('rooms').doc(this.active_room.sid).collection('members').doc(member.sid).update({
            long_score: firebase.firestore.FieldValue.increment(score)
        });
    },
    create_remote_tracks(){
        const self = this;
        console.log('====')
        console.log(self.user)

        console.log(this.members.length)
        // add
        this.members.forEach((m) => {
          let isexist = false;
          console.log("m:"+m.username)
            if (m.sid != self.user.sid) {              
              self.remote_members.forEach((r) => {
                console.log("r:"+r.username)
                if (r.sid == m.sid) {
                  isexist = true;
                }
              });
              if (!isexist) {
                self.remote_members.push(m);      
              }                   
            }           
            
        });     
        
        // 遅延させる
        setTimeout(this.create_track_dom, 1000);
        
    },
    create_track_dom(){
          this.members.forEach((m) => {      
            if (this.tracks[m.sid] && this.tracks[m.sid]["video"] && this.$refs["user_" + m.sid]) {
              console.log("aaa");
              console.log(this.$refs["user_" + m.sid]);              
              console.log(this.$refs["video_" + m.sid]);
              if (this.$refs["video_" + m.sid][0].childNodes.length == 0) {
                let v = this.tracks[m.sid]["video"].attach();        
                v.style = "width: 100%;";
                this.$refs["video_" + m.sid][0].appendChild(v);
                let a = this.tracks[m.sid]["audio"].attach();
                this.$refs["video_" + m.sid][0].appendChild(a);
              }
            }
          });
    },    
    watson_speech_to_text() {
      //var watson = require('watson-developer-cloud');

      var authorization = new watson.AuthorizationV1({
        iam_apikey: "",
        iam_url:
          "",
      });

      authorization.getToken(function (err, token) {
        if (!token) {
          console.log("error:", err);
        } else {
          // Use your token here
          let options = {
            token,
            model: "ja-JP_BroadbandModel",
            objectMode: true,
            extractResults: true,
          };

          const stream = recognizeMic({
            options,
          });

          stream.on("data", (data) => {
            if (data.final) {
              const transcript = data.alternatives[0].transcript;
              console.log(transcript);
            }
          });
        }
      });

      return;
      const speechToText = new SpeechToTextV1({
        authenticator: new IamAuthenticator({
          apikey: "",
        }),
        serviceUrl:
          "",
      });
      console.log(speechToText);
      let options = {
        token,
        model: "ja-JP_BroadbandModel",
        objectMode: true,
        extractResults: true,
      };

      const stream = speechToText.recognizeUsingWebSocket(options);
      console.log(stream);

      stream.on("data", (data) => {
        if (data.final) {
          const transcript = data.alternatives[0].transcript;
          console.debug(transcript);
          //this.setState({ transcripts: [...this.state.transcripts, transcript] });
        }
        console.debug(data);
      });
    },
     special_words_effect(mes){
      for(let i = 0; i < SPECIAL_WORDS.length; i++){
        if(mes.includes(SPECIAL_WORDS[i])){
            console.log(SPECIAL_WORDS[i])
            this.display_warning(SPECIAL_WORDS[i])
            break
          }             
      } 
    },
    display_warning(w){          
          this.warning = w
          if(w == 'ザオリク'){
            setTimeout(function(){db.collection('rooms').doc(this.active_room.sid).collection('members').doc(this.user.sid).update({
                  long_score: 0
            })}.bind(this),2800);                    
          }else if (w == '完全リセット'){
            this.members.forEach((m) =>{
                db.collection('rooms').doc(this.active_room.sid).collection('members').doc(m.sid).update({
                  score: 50,
                  long_score: 0
                })
            })
  
          }
        setTimeout(function(){this.warning=false}.bind(this),3000)
    },
    start_speech_to_text() {
      console.log('start_speech')
      const rec = new webkitSpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
    
      rec.lang = "ja-JP";
    
      //this.rec = rec;

      const resultDiv = document.querySelector("#result-div");

      let finalTranscript = "";

      let start = null;
   
      rec.onresult = (event) => {
        this.recognized = true

        let confidence = 0
        let interimTranscript = ""; // 暫定(灰色)の認識結果

        for (let i = event.resultIndex; i < event.results.length; i++) {
          let transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {            
            finalTranscript += transcript;        
            //console.log(duration / 1000);
  
             confidence =  event.results[i][0].confidence
                this.$store.dispatch("save_message", {
              text: finalTranscript,
              duration: 0,
              confidence: confidence,
              });
          } else {
            interimTranscript = transcript;       
          }
        }
        resultDiv.innerHTML =
          finalTranscript +
          '<i style="color:#ddd;">' +
          interimTranscript +
          "</i>";
        
        if(finalTranscript){     
         finalTranscript = ""
          //this.start_speech_to_text()
        }
 
      };

      rec.onstart = () => {
        //console.log("on start");
        this.recognized = false
      };
      rec.onend = () => {
        //console.log("on end");
      };

      rec.onerror = (e) => {
        console.log(e)
        if (e.error === "no-speech") {
          // 無音状態で一定時間が経過した、ということなので再度音声認識をスタート      
          this.start_speech_to_text();
        }
      };

      rec.onspeechstart = () => {
        //console.log("on speech start");
        start = new Date();
      };
      rec.onspeechend = () => {
        console.log("on speech end");
      setTimeout(()=>{        
        this.start_speech_to_text();   
      },500);        
      };
      rec.onosundstart = () => {
        //console.log("on sound start");
      };
      rec.onsoundend = () => {
        //console.log("on sound end");
      };

      rec.onaudiostart = () => {
        //console.log("on audio start");
      };
      rec.onaudioend = () => {
        //console.log("on audio end");
      };
      rec.start();
    },
  },
};
</script>

<style scoped>
#my_video {
  opacity: 1;
  width: 350px;
  min-width: 100px;
}

#my_video video {
  width: 100%;
  max-width: 100%;  
}

.my_video {
  width: 100%;
  max-width: 350px;
}

.username {
  position: absolute;
  top: 8px;
  left: 0;
  margin: 0;
  padding: 0.5em 0.5em 0.5em 1em;
  background: rgba(242, 47, 70, 0.8);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  z-index: 100;
}

.remote_username {
  position: absolute;
  top: 8px;
  left: 0;
  margin: 0;
  padding: 0.5em 0.5em 0.5em 1em;
  background: rgba(23, 221, 16, 0.411);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  z-index: 100;
}
/*
#my_video::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 18px;
  width: 170px;
  height: 120px;
  background: url("../assets/himawari_5.png");
  background-size: cover;
}
*/

.video15::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 300px;
  height: 240px;
  background: url("../assets/himawari_p10.png");
  background-size: contain;
  background-repeat: no-repeat;
}


.video14::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 220px;
  height: 160px;
  background: url("../assets/himawari_p9.png");
  background-size: contain;
  background-repeat: no-repeat;
}


.video13::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 200px;
  height: 160px;
  background: url("../assets/himawari_p8.png");
  background-size: contain;
  background-repeat: no-repeat;
}


.video12::before {
  content: "";
  position: absolute;
  bottom: 60px;
  right: 10px;
  width: 180px;
  height: 160px;
  background: url("../assets/himawari_p7.png");
  background-size: contain;
  background-repeat: no-repeat;
}


.video11::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 180px;
  height: 140px;
  background: url("../assets/himawari_p6.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video10::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 180px;
  height: 120px;
  background: url("../assets/himawari_p5.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video9::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 130px;
  height: 100px;
  background: url("../assets/himawari_p4.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video8::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 130px;
  height: 100px;
  background: url("../assets/himawari_p3.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video7::before {
  content: "";
  position: absolute;
  bottom: 50px;
  right: 10px;
  width: 130px;
  height: 100px;
  background: url("../assets/himawari_p2.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video6::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 0px;
  width: 130px;
  height: 100px;
  background: url("../assets/himawari_p1.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video5::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 18px;
  width: 170px;
  height: 120px;
  /*
  background: url("../assets/himawari_p1.png");
  background-size: contain;
  background-repeat: no-repeat;
  */
}

.video4::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 110px;
  height: 100px;
  background: url("../assets/himawari_n1.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video3::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 110px;
  height: 100px;
  background: url("../assets/himawari_n2.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video2::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 110px;
  height: 100px;
  background: url("../assets/himawari_n3.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video1::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 110px;
  height: 100px;
  background: url("../assets/himawari_n4.png");
  background-size: contain;
  background-repeat: no-repeat;
}

#warning{
  text-align: center;
  font-size: 180px;
  color: red;
  font-weight: bold;
}

.overlay {
    position:absolute;
    top:0;
    left:0;
    right:0;
    bottom:0;
    background-color:rgba(0, 0, 0, 0.85);
    background: url(data:;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABl0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuNUmK/OAAAAATSURBVBhXY2RgYNgHxGAAYuwDAA78AjwwRoQYAAAAAElFTkSuQmCC) repeat scroll transparent\9;
    z-index:9999;
    color:white;
}


.overlay {
    text-align: center;
}
 
.overlay:before {
    content: '';
    display: inline-block;
    height: 100%;
    vertical-align: middle;
    margin-right: -0.25em;
}

.txt {
    display: inline-block;
    vertical-align: middle;
    padding: 10px 15px;
    position:relative;
    font-size: 300px;
    color: red;
    font-weight:bold;
}


</style>