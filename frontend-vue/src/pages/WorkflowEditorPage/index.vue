<template>
  <div style="display: flex; height: calc(100vh - 64px)">
    <div style="flex: 1; position: relative" @click="handleContainerClick">
      <!-- <WorkflowToolbar @import="handleImport" /> -->
      <!-- <EditorDagGraph :container-ref="containerRefCallback" /> -->
      <!-- <EditTaskModal /> -->
      <!-- <EditParamNodeModal /> -->
      <!-- <EditEdgeLabelModal /> -->
      <!-- <ViewYamlModal /> -->
      <!-- <WorkflowContextMenu /> -->
      <div ref="containerRef">
        工作流编辑器占位符
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { App as AntApp } from 'ant-design-vue';
import { State as RootState } from '../../store';
import { WorkflowDetail } from '../../types';

const store = useStore<RootState>();
const route = useRoute();
const { message } = AntApp.useApp();

const containerRef = ref<HTMLDivElement | null>(null);

const contextMenu = computed(() => store.state.workflowEditor.contextMenu);

onMounted(() => {
  if (containerRef.value) {
    store.dispatch('workflowEditor/initializeGraph', containerRef.value);
  }

  store.dispatch('workflowEditor/fetchDiyFunctions').catch(() => message.error('加载自定义组件失败'));

  const workflowUuid = route.params.uuid as string;
  if (workflowUuid) {
    store.dispatch('workflowEditor/fetchWorkflow', workflowUuid);
  } else {
    store.dispatch('workflowEditor/clearWorkflow');
    const { projectName, projectCode } = route.query;
    if (projectName && projectCode) {
      const initialWorkflowData: Partial<WorkflowDetail> = {
        name: 'new-workflow',
        project: projectName as string,
        projectCode: parseInt(projectCode as string, 10),
        projectName: projectName as string,
        releaseState: 'UNSUBMITTED',
        tasks: [],
        parameters: [],
        relations: [],
        yaml_content: '',
      };
      store.commit('workflowEditor/setWorkflow', initialWorkflowData);
    }
  }
});

const handleContainerClick = () => {
  store.commit('workflowEditor/setContextMenu', { ...contextMenu.value, visible: false });
};

// Placeholder for import handling
// const handleImport = (file: File) => {
//   store.dispatch('workflowEditor/importYaml', file).catch(() => message.error('导入 YAML 失败'));
// };
</script>

<style scoped>
/* Add styles from index.less if necessary */
</style>
