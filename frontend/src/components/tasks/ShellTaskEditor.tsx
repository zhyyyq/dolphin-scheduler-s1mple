import React from 'react';
import { Input, Form, Typography } from 'antd';
import LocalParamsEditor from './common/LocalParamsEditor';

const { TextArea } = Input;
const { Title } = Typography;

const ShellTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="脚本"
        name="command"
        rules={[{ required: true, message: '请输入脚本内容' }]}
      >
        <TextArea rows={10} placeholder="请输入脚本内容" />
      </Form.Item>
      <Title level={5}>自定义参数</Title>
      <LocalParamsEditor />
    </>
  );
};

export default ShellTaskEditor;
