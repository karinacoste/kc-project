import { createStore, storeKey } from 'vuex'
import { auth } from '../firebase/config'
import { db } from '../firebase/config'
import router from '../router'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
} from 'firebase/auth'
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
} from 'firebase/firestore'

export default createStore({
  state: {
    authUser: null,
    user: null,
    userId: null,
    userIdToken: null,
    authIsReady: false,
  },
  getters: {},
  mutations: {
    setAuthUser(state, payload) {
      state.authUser = payload
    },
    setUser(state, payload) {
      state.user = payload
    },
    setUserId(state, payload) {
      state.userId = payload
    },
    setUserIdToken(state, payload) {
      state.userIdToken = payload
    },
    setAuthIsready(state, payload) {
      state.authIsReady = payload
    },
    clearUser(state) {
      state.user = null
    },
    clearAuthUser(state) {
      state.authUser = null
    },
  },
  actions: {
    async createNewUser(context, userInfo) {
      try {
        // const docRef = await setDoc(collection(db, 'users'), {
        await setDoc(doc(db, 'users', context.state.user.userId), userInfo)
      } catch (e) {
        console.error('Error adding document: ', e)
      }
    },

    async createNewAccount(context, accountInfo) {
      try {
        // const docRef = await setDoc(collection(db, 'users'), {
        // await setDoc(doc(db, 'accounts', newAccount))
        await addDoc(collection(db, 'accounts'), accountInfo)
      } catch (e) {
        console.error('Error adding document: ', e)
      }
    },
    async getAppUsers() {
      const querySnapshot = await getDocs(collection(db, 'users'))
      querySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${doc.data().first}`)
      })
    },
    async signup(context, userInfo) {
      console.log('signup action')
      // async code
      const { displayName, email, password, name, surname, role } = userInfo
      const res = await createUserWithEmailAndPassword(auth, email, password)
      if (res) {
        const userId = auth.currentUser.uid
        context.commit('setAuthUser', auth.currentUser)
        // context.commit('setUserId', auth.currentUser.uid)
        context.commit('setUser', {
          userId,
          displayName,
          name,
          surname,
          email,
          password,
          role,
        })

        try {
          context.dispatch('createNewUser', {
            displayName,
            email,
            name,
            surname,
            role,
          })
          const newAccountInfo = {
            admin: {
              userName: displayName,
              uid: userId,
            },
            users: [],
          }

          context.dispatch('createNewAccount', newAccountInfo)
        } catch (error) {
          console.log('ERROR', error)
        }
      } else {
        throw new Error('could not complete sigup')
      }
    },
    // async upDateUserInfo(context, { userInfo }) {
    async upDateUserInfo(context) {
      const res = await updateProfile(auth.currentUser, {
        displayName: 'Karina Coste',
        // photoURL: 'https://example.com/jane-q-user/profile.jpg',
      })
      if (res) {
        context.commit('setAuthUser', auth.currentUser)
      } else {
        throw new Error('could not complete upDateUserInfooo')
      }
    },
    async login(context, { email, password }) {
      const res = await signInWithEmailAndPassword(auth, email, password)
      if (res) {
        // context.commit('setUser', res.user)
        context.commit('setAuthUser', auth.currentUser)
        await context.dispatch('fetchUserById', auth.currentUser.uid)
      } else {
        throw new Error('could not complete login')
      }
    },
    async logout(context) {
      console.log('logout action')
      const res = await signOut(auth)
      context.commit('setAuthUser', null)
      context.commit('setUser', null)
      window.localStorage.clear()
      router.push('/ExternalHomeView')
    },
    async fetchUserById(context, uid) {
      const docRef = doc(db, 'users', uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        context.commit('setUser', docSnap.data())
        localStorage.clear()
      } else {
        // doc.data() will be undefined in this case
        console.log('No such document!')
      }
    },
    async fetchAuthUser(context) {
      onAuthStateChanged(auth, async (user) => {
        if (user === null) {
          context.commit('clearUser')
          context.commit('clearAuthUser')
        } else {
          context.commit('setAuthUser', user)
          await context.dispatch('fetchUserById', user.uid)
          if (
            router.isReady() &&
            router.currentRoute.value.path === '/ExternalHomeView'
          ) {
            const token = await auth.currentUser.getIdToken(true)
            context.commit('setUserIdToken', token)
            console.log('stateUserIdToken', context.state.userIdToken)
            context.commit('setAuthUser', user)
            router.push('/')
          }
        }
      })
    },
  },
  modules: {},
})
