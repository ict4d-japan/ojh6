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
      <div class="col-md-7">
        <div class="row" id="my_track">
          <!-- my stream -->
          <div class="col-4">
            <q-card class="my_video">
              <q-card-actions>
                <p class="username" v-if="user">{{user.username}}</p>
                <div id="my_video" ref="my_video">
                  <video autoplay :srcObject.prop="local_stream" mute="true"></video>
                </div>
              </q-card-actions>

              <q-card-actions>
                <q-icon name="mic" size="sm" />
                <q-icon name="videocam" size="sm" />
                <q-space />
                <q-btn @click="leave" flat label="leave" name="leave" />
              </q-card-actions>
            </q-card>
          </div>
          <div class="col-8">
            <div id="result-div"></div>
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
              </template>
            </q-card-actions>
          </q-card>
        </div>
      </div>
      <div class="col-md-2">
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
    this.start_speach_to_text();
    /////this.watson_speech_to_text();
  },
  methods: {
    leave(event) {
      if (this.rec) {
        this.rec.stop();
      }
      this.$store.dispatch("leave");
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
          klass="video2"
        }else if(member.score < 30 && member.score >= 20){
          klass="video3"
        }else if(member.score < 40 && member.score >= 30){
          klass="video4"
        }else if(member.score < 50 && member.score >= 40){
          klass="video5"
        }else if(member.score < 60 && member.score >= 50){
          klass="video6"
        }else if(member.score < 70 && member.score >= 60){
          klass="video7"
        }else if(member.score < 80 && member.score >= 70){
          klass="video8"
        }else if(member.score < 90 && member.score >= 80){
          klass="video9"
        }else if(member.score >= 90){
          klass="video9"          
        }else{
          klass=""            
        }      
        let opacity=1.0
        console.log(member.long_score)
        if(member.long_score < 60 && member.long_score >= 50 ){          
           opacity = 0.8
        }else if(member.long_score < 70 && member.long_score >= 60 ){          
           opacity = 0.5          
        }else if(member.long_score < 80 && member.long_score >= 70 ){          
           opacity = 0.2        
        }else if(member.long_score < 100 && member.long_score >= 80 ){          
           opacity = 0.1
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
    start_speach_to_text() {
      const rec = new webkitSpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "ja-JP";
      if (this.rec) {
        this.rec.stop();
      }
      this.rec = rec;

      const resultDiv = document.querySelector("#result-div");

      let finalTranscript = "";

      let start = null;

      rec.onresult = (event) => {
        let interimTranscript = ""; // 暫定(灰色)の認識結果
        for (let i = event.resultIndex; i < event.results.length; i++) {
          let transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            var duration = new Date().getTime() - start.getTime();
            //console.log(duration / 1000);
            this.$store.dispatch("save_message", {
              text: finalTranscript,
              duration: duration / 1000,
              confidence: event.results[i][0].confidence,
            });
          rec.stop(); 
            this.start_speach_to_text();            
          } else {
            interimTranscript = transcript;
            this.recognition = true;
          }
        }
        resultDiv.innerHTML =
          finalTranscript +
          '<i style="color:#ddd;">' +
          interimTranscript +
          "</i>";
      };

      this.recognition = false;

      rec.onstart = () => {
        //console.log("on start");
      };
      rec.onend = () => {
        //console.log("on end");
      };

      rec.onerror = (e) => {
        if (e.error === "no-speech") {
          // 無音状態で一定時間が経過した、ということなので再度音声認識をスタート
          rec.stop();
          this.start_speach_to_text();
        }
      };

      rec.onspeechstart = () => {
        //console.log("on speech start");
        start = new Date();
      };
      rec.onspeechend = () => {
        //console.log("on speech end");
      };
      rec.onosundstart = () => {
        //console.log("on sound start");
      };
      rec.onsoundend = () => {
        //console.log("on sound end");
        rec.stop();
        this.start_speach_to_text();
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
  min-width: 300px;

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
.video9::before {
  content: "";
  position: absolute;
  bottom: 20%;
  right: -10%;
  width: 50%;
  height: 30%;
  background: url("../assets/himawari_9.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video8::before {
  content: "";
  position: absolute;
  bottom: 20%;
  right: 0px;
  width: 40%;
  height: 30%;
  background: url("../assets/himawari_8.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video7::before {
  content: "";
  position: absolute;
  bottom: 20%;
  right: 0px;
  width: 30%;
  height: 30%;
  background: url("../assets/himawari_7.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video6::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 18px;
  width: 170px;
  height: 120px;
  background: url("../assets/himawari_6.png");
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
  background: url("../assets/himawari_5.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video4::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 18px;
  width: 170px;
  height: 120px;
  background: url("../assets/himawari_4.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video3::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 18px;
  width: 170px;
  height: 120px;
  background: url("../assets/himawari_3.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video2::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 18px;
  width: 170px;
  height: 120px;
  background: url("../assets/himawari_2.png");
  background-size: contain;
  background-repeat: no-repeat;
}

.video1::before {
  content: "";
  position: absolute;
  bottom: 70px;
  right: 18px;
  width: 170px;
  height: 120px;
  background: url("../assets/himawari_1.png");
  background-size: contain;
  background-repeat: no-repeat;
}



</style>