<template>
  <a-modal
    :title="`执行工作流: ${workflow?.name}`"
    :open="open"
    @cancel="onCancel"
    :footer="[
      h('button', { key: 'back', onClick: onCancel, class: 'ant-btn' }, '取消'),
      h(
        'button',
        {
          key: 'submit',
          onClick: handleFinish,
          class: 'ant-btn ant-btn-primary',
          disabled: loading,
        },
        loading ? h(Spin) : '执行'
      ),
    ]"
  >
    <a-form :model="formState" layout="vertical">
      <a-form-item name="isBackfill">
        <a-checkbox v-model:checked="formState.isBackfill">
          是否补数
        </a-checkbox>
      </a-form-item>

      <template v-if="formState.isBackfill">
        <a-form-item name="dateRange" label="调度日期">
          <a-range-picker v-model:value="formState.dateRange" show-time style="width: 100%" />
        </a-form-item>
        <a-form-item name="runMode" label="执行方式">
          <a-radio-group v-model:value="formState.runMode">
            <a-radio value="serial">串行执行</a-radio>
            <a-radio value="parallel">并行执行</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item name="runOrder" label="执行顺序">
          <a-radio-group v-model:value="formState.runOrder">
            <a-radio value="desc">按日期降序执行</a-radio>
            <a-radio value="asc">按日期升序执行</a-radio>
          </a-radio-group>
        </a-form-item>
      </template>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, h } from 'vue';
import { message, Spin } from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';
import { Workflow } from '../types';
import api from '../api';

const props = defineProps<{
  open: boolean;
  workflow: Workflow | null;
}>();

const emit = defineEmits(['cancel', 'success']);

const formState = reactive({
  isBackfill: false,
  dateRange: [dayjs().startOf('day'), dayjs().endOf('day')] as [Dayjs, Dayjs],
  runMode: 'serial',
  runOrder: 'desc',
});

const loading = ref(false);

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Reset form when modal opens
    formState.isBackfill = false;
    formState.dateRange = [dayjs().startOf('day'), dayjs().endOf('day')];
    formState.runMode = 'serial';
    formState.runOrder = 'desc';
  }
});

const handleFinish = async () => {
  if (!props.workflow) return;
  loading.value = true;

  try {
    const payload: any = {
      isBackfill: formState.isBackfill,
    };

    if (formState.isBackfill) {
      payload.startDate = formState.dateRange[0].format('YYYY-MM-DD HH:mm:ss');
      payload.endDate = formState.dateRange[1].format('YYYY-MM-DD HH:mm:ss');
      payload.runMode = formState.runMode;
      payload.runOrder = formState.runOrder;
    }
    
    await api.post(`/api/workflow/${props.workflow.uuid}/execute`, payload);

    message.success('执行任务已成功提交。');
    emit('success');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    message.error(`执行失败: ${errorMessage}`);
  } finally {
    loading.value = false;
  }
};

const onCancel = () => {
  emit('cancel');
};
</script>
