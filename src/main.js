import { createApp } from 'vue'
import './style.css'

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/asvpn'

if (isAdmin) {
  import('./admin/AdminApp.vue').then(({ default: AdminApp }) => createApp(AdminApp).mount('#app'))
} else {
  import('./App.vue').then(({ default: App }) => createApp(App).mount('#app'))
}
