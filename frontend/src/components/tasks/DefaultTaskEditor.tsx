import React, { useState, useEffect } from 'react';
import { Form, Input } from 'antd';
import yaml from 'js-yaml';

const { TextArea } = Input;

interface DefaultTaskEditorProps {
  initialValues: any;
}

const DefaultTaskEditor: React.FC<DefaultTaskEditorProps> = ({ initialValues }) => {
  const [yamlString, setYamlString] = useState('');

  useEffect(() => {
    // Convert the initial task object to a YAML string, omitting the name
    const { name, ...rest } = initialValues;
    setYamlString(yaml.dump(rest));
  }, [initialValues]);

  return (
    <Form.Item
      label="任务节点 YAML"
      name="yaml_content"
      initialValue={yamlString}
      rules={[
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
      <TextArea
        rows={15}
        placeholder="以 YAML 格式编辑任务属性"
        onChange={(e) => setYamlString(e.target.value)}
      />
    </Form.Item>
  );
};

export default DefaultTaskEditor;
