import { createRouter, createWebHistory } from 'vue-router'
import WelcomePage from '../pages/WelcomePage.vue';
import HomePage from '../pages/HomePage/index.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import WorkflowEditorPage from '../pages/WorkflowEditorPage/index.vue';
import WorkflowHistoryPage from '../pages/WorkflowHistoryPage.vue';
import WorkflowInstanceDetailPage from '../pages/WorkflowInstanceDetailPage.vue';
import DiyFunctionPage from '../pages/DiyFunctionPage.vue';
import PythonEditorPage from '../pages/PythonEditorPage.vue';

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: WelcomePage,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage,
  },
  {
    path: '/workflows',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/workflow/edit/:uuid?',
    name: 'WorkflowEditor',
    component: WorkflowEditorPage,
    props: true,
  },
  {
    path: '/workflow/:workflow_uuid/history',
    name: 'WorkflowHistory',
    component: WorkflowHistoryPage,
    props: true,
  },
  {
    path: '/instances/:projectCode/:instanceId',
    name: 'WorkflowInstanceDetail',
    component: WorkflowInstanceDetailPage,
    props: true,
  },
  {
    path: '/functions',
    name: 'DiyFunctions',
    component: DiyFunctionPage,
  },
  {
    path: '/functions/edit/:functionId',
    name: 'PythonEditor',
    component: PythonEditorPage,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
