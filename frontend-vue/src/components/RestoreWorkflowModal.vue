<template>
  <div>
    <a-modal
      title="恢复已删除的工作流"
      :open="open"
      @cancel="onCancel"
      :footer="null"
      width="800px"
    >
      <a-input-search
        placeholder="按名称或文件名搜索"
        v-model:value="searchTerm"
        style="margin-bottom: 16px"
      />
      <a-spin :spinning="loading">
        <a-alert v-if="error" :message="error" type="error" />
        <a-table
          v-else
          :columns="columns"
          :data-source="filteredWorkflows"
          row-key="filename"
          :pagination="{ pageSize: 5 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'commit'">
              <code>{{ record.commit ? record.commit.substring(0, 7) : 'N/A' }}</code>
            </template>
            <template v-if="column.key === 'action'">
              <a-space>
                <a-button @click="handleView(record)">查看</a-button>
                <a-button type="primary" @click="handleRestore(record)">
                  恢复
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-modal>

    <a-modal
      :title="viewingTitle"
      :open="isViewModalOpen"
      @cancel="isViewModalOpen = false"
      :footer="null"
      width="80vw"
    >
      <a-spin :spinning="viewLoading">
        <pre style="background: #f5f5f5; padding: '16px'; maxHeight: '70vh'; overflow: 'auto'">
          <code v-html="viewingContent"></code>
        </pre>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism.css';
import api from '../api';

interface DeletedWorkflow {
  path: string;
  commit: string;
  message: string;
  name: string;
  filename: string;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits(['cancel', 'restored']);

const deletedWorkflows = ref<DeletedWorkflow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const isViewModalOpen = ref(false);
const viewingContent = ref('');
const viewingTitle = ref('');
const viewLoading = ref(false);
const searchTerm = ref('');

const fetchDeletedWorkflows = async () => {
  if (!props.open) return;
  loading.value = true;
  error.value = null;
  try {
    const data = await api.get<DeletedWorkflow[]>('/api/workflow/deleted');
    deletedWorkflows.value = data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

watch(() => props.open, fetchDeletedWorkflows, { immediate: true });

const filteredWorkflows = computed(() => {
  if (!searchTerm.value) {
    return deletedWorkflows.value;
  }
  return deletedWorkflows.value.filter(wf =>
    wf.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    wf.filename.toLowerCase().includes(searchTerm.value.toLowerCase())
  );
});

const handleRestore = async (record: DeletedWorkflow) => {
  try {
    await api.post('/api/workflow/restore', {
      path: record.path,
      commit: record.commit,
    });
    message.success(`工作流 ${record.name} 已成功恢复。`);
    emit('restored');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    message.error(`恢复失败: ${errorMessage}`);
  }
};

const handleView = async (record: DeletedWorkflow) => {
  viewingTitle.value = `查看: ${record.name} (${record.filename})`;
  isViewModalOpen.value = true;
  viewLoading.value = true;
  try {
    const response = await api.get<{ content: string }>(`/api/workflow/content/${record.commit}/${record.filename}`);
    const highlightedContent = Prism.highlight(response.content, Prism.languages.yaml, 'yaml');
    viewingContent.value = highlightedContent;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    viewingContent.value = `<pre><code>Error loading content: ${errorMessage}</code></pre>`;
  } finally {
    viewLoading.value = false;
  }
};

const columns: ColumnsType<DeletedWorkflow> = [
  { title: '工作流名称', dataIndex: 'name', key: 'name' },
  { title: '文件名', dataIndex: 'filename', key: 'filename' },
  { title: '删除于 (Commit)', dataIndex: 'commit', key: 'commit' },
  { title: '操作', key: 'action' },
];

const onCancel = () => {
  emit('cancel');
};
</script>
