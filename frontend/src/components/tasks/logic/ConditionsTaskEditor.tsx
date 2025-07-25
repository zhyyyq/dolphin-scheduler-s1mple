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
      const { op, groups } = initialValues;
      const conditionsYaml = yaml.dump({ op, groups });
      form.setFieldsValue({
        conditions_yaml: conditionsYaml,
      });
    }
  }, [initialValues, form]);

  return (
    <>
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
