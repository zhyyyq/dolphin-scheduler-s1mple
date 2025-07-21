import React from 'react';
import { Modal, Input, Select } from 'antd';

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

  return (
    <Modal title="Edit Task" open={isModalVisible} onOk={onOk} onCancel={onCancel}>
      <p>Name:</p>
      <Input value={nodeName} onChange={e => onNodeNameChange(e.target.value)} />
      <p>{data.taskType === 'PYTHON' ? 'Definition:' : 'Command:'}</p>
      <Input.TextArea value={nodeCommand} onChange={e => onNodeCommandChange(e.target.value)} rows={4} />
      {(data.taskType === 'SHELL' || data.taskType === 'PYTHON') && (
        <>
          <p>CPU Quota:</p>
          <Input type="number" value={data.cpu_quota} onChange={e => currentNode.setData({ ...data, cpu_quota: Number(e.target.value) })} />
          <p>Max Memory (MB):</p>
          <Input type="number" value={data.memory_max} onChange={e => currentNode.setData({ ...data, memory_max: Number(e.target.value) })} />
        </>
      )}
      {data.taskType === 'SQL' && (
        <>
          <p>Datasource Name:</p>
          <Input value={data.datasource_name} onChange={e => currentNode.setData({ ...data, datasource_name: e.target.value })} />
          <p>SQL Type:</p>
          <Input value={data.sql_type} onChange={e => currentNode.setData({ ...data, sql_type: e.target.value })} />
          <p>Pre Statements:</p>
          <Input.TextArea value={data.pre_statements?.join('\n')} onChange={e => currentNode.setData({ ...data, pre_statements: e.target.value.split('\n') })} rows={2} />
          <p>Post Statements:</p>
          <Input.TextArea value={data.post_statements?.join('\n')} onChange={e => currentNode.setData({ ...data, post_statements: e.target.value.split('\n') })} rows={2} />
          <p>Display Rows:</p>
          <Input type="number" value={data.display_rows} onChange={e => currentNode.setData({ ...data, display_rows: Number(e.target.value) })} />
        </>
      )}
      {data.taskType === 'HTTP' && (
        <>
          <p>URL:</p>
          <Input value={data.url} onChange={e => currentNode.setData({ ...data, url: e.target.value })} />
          <p>HTTP Method:</p>
          <Input value={data.http_method} onChange={e => currentNode.setData({ ...data, http_method: e.target.value })} />
          <p>HTTP Check Condition:</p>
          <Input value={data.http_check_condition} onChange={e => currentNode.setData({ ...data, http_check_condition: e.target.value })} />
          <p>Condition:</p>
          <Input value={data.condition} onChange={e => currentNode.setData({ ...data, condition: e.target.value })} />
          <p>Connect Timeout (ms):</p>
          <Input type="number" value={data.connect_timeout} onChange={e => currentNode.setData({ ...data, connect_timeout: Number(e.target.value) })} />
          <p>Socket Timeout (ms):</p>
          <Input type="number" value={data.socket_timeout} onChange={e => currentNode.setData({ ...data, socket_timeout: Number(e.target.value) })} />
        </>
      )}
      {data.taskType === 'SUB_PROCESS' && (
        <>
          <p>Workflow Name:</p>
          <Input value={data.workflow_name} onChange={e => currentNode.setData({ ...data, workflow_name: e.target.value })} />
        </>
      )}
      {data.taskType === 'SWITCH' && (
        <>
          <p>Conditions:</p>
          {data.switch_condition?.dependTaskList.map((branch: any, index: number) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <Input
                placeholder="Condition"
                value={branch.condition}
                onChange={e => {
                  const newBranches = [...data.switch_condition.dependTaskList];
                  newBranches[index].condition = e.target.value;
                  currentNode.setData({ ...data, switch_condition: { dependTaskList: newBranches } });
                }}
              />
              <Input
                placeholder="Task Name"
                value={branch.task}
                onChange={e => {
                  const newBranches = [...data.switch_condition.dependTaskList];
                  newBranches[index].task = e.target.value;
                  currentNode.setData({ ...data, switch_condition: { dependTaskList: newBranches } });
                }}
              />
            </div>
          ))}
        </>
      )}
      {data.taskType === 'CONDITIONS' && (
        <>
          <p>Success Task:</p>
          <Input value={data.success_task} onChange={e => currentNode.setData({ ...data, success_task: e.target.value })} />
          <p>Failed Task:</p>
          <Input value={data.failed_task} onChange={e => currentNode.setData({ ...data, failed_task: e.target.value })} />
          <p>Operator:</p>
          <Select
            value={data.op}
            onChange={value => currentNode.setData({ ...data, op: value })}
            style={{ width: '100%' }}
          >
            <Select.Option value="AND">AND</Select.Option>
            <Select.Option value="OR">OR</Select.Option>
          </Select>
          <p>Groups (JSON):</p>
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
