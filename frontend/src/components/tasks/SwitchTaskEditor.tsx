import React from 'react';
import { Form, Input, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const SwitchTaskEditor: React.FC = () => {
  return (
    <Form.List name="condition">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item
                {...restField}
                name={[name, 'task']}
                rules={[{ required: true, message: '请输入目标任务' }]}
              >
                <Input placeholder="目标任务" />
              </Form.Item>
              <Form.Item
                {...restField}
                name={[name, 'condition']}
              >
                <Input placeholder="跳转条件 (可选)" />
              </Form.Item>
              <MinusCircleOutlined onClick={() => remove(name)} />
            </Space>
          ))}
          <Form.Item>
            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
              添加分支
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default SwitchTaskEditor;
