import React from 'react';
import { Input } from 'antd';

interface ShellTaskEditorProps {
  currentNode: any;
  nodeCommand: string;
  onNodeCommandChange: (command: string) => void;
}

export const ShellTaskEditor: React.FC<ShellTaskEditorProps> = ({
  currentNode,
  nodeCommand,
  onNodeCommandChange,
}) => {
  const data = currentNode.getData();

  return (
    <>
      <p>{data.type === 'PYTHON' ? '定义:' : '命令:'}</p>
      <Input.TextArea value={nodeCommand} onChange={e => onNodeCommandChange(e.target.value)} rows={4} />
      <p>CPU 配额:</p>
      <Input type="number" value={data.cpu_quota} onChange={e => currentNode.setData({ ...data, cpu_quota: Number(e.target.value) })} />
      <p>最大内存 (MB):</p>
      <Input type="number" value={data.memory_max} onChange={e => currentNode.setData({ ...data, memory_max: Number(e.target.value) })} />
    </>
  );
};
