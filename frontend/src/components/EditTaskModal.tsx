import React from 'react';
import {
  Modal, Input, Select, Button
 } from 'antd';

interface EditTaskModalProps {
  isModalVisible: boolean;
  onOk: () => void;
  onCancel: () => void;
  currentNode: any;
  nodeName: string;
  onNodeNameChange: (name: string) => void;
  nodeCommand: string;
  onNodeCommandChange: (command: string) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isModalVisible,
  onOk,
  onCancel,
  currentNode,
  nodeName,
  onNodeNameChange,
  nodeCommand,
  onNodeCommandChange,
}) => {
  if (!currentNode) return null;

  const data = currentNode.getData();

  const handleSwitchChange = (index: number, field: 'condition' | 'task', value: string) => {
    const newConditions = [...(data.condition || [])];
    newConditions[index] = { ...newConditions[index], [field]: value };
    currentNode.setData({ ...data, condition: newConditions });
  };

  const addSwitchBranch = () => {
    const newConditions = [...(data.condition || []), { task: '', condition: '' }];
    currentNode.setData({ ...data, condition: newConditions });
  };

  const removeSwitchBranch = (index: number) => {
    const newConditions = [...(data.condition || [])];
    newConditions.splice(index, 1);
    currentNode.setData({ ...data, condition: newConditions });
  };

  return (
    <Modal title="编辑任务" open={isModalVisible} onOk={onOk} onCancel={onCancel}>
      <p>名称:</p>
      <Input value={nodeName} onChange={e => onNodeNameChange(e.target.value)} />

      {data.type === 'Switch' ? (
        <>
          <p>分支条件:</p>
          {data.condition?.map((branch: any, index: number) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <Input
                placeholder="条件 (例如 ${var} > 1)"
                value={branch.condition}
                onChange={e => handleSwitchChange(index, 'condition', e.target.value)}
                style={{ flex: 1 }}
              />
              <Input
                placeholder="任务名称"
                value={branch.task}
                onChange={e => handleSwitchChange(index, 'task', e.target.value)}
                style={{ flex: 1 }}
              />
              <Button onClick={() => removeSwitchBranch(index)} danger type="text">X</Button>
            </div>
          ))}
          <Button onClick={addSwitchBranch} type="dashed" style={{ width: '100%' }}>
            + 添加分支
          </Button>
        </>
      ) : (
        <>
          <p>{data.type === 'PYTHON' ? '定义:' : '命令:'}</p>
          <Input.TextArea value={nodeCommand} onChange={e => onNodeCommandChange(e.target.value)} rows={4} />
        </>
      )}

      {(data.type === 'SHELL' || data.type === 'PYTHON') && (
        <>
          <p>CPU 配额:</p>
          <Input type="number" value={data.cpu_quota} onChange={e => currentNode.setData({ ...data, cpu_quota: Number(e.target.value) })} />
          <p>最大内存 (MB):</p>
          <Input type="number" value={data.memory_max} onChange={e => currentNode.setData({ ...data, memory_max: Number(e.target.value) })} />
        </>
      )}
      {data.type === 'SQL' && (
        <>
          <p>数据源名称:</p>
          <Input value={data.datasource_name} onChange={e => currentNode.setData({ ...data, datasource_name: e.target.value })} />
          <p>SQL 类型:</p>
          <Input value={data.sql_type} onChange={e => currentNode.setData({ ...data, sql_type: e.target.value })} />
          <p>前置 SQL:</p>
          <Input.TextArea value={data.pre_statements?.join('\n')} onChange={e => currentNode.setData({ ...data, pre_statements: e.target.value.split('\n') })} rows={2} />
          <p>后置 SQL:</p>
          <Input.TextArea value={data.post_statements?.join('\n')} onChange={e => currentNode.setData({ ...data, post_statements: e.target.value.split('\n') })} rows={2} />
          <p>显示行数:</p>
          <Input type="number" value={data.display_rows} onChange={e => currentNode.setData({ ...data, display_rows: Number(e.target.value) })} />
        </>
      )}
      {data.type === 'HTTP' && (
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
      )}
      {data.type === 'SUB_PROCESS' && (
        <>
          <p>工作流名称:</p>
          <Input value={data.workflow_name} onChange={e => currentNode.setData({ ...data, workflow_name: e.target.value })} />
        </>
      )}
      {data.type === 'CONDITIONS' && (
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
      )}
    </Modal>
  );
};
