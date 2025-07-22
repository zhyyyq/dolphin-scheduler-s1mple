import React, { useEffect } from 'react';
import { Form, Input, FormInstance } from 'antd';
import yaml from 'js-yaml';

const { TextArea } = Input;

interface ConditionsTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

const ConditionsTaskEditor: React.FC<ConditionsTaskEditorProps> = ({ form, initialValues }) => {

  useEffect(() => {
    if (initialValues) {
      const { success_task, failed_task, op, groups } = initialValues;
      const conditionsYaml = yaml.dump({ op, groups });
      form.setFieldsValue({
        success_task,
        failed_task,
        conditions_yaml: conditionsYaml,
      });
    }
  }, [initialValues, form]);

  return (
    <>
      <Form.Item
        label="成功分支任务 (Success Task)"
        name="success_task"
        rules={[{ required: true, message: '请输入成功分支任务的名称' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="失败分支任务 (Failed Task)"
        name="failed_task"
        rules={[{ required: true, message: '请输入失败分支任务的名称' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="条件逻辑 (YAML)"
        name="conditions_yaml"
        rules={[
          { required: true, message: '请输入条件逻辑' },
          {
            validator: async (_, value) => {
              try {
                yaml.load(value);
              } catch (e) {
                throw new Error('YAML 格式无效');
              }
            },
          },
        ]}
      >
        <TextArea rows={10} placeholder="在此输入 op 和 groups 的 YAML 结构" />
      </Form.Item>
    </>
  );
};

export default ConditionsTaskEditor;
