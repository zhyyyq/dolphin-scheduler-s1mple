import { h } from 'vue';
import { RouterLink } from 'vue-router';
import {
  DashboardOutlined,
  ApartmentOutlined,
  CodeOutlined,
} from '@ant-design/icons-vue';

export function useMenu() {
  const menuItems = [
    {
      key: '/',
      icon: () => h(DashboardOutlined),
      label: () => h(RouterLink, { to: '/' }, () => '欢迎页'),
    },
    {
      key: '/dashboard',
      icon: () => h(DashboardOutlined),
      label: () => h(RouterLink, { to: '/dashboard' }, () => '仪表盘'),
    },
    {
      key: '/workflows',
      icon: () => h(ApartmentOutlined),
      label: () => h(RouterLink, { to: '/workflows' }, () => '工作流'),
    },
    {
      key: '/functions',
      icon: () => h(CodeOutlined),
      label: () => h(RouterLink, { to: '/functions' }, () => '自定义组件'),
    },
  ];

  return {
    menuItems,
  };
}
