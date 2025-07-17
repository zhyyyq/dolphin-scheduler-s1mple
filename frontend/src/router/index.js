import { createRouter, createWebHistory } from 'vue-router'
import TaskCreate from '../views/TaskCreate.vue'

const routes = [
  {
    path: '/create',
    name: 'TaskCreate',
    component: TaskCreate
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
