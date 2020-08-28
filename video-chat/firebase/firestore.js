import Vue from 'vue'
import firebase from 'firebase/app'
import 'firebase/firestore'

//Vue.use(VueFire)
import { firestorePlugin } from 'vuefire'
Vue.use(firestorePlugin)

var config = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: ''
}
export const db = firebase.initializeApp(config).firestore()
