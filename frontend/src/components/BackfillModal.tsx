import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Checkbox,
  Radio,
  DatePicker,
  Button,
  Space,
  App as AntApp,
} from 'antd';
import dayjs from 'dayjs';
import { Workflow } from '../types';
import api from '../api';

const { RangePicker } = DatePicker;

interface BackfillModalProps {
  open: boolean;
  workflow: Workflow | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const BackfillModal: React.FC<BackfillModalProps> = ({
  open,
  workflow,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const [isBackfill, setIsBackfill] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setIsBackfill(false);
      form.resetFields();
      form.setFieldsValue({
        isBackfill: false,
        dateRange: [dayjs().startOf('day'), dayjs().endOf('day')],
        runMode: 'serial',
        runOrder: 'desc',
      });
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    if (!workflow) return;
    setLoading(true);

    try {
      const payload: any = {
        isBackfill: values.isBackfill,
      };

      if (values.isBackfill) {
        payload.startDate = values.dateRange[0].format('YYYY-MM-DD HH:mm:ss');
        payload.endDate = values.dateRange[1].format('YYYY-MM-DD HH:mm:ss');
        payload.runMode = values.runMode;
        payload.runOrder = values.runOrder;
      }
      
      // This endpoint needs to be created on the backend
      await api.post(`/api/workflow/${workflow.uuid}/execute`, payload);

      message.success('执行任务已成功提交。');
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(`执行失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`执行工作流: ${workflow?.name}`}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
        >
          执行
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="isBackfill" valuePropName="checked">
          <Checkbox onChange={(e) => setIsBackfill(e.target.checked)}>
            是否补数
          </Checkbox>
        </Form.Item>

        {isBackfill && (
          <>
            <Form.Item name="dateRange" label="调度日期">
              <RangePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="runMode" label="执行方式">
              <Radio.Group>
                <Radio value="serial">串行执行</Radio>
                <Radio value="parallel">并行执行</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="runOrder" label="执行顺序">
              <Radio.Group>
                <Radio value="desc">按日期降序执行</Radio>
                <Radio value="asc">按日期升序执行</Radio>
              </Radio.Group>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default BackfillModal;
