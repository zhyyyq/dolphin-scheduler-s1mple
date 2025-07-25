import React, { useEffect } from 'react';
import { Form, Input, Select, Button, Space, FormInstance } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

interface HttpTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

const HttpTaskEditor: React.FC<HttpTaskEditorProps> = ({ form, initialValues }) => {
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
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
      
      <Form.Item label="HTTP 参数">
        <Form.List name="http_params">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'prop']}
                    rules={[{ required: true, message: '缺少属性' }]}
                  >
                    <Input placeholder="属性" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'value']}
                    rules={[{ required: true, message: '缺少值' }]}
                  >
                    <Input placeholder="值" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'httpParametersType']}
                    rules={[{ required: true, message: '缺少类型' }]}
                  >
                    <Select placeholder="类型" style={{ width: 120 }}>
                      <Option value="PARAMETER">PARAMETER</Option>
                      <Option value="HEADER">HEADER</Option>
                      <Option value="BODY">BODY</Option>
                    </Select>
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加参数
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form.Item>
    </>
  );
};

export default HttpTaskEditor;
