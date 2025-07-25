import React from 'react';
import { Form, Input } from 'antd';
import yaml from 'js-yaml';

const { TextArea } = Input;

const ConditionsTaskEditor: React.FC = () => {
  return (
    <Form.Item
      label="条件逻辑 (YAML)"
      name={['task_params', 'conditions_yaml']}
      rules={[
        { required: true, message: '请输入条件逻辑' },
        {
          validator: async (_, value) => {
            if (!value) return;
            try {
              yaml.load(value);
            } catch (e) {
              throw new Error('YAML 格式无效');
            }
          },
        },
      ]}
    >
      <TextArea rows={10} placeholder={'op: AND\ngroups:\n  - op: OR\n    conditions:\n      - "1 == 1"\n      - "2 > 1"'} />
    </Form.Item>
  );
};

export default ConditionsTaskEditor;
