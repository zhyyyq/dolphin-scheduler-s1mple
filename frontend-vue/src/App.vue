<template>
  <a-config-provider
    :locale="zhCN"
    :theme="{
      token: {
        colorPrimary: '#1677ff',
        colorLink: '#1677ff',
        colorLinkHover: '#4096ff',
        colorLinkActive: '#0958d9',
      },
      components: {
        Menu: {
          darkItemBg: '#1677ff',
          darkItemColor: 'rgba(255, 255, 255, 0.85)',
          darkItemHoverColor: '#ffffff',
          darkItemSelectedColor: '#ffffff',
          darkItemSelectedBg: '#096dd9',
        },
      },
    }"
  >
    <a-layout style="min-height: 100vh">
      <a-sider collapsible style="background: #1677ff">
        <a-menu
          theme="dark"
          :selectedKeys="[$route.path]"
          mode="inline"
          :items="menuItems"
        />
      </a-sider>
      <a-layout class="site-layout">
        <a-header class="site-layout-background" style="padding: 0 24px; display: flex; align-items: center;">
          <h3 style="margin: 0; color: #fff;">极简任务调度平台</h3>
        </a-header>
        <a-content :style="isFullPage ? { height: '100%', padding: 0, margin: 0 } : { margin: '16px' }">
          <router-view />
        </a-content>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMenu } from './hooks/useMenu';
import zhCN from 'ant-design-vue/es/locale/zh_CN';

const route = useRoute();
const { menuItems } = useMenu();

const isFullPage = computed(() => {
  return route.path === '/' || route.path === '/workflows' || route.path.startsWith('/workflow/edit');
});
</script>

<style>
.site-layout .site-layout-background {
  background: #1677ff;
}
</style>
