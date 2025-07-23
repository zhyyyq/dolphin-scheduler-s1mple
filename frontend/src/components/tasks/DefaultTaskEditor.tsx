import React, { useEffect } from 'react';
import { Form, Input, FormInstance } from 'antd';
import yaml from 'js-yaml';

const { TextArea } = Input;

interface DefaultTaskEditorProps {
  initialValues: any;
  form: FormInstance<any>;
}

const DefaultTaskEditor: React.FC<DefaultTaskEditorProps> = ({ initialValues, form }) => {

  useEffect(() => {
    // Convert the initial task object to a YAML string, omitting fields
    // that are managed by the main modal form (like name).
    const { name, ...rest } = initialValues;
    
    // Also remove fields that are added by the backend or are not part of the core definition
    delete rest.deps;
    delete rest.id;
    delete rest.x;
    delete rest.y;
    delete rest.label;
    delete rest._display_type;
    delete rest.type;
    delete rest.task_type;

    const yamlString = yaml.dump(rest);
    
    // Set the value in the antd form instance
    form.setFieldsValue({ yaml_content: yamlString });

  }, [initialValues, form]);

  return (
    <Form.Item
      label="任务节点 YAML"
      name="yaml_content"
      rules={[
        {
          validator: async (_, value) => {
            if (!value) return; // Allow empty value
            try {
              yaml.load(value);
            } catch (e) {
              throw new Error('YAML 格式无效');
            }
          },
        },
      ]}
    >
      <TextArea
        rows={15}
        placeholder="以 YAML 格式编辑任务属性"
      />
    </Form.Item>
  );
};

export default DefaultTaskEditor;
