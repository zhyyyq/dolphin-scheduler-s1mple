import React, { useEffect } from 'react';
import { Form, Input, Select, FormInstance } from 'antd';
import yaml from 'js-yaml';

const { TextArea } = Input;
const { Option } = Select;

interface HttpTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

const HttpTaskEditor: React.FC<HttpTaskEditorProps> = ({ form, initialValues }) => {

  useEffect(() => {
    if (initialValues) {
      const { url, http_method, http_check_condition, condition, http_params } = initialValues;
      const paramsYaml = yaml.dump(http_params || []);
      form.setFieldsValue({
        url,
        http_method,
        http_check_condition,
        condition,
        http_params_yaml: paramsYaml,
      });
    }
  }, [initialValues, form]);

  return (
    <>
      <Form.Item
        label="URL"
        name="url"
        rules={[{ required: true, message: '请输入 URL' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="HTTP 方法"
        name="http_method"
        rules={[{ required: true, message: '请选择 HTTP 方法' }]}
      >
        <Select>
          <Option value="GET">GET</Option>
          <Option value="POST">POST</Option>
          <Option value="PUT">PUT</Option>
          <Option value="DELETE">DELETE</Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="HTTP 检查条件"
        name="http_check_condition"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="条件"
        name="condition"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="HTTP 参数 (YAML)"
        name="http_params_yaml"
        rules={[
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
        <TextArea rows={8} placeholder="在此输入 http_params 的 YAML 结构" />
      </Form.Item>
    </>
  );
};

export default HttpTaskEditor;
