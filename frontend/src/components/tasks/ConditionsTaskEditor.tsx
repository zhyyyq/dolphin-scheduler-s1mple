import React from 'react';
import { Input, Select } from 'antd';

interface ConditionsTaskEditorProps {
  currentNode: any;
}

export const ConditionsTaskEditor: React.FC<ConditionsTaskEditorProps> = ({ currentNode }) => {
  const data = currentNode.getData();

  return (
    <>
      <p>成功执行任务:</p>
      <Input value={data.success_task} onChange={e => currentNode.setData({ ...data, success_task: e.target.value })} />
      <p>失败执行任务:</p>
      <Input value={data.failed_task} onChange={e => currentNode.setData({ ...data, failed_task: e.target.value })} />
      <p>操作符:</p>
      <Select
        value={data.op}
        onChange={value => currentNode.setData({ ...data, op: value })}
        style={{ width: '100%' }}
      >
        <Select.Option value="AND">与</Select.Option>
        <Select.Option value="OR">或</Select.Option>
      </Select>
      <p>分组 (JSON):</p>
      <Input.TextArea
        rows={6}
        value={JSON.stringify(data.groups, null, 2)}
        onChange={e => {
          try {
            const groups = JSON.parse(e.target.value);
            currentNode.setData({ ...data, groups });
          } catch (err) {
            // Ignore invalid JSON
          }
        }}
      />
    </>
  );
};
