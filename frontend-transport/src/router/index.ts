import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    admin?: boolean
    titulo?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { titulo: 'Panel' },
        },
        {
          path: 'boleteria',
          name: 'boleteria',
          component: () => import('@/views/BoleteriaView.vue'),
          meta: { titulo: 'Boletería' },
        },
        {
          path: 'salidas',
          name: 'salidas',
          component: () => import('@/views/SalidasView.vue'),
          meta: { titulo: 'Turnos y salidas' },
        },
        {
          path: 'encomiendas',
          name: 'encomiendas',
          component: () => import('@/views/EncomiendasView.vue'),
          meta: { titulo: 'Encomiendas' },
        },
        {
          path: 'entrega',
          name: 'entrega',
          component: () => import('@/views/EntregaView.vue'),
          meta: { titulo: 'Entrega en destino' },
        },
        {
          path: 'caja',
          name: 'caja',
          component: () => import('@/views/CajaView.vue'),
          meta: { titulo: 'Arqueo y cierre de caja' },
        },
        {
          path: 'camionetas',
          name: 'camionetas',
          component: () => import('@/views/CamionetasView.vue'),
          meta: { titulo: 'Flota de camionetas', admin: true },
        },
        {
          path: 'rutas',
          name: 'rutas',
          component: () => import('@/views/RutasView.vue'),
          meta: { titulo: 'Rutas y tarifas', admin: true },
        },
        {
          path: 'usuarios',
          name: 'usuarios',
          component: () => import('@/views/UsuariosView.vue'),
          meta: { titulo: 'Usuarios', admin: true },
        },
        {
          path: 'notificaciones',
          name: 'notificaciones',
          component: () => import('@/views/NotificacionesView.vue'),
          meta: { titulo: 'Notificaciones WhatsApp', admin: true },
        },
        {
          path: 'perfil',
          name: 'perfil',
          component: () => import('@/views/PerfilView.vue'),
          meta: { titulo: 'Mi cuenta' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) return auth.isAuth ? { name: 'dashboard' } : true
  if (!auth.isAuth) return { name: 'login' }
  if (!auth.user) await auth.fetchMe()
  if (!auth.isAuth) return { name: 'login' }
  if (to.meta.admin && !auth.isAdmin) return { name: 'dashboard' }
  return true
})

export default router
