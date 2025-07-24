import React from 'react';
import { Form, Input, Select, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

const LocalParamsEditor: React.FC = () => {
  return (
    <Form.List name="localParams">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item
                {...restField}
                name={[name, 'prop']}
                rules={[{ required: true, message: '请输入属性' }]}
              >
                <Input placeholder="prop(必填)" />
              </Form.Item>
              <Form.Item
                {...restField}
                name={[name, 'direct']}
                initialValue="IN"
              >
                <Select style={{ width: 80 }}>
                  <Option value="IN">IN</Option>
                  <Option value="OUT">OUT</Option>
                </Select>
              </Form.Item>
              <Form.Item
                {...restField}
                name={[name, 'type']}
                initialValue="VARCHAR"
              >
                <Select style={{ width: 120 }}>
                  <Option value="VARCHAR">VARCHAR</Option>
                  <Option value="INTEGER">INTEGER</Option>
                  <Option value="LONG">LONG</Option>
                  <Option value="FLOAT">FLOAT</Option>
                  <Option value="DOUBLE">DOUBLE</Option>
                  <Option value="DATE">DATE</Option>
                  <Option value="TIME">TIME</Option>
                  <Option value="TIMESTAMP">TIMESTAMP</Option>
                  <Option value="BOOLEAN">BOOLEAN</Option>
                </Select>
              </Form.Item>
              <Form.Item
                {...restField}
                name={[name, 'value']}
              >
                <Input placeholder="value(选填)" />
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
  );
};

export default LocalParamsEditor;
