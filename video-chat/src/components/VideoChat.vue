<template>
  <div style="margin-top: 20px;">
    <div class="row justify-center q-gutter-sm">
      <div class="col-2">
        <q-card class>
          <q-card-section class="bg-teal text-white">
            <div class="text-h6" v-if="active_room">Room: {{active_room.name}}</div>
            <div class="text-caption">{{active_room.sid}}</div>
          </q-card-section>

          <q-card-section>
            <q-list bordered separator class="bg-grey-1">
              <q-item clickable v-ripple v-for="m in members" :key="m.sid">
                <q-item-section>{{m.username}}</q-item-section>
                <q-item-section side>{{m.score}}</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>

          <q-card-actions>
            <q-btn @click="leave" flat label="leave" name="leave" />
          </q-card-actions>
        </q-card>
      </div>
      <div class="col-7">
        <div class="row">
          <q-card class="col-4">
            <video autoplay :srcObject.prop="local_stream" mute="true" style="width: 100%"></video>
          </q-card>
          <!--
          <q-card
            class="col-4"
            :ref="m.sid"
            v-for="m in members"
            v-bind:key="m.sid"           
          >     
        
            <video autoplay :srcObject.prop="local_stream" mute="true" style="width: 100%"></video> 
          </q-card>
          -->
        </div>

        <div class="row">
          <div class="col-12 videos">
            <div id="remote_tracks" ref="remote_tracks"></div>
          </div>
        </div>

        <div class="row">
          <div class="col">
            <q-card>
              <div id="result-div"></div>
            </q-card>
          </div>
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
        this.create_remote_track();
      },
      deep: true,
    },
    members: {
      handler: function () {
        this.create_remote_track();
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
    //this.watson_speech_to_text();
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

    watson_speech_to_text() {

      //var watson = require('watson-developer-cloud');

      var authorization = new watson.AuthorizationV1({
  iam_apikey: "",
  iam_url:"",
});

authorization.getToken(function (err, token) {
  if (!token) {
    console.log('error:', err);
  } else {
    // Use your token here
      let options = {
        token,
        model: "ja-JP_BroadbandModel",
        objectMode: true,
        extractResults: true,
      };

const stream = recognizeMic({
 options
    });
 
    stream.on('data', data => {
      if (data.final) {
        const transcript = data.alternatives[0].transcript;
        console.log(transcript)
      }
    });

  }
});

return
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
    create_remote_track() {
      let tracks = [];
      console.log(this.$refs.remote_tracks);
      this.$refs.remote_tracks.innerHTML = "";

      this.members.forEach((m) => {
        if (this.tracks[m.sid]) {
          console.log(this.tracks[m.sid]);
          let child = document.createElement("div");

          child.classList.add("col-3");
          child.classList.add("q-card");
          child.classList.add("video");
          let name = document.createElement("p");
          //name.classList.add("absolute-bottom");
          //name.classList.add("text-subtitle2");
          //name.classList.add("text-center");
          name.classList.add("username");
          name.append(document.createTextNode(m.username));
          child.appendChild(name);
          if (this.tracks[m.sid]["video"]) {
            console.log(this.tracks[m.sid]["video"]);
            child.appendChild(this.tracks[m.sid]["video"].attach());
          }
          if (this.tracks[m.sid]["audio"]) {
            child.appendChild(this.tracks[m.sid]["audio"].attach());
          }
          this.$refs.remote_tracks.appendChild(child);
        }
      });
      //this.$refs.remote_tracks = tracks
    },
    create_track(participant) {
      //participant.on('trackSubscribed', track => this.trackSubscribed(track,participant));
      //participant.on('trackUnsubscribed', this.trackUnsubscribed);
      let html = "";
      participant.tracks.forEach((publication) => {
        if (publication.isSubscribed) {
          html += this.trackSubscribed(publication.track, participant);
          console.log("add");
        }
      });
      return html;
      // document.createElement('div').appendChild(t.attach())
    },
    trackSubscribed(track, participant) {
      const div = document.createElement("div");
      div.id = participant.sid;
      console.log(div.id);
      console.log(this.$refs[div.id]);
      //console.log(participant.sid)
      //console.log(this.$refs[participant.sid])
      return div.appendChild(track.attach());
    },
    trackUnsubscribed(track) {
      track.detach().forEach((element) => element.remove());
    },
  },
};
</script>

<style>
#remote_tracks {
  position: relative;
  display: flex;
}

#remote_tracks video {
  width: 100%;
}
.videos {
  display: flex;
}
.video {
  width: 350px;
}

.username {
  position: absolute;
  top: 8px;
  left: 0;
  margin: 0;
  padding: 0.5em 0.5em 0.5em 2em;
  background: rgba(242, 47, 70, 0.8);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  z-index: 1000;
}
</style>
