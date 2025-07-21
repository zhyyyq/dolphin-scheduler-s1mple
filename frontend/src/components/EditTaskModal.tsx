import React from 'react';
import { Modal, Input } from 'antd';
import { ShellTaskEditor } from './tasks/ShellTaskEditor';
import { SqlTaskEditor } from './tasks/SqlTaskEditor';
import { HttpTaskEditor } from './tasks/HttpTaskEditor';
import { SubProcessTaskEditor } from './tasks/SubProcessTaskEditor';
import { ConditionsTaskEditor } from './tasks/ConditionsTaskEditor';
import { SwitchTaskEditor } from './tasks/SwitchTaskEditor';

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

  const renderTaskEditor = () => {
    switch (data._display_type?.toUpperCase()) {
      case 'SHELL':
      case 'PYTHON':
        return <ShellTaskEditor currentNode={currentNode} nodeCommand={nodeCommand} onNodeCommandChange={onNodeCommandChange} />;
      case 'SQL':
        return <SqlTaskEditor currentNode={currentNode} />;
      case 'HTTP':
        return <HttpTaskEditor currentNode={currentNode} />;
      case 'SUB_PROCESS':
        return <SubProcessTaskEditor currentNode={currentNode} />;
      case 'CONDITIONS':
        return <ConditionsTaskEditor currentNode={currentNode} />;
      case 'SWITCH':
        return <SwitchTaskEditor currentNode={currentNode} />;
      default:
        return (
          <>
            <p>命令:</p>
            <Input.TextArea value={nodeCommand} onChange={e => onNodeCommandChange(e.target.value)} rows={4} />
          </>
        );
    }
  };

  return (
    <Modal title="编辑任务" open={isModalVisible} onOk={onOk} onCancel={onCancel}>
      <p>名称:</p>
      <Input value={nodeName} onChange={e => onNodeNameChange(e.target.value)} />
      {renderTaskEditor()}
    </Modal>
  );
};
