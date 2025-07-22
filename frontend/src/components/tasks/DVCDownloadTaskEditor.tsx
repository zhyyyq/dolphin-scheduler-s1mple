import React from 'react';
import { Form, Input } from 'antd';

const DVCDownloadTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="DVC 仓库 (Repository)"
        name="repository"
        rules={[{ required: true, message: '请输入 DVC 仓库地址' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="DVC 仓库中的数据路径"
        name="data_path_in_dvc_repository"
        rules={[{ required: true, message: '请输入 DVC 仓库中的数据路径' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Worker 中的数据路径"
        name="data_path_in_worker"
        rules={[{ required: true, message: '请输入 Worker 中的数据路径' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="版本 (Version)"
        name="version"
        rules={[{ required: true, message: '请输入版本号' }]}
      >
        <Input />
      </Form.Item>
    </>
  );
};

export default DVCDownloadTaskEditor;
