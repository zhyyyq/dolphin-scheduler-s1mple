import React from 'react';
import { Input } from 'antd';

interface HttpTaskEditorProps {
  currentNode: any;
}

export const HttpTaskEditor: React.FC<HttpTaskEditorProps> = ({ currentNode }) => {
  const data = currentNode.getData();

  return (
    <>
      <p>URL:</p>
      <Input value={data.url} onChange={e => currentNode.setData({ ...data, url: e.target.value })} />
      <p>HTTP 方法:</p>
      <Input value={data.http_method} onChange={e => currentNode.setData({ ...data, http_method: e.target.value })} />
      <p>HTTP 检查条件:</p>
      <Input value={data.http_check_condition} onChange={e => currentNode.setData({ ...data, http_check_condition: e.target.value })} />
      <p>条件:</p>
      <Input value={data.condition} onChange={e => currentNode.setData({ ...data, condition: e.target.value })} />
      <p>连接超时 (ms):</p>
      <Input type="number" value={data.connect_timeout} onChange={e => currentNode.setData({ ...data, connect_timeout: Number(e.target.value) })} />
      <p>套接字超时 (ms):</p>
      <Input type="number" value={data.socket_timeout} onChange={e => currentNode.setData({ ...data, socket_timeout: Number(e.target.value) })} />
    </>
  );
};
