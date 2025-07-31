<template>
  <a-modal
    title="创建项目"
    :open="open"
    @ok="handleOk"
    @cancel="onCancel"
    :confirm-loading="loading"
  >
    <a-form :model="formState" layout="vertical" name="create_project_form">
      <a-form-item
        name="name"
        label="项目名称"
        :rules="[{ required: true, message: '请输入项目名称' }]"
      >
        <a-input v-model:value="formState.name" />
      </a-form-item>
      <a-form-item
        name="owner"
        label="所属用户"
        :rules="[{ required: true, message: '请选择所属用户' }]"
      >
        <a-select v-model:value="formState.owner" placeholder="请选择用户">
          <a-select-option v-for="user in users" :key="user.id" :value="user.userName">
            {{ user.userName }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item
        name="description"
        label="项目描述"
      >
        <a-textarea v-model:value="formState.description" :rows="4" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import api from '../../../api';

interface User {
  id: number;
  userName: string;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits(['cancel', 'success']);

const formState = reactive({
  name: '',
  owner: '',
  description: '',
});

const loading = ref(false);
const users = ref<User[]>([]);

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    api.get<User[]>('/api/users/list').then(response => {
      users.value = response;
      if (response.length > 0) {
        formState.owner = response[0].userName;
      }
    }).catch(err => {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(`获取用户列表失败: ${errorMessage}`);
    });
  }
});

const handleOk = async () => {
  try {
    loading.value = true;
    await api.post('/api/projects', formState);
    message.success('项目创建成功');
    emit('success');
    // Reset form
    formState.name = '';
    formState.owner = users.value.length > 0 ? users.value[0].userName : '';
    formState.description = '';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    message.error(errorMessage);
  } finally {
    loading.value = false;
  }
};

const onCancel = () => {
  emit('cancel');
};
</script>
