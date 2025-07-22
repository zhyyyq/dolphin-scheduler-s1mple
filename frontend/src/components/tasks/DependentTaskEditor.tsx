import React, { useEffect } from 'react';
import { Form, FormInstance, Input } from 'antd';
import yaml from 'js-yaml';

const { TextArea } = Input;

interface DependentTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

const DependentTaskEditor: React.FC<DependentTaskEditorProps> = ({ form, initialValues }) => {

  useEffect(() => {
    if (initialValues) {
      const { denpendence } = initialValues;
      const yamlText = yaml.dump(denpendence);
      form.setFieldsValue({ denpendence_yaml: yamlText });
    }
  }, [initialValues, form]);

  return (
    <Form.Item
      label="依赖逻辑 (YAML)"
      name="denpendence_yaml"
      rules={[
        { required: true, message: '请输入依赖逻辑' },
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
      <TextArea rows={15} placeholder="在此输入 denpendence 的 YAML 结构" />
    </Form.Item>
  );
};

export default DependentTaskEditor;
