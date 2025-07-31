<template>
  <a-space size="middle">
    <a-button v-if="record.releaseState === 'MODIFIED'" type="primary" @click="handleOnline">同步</a-button>
    <a-button v-else-if="record.releaseState === 'ONLINE'" type="primary" @click="handleExecute">立即执行</a-button>
    
    <a-button v-if="record.releaseState === 'UNSUBMITTED'" type="primary" @click="handleSubmit">提交</a-button>
    <a-button v-if="record.releaseState === 'OFFLINE'" type="primary" @click="handleOnline">上线</a-button>

    <router-link :to="`/workflow/edit/${record.uuid}`">编辑</router-link>
    <router-link :to="`/workflow/${record.uuid}/history`">历史</router-link>
    <a-button type="link" danger @click="handleDelete">删除</a-button>
  </a-space>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';
import { message } from 'ant-design-vue';
import { Workflow } from '../../../types';
import { State } from '../../../store';

const props = defineProps<{
  record: Workflow;
}>();

const store = useStore<State>();

const handleDelete = async () => {
  try {
    await store.dispatch('deleteWorkflow', props.record);
    message.success('工作流删除成功。');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    message.error(errorMessage);
  }
};

const handleExecute = () => {
  store.commit('setSelectedWorkflow', props.record);
  store.commit('setIsBackfillModalOpen', true);
};

const handleOnline = async () => {
  try {
    await store.dispatch('onlineWorkflow', props.record);
    message.success('工作流上线/同步成功。');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    message.error(`上线工作流时出错: ${errorMessage}`);
  }
};

const handleSubmit = () => {
  handleOnline();
};
</script>
