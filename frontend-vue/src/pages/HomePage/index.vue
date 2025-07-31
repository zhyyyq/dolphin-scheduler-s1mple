<template>
  <div style="display: flex; flex-direction: column; height: 100%; padding: 24px">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-shrink: 0">
      <a-typography-title :level="2" style="margin: 0">所有工作流</a-typography-title>
      <a-space>
        <a-select
          allow-clear
          placeholder="选择项目"
          style="width: 200px"
          :value="selectedProject"
          @change="handleProjectChange"
        >
          <template #dropdownRender="{ menuNode }">
            <component :is="menuNode" />
            <a-divider style="margin: 8px 0" />
            <a-button type="link" @click="isCreateProjectModalOpen = true" style="width: 100%">
              新建项目
            </a-button>
          </template>
          <a-select-option value="all">所有项目</a-select-option>
          <a-select-option v-for="p in projects" :key="p.code" :value="p.code">
            <div style="display: flex; justify-content: space-between">
              <span>{{ p.name }}</span>
            </div>
          </a-select-option>
        </a-select>
        <a-button @click="store.commit('setIsRestoreModalOpen', true)">恢复工作流</a-button>
        <router-link :to="`/workflow/edit${selectedProject && selectedProject !== 'all' ? `?projectName=${projects.find(p => p.code === selectedProject)?.name}&projectCode=${selectedProject}` : ''}`">
          <a-button type="primary">新建工作流</a-button>
        </router-link>
      </a-space>
    </div>
    <div style="flex: 1 1 auto; overflow: hidden; display: flex; flexDirection: column">
      <a-spin :spinning="loading" size="large" style="width: 100%; height: 100%">
        <a-alert v-if="error" :message="error" type="error" show-icon />
        <a-table
          v-else
          :columns="columns"
          :data-source="filteredWorkflows"
          row-key="uuid"
          bordered
          :pagination="{ pageSize: 10 }"
          style="flex: 1 1 auto; overflow: hidden"
          :scroll="{ y: 'calc(100vh - 340px)' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'schedule_human_readable'">
              <a-tooltip :title="record.schedule_text">
                <span>{{ record.schedule_human_readable || '-' }}</span>
              </a-tooltip>
            </template>
            <template v-if="column.key === 'releaseState'">
                <a-tag v-if="record.releaseState === 'MODIFIED'" color="processing">待同步</a-tag>
                <a-tag v-else-if="record.releaseState === 'ONLINE'" color="green">在线</a-tag>
                <a-tag v-else-if="record.releaseState === 'OFFLINE'" color="volcano">离线</a-tag>
                <a-tag v-else-if="record.releaseState === 'UNSUBMITTED'" color="gold">待提交</a-tag>
                <a-tag v-else color="default">{{ record.releaseState }}</a-tag>
            </template>
            <template v-if="column.key === 'updateTime'">
              {{ formatUpdateTime(record.updateTime) }}
            </template>
            <template v-if="column.key === 'actions'">
              <ActionButtons :record="record" />
            </template>
          </template>
        </a-table>
      </a-spin>
    </div>
    <RestoreWorkflowModal
      :open="isRestoreModalOpen"
      @cancel="store.commit('setIsRestoreModalOpen', false)"
      @restored="onRestored"
    />
    <BackfillModal
      :open="isBackfillModalOpen"
      :workflow="selectedWorkflow"
      @cancel="store.commit('setIsBackfillModalOpen', false)"
      @success="onBackfillSuccess"
    />
    <CreateProjectModal
      :open="isCreateProjectModalOpen"
      @cancel="isCreateProjectModalOpen = false"
      @success="onCreateProjectSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { message } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { Workflow, Project } from '../../types';
import RestoreWorkflowModal from '../../components/RestoreWorkflowModal.vue';
import BackfillModal from '../../components/BackfillModal.vue';
import CreateProjectModal from './components/CreateProjectModal.vue';
import ActionButtons from './components/ActionButtons.vue';
import { State } from '../../store';

const store = useStore<State>();

const workflows = computed(() => store.state.workflows);
const projects = computed(() => store.state.projects);
const loading = computed(() => store.state.loading);
const error = computed(() => store.state.error);
const selectedProject = computed(() => store.state.selectedProject);
const isRestoreModalOpen = computed(() => store.state.isRestoreModalOpen);
const isBackfillModalOpen = computed(() => store.state.isBackfillModalOpen);
const selectedWorkflow = computed(() => store.state.selectedWorkflow);

const isCreateProjectModalOpen = ref(false);

onMounted(() => {
  store.dispatch('fetchProjects');
  store.dispatch('fetchWorkflows');
});

const columns: ColumnsType<Workflow> = [
  { title: '项目', dataIndex: 'projectName', key: 'projectName' },
  { title: '工作流名称', dataIndex: 'name', key: 'name' },
  { title: '定时设置', key: 'schedule_human_readable' },
  { title: '状态', key: 'releaseState' },
  { title: '最后更新时间', key: 'updateTime' },
  { title: '操作', key: 'actions' },
];

const filteredWorkflows = computed(() => {
  const sp = selectedProject.value;
  if (sp && sp !== 'all') {
    return workflows.value.filter(w =>
      w.projectCode === sp || w.releaseState === 'UNSUBMITTED' || w.releaseState === 'MODIFIED'
    );
  }
  return workflows.value;
});

const handleProjectChange = (value: any) => {
  store.commit('setSelectedProject', value);
};

const onRestored = () => {
  store.commit('setIsRestoreModalOpen', false);
  store.dispatch('fetchWorkflows');
};

const onBackfillSuccess = () => {
  store.commit('setIsBackfillModalOpen', false);
  store.dispatch('fetchWorkflows');
};

const onCreateProjectSuccess = () => {
  isCreateProjectModalOpen.value = false;
  store.dispatch('fetchProjects');
  store.dispatch('fetchWorkflows');
};

const formatUpdateTime = (time: string | number) => {
  if (!time) return '-';
  // If it's a string like "2024-07-31 10:53:00", new Date() can parse it directly.
  // If it's a unix timestamp (number), it needs to be multiplied by 1000.
  const date = new Date(typeof time === 'number' ? time * 1000 : time);
  return isNaN(date.getTime()) ? '-' : date.toLocaleString();
};
</script>
