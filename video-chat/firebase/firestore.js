import Vue from 'vue'
import firebase from 'firebase/app'
import 'firebase/firestore'

//Vue.use(VueFire)
import { firestorePlugin } from 'vuefire'
Vue.use(firestorePlugin)
import * as config from '../src/config'

var fs_config = {
  apiKey: config.FIREBASE_APIKEY,
  authDomain: config.FIREBASE_DOMAIN + '.firebaseapp.com',
  databaseURL: 'https://' + config.FIREBASE_DOMAIN + '.firebaseio.com',
  projectId: config.FIREBASE_DOMAIN ,
  storageBucket: config.FIREBASE_DOMAIN +'.appspot.com',
  messagingSenderId: config.FIREBASE_DOMAIN 
}
export const db = firebase.initializeApp(fs_config).firestore()
