import React, { useState } from 'react';
import { Form, Button, Modal } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '@/types';
import { CodeOutlined, EyeOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';

interface DiyFunctionTaskEditorProps {
  task: Task;
}

interface DiyFunctionTaskEditorComponent extends React.FC<DiyFunctionTaskEditorProps> {
  taskInfo: any;
}

import api from '@/api';
import { Spin } from 'antd';

const DiyFunctionTaskEditor: DiyFunctionTaskEditorComponent = ({ task }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const showModal = async () => {
    const functionId = task?.task_params?.functionId;
    if (!functionId) {
      Modal.error({ title: 'Error', content: 'Function ID is missing.' });
      return;
    }
    
    setIsModalVisible(true);
    setLoading(true);
    try {
      const response = await api.get<any>(`/api/diy-functions/${functionId}`);
      setCode(response.functionContent);
    } catch (error) {
      setCode('# Failed to load code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setCode(''); // Clear code when closing
  };

  return (
    <>
      <Form.Item
        label="Function Definition"
      >
        <Button icon={<EyeOutlined />} onClick={showModal}>
          View Function
        </Button>
      </Form.Item>
      <Modal
        title="View Function Code"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Close
          </Button>,
        ]}
        width="80%"
        destroyOnClose
      >
        <Spin spinning={loading}>
          <Editor
            height="60vh"
            language="python"
            value={code}
            theme="light"
            options={{
              readOnly: true,
              selectOnLineNumbers: true,
              automaticLayout: true,
            }}
          />
        </Spin>
      </Modal>
    </>
  );
};

const taskInfo = {
  label: '自定义组件',
  type: 'DIY_FUNCTION',
  // This task type is special and shouldn't appear in the general menu.
  // It's added dynamically via the '自定义组件' submenu.
  // category: 'general', 
  icon: CodeOutlined,
  editor: DiyFunctionTaskEditor,
  createNode: (graph: Graph, task: any, contextMenu: { px: number, py: number }, func?: any) => {
    // When loading from YAML, `func` is undefined.
    // When creating from context menu, `func` is the full function object.
    const isNewNode = !!func;
    const baseName = isNewNode ? func.functionName : task.name;
    const functionId = isNewNode ? func.functionId : task.task_params?.functionId;

    const existingNodes = graph.getNodes();
    let newNodeName = baseName;
    let counter = 1;
    // Only check for name conflicts if it's a new node from the menu
    if (isNewNode) {
      while (existingNodes.some(n => n.getData().label === newNodeName)) {
        newNodeName = `${baseName}_${counter}`;
        counter++;
      }
    }

    const finalTaskParams = { ...task.task_params, functionId };
    if (isNewNode && func.contentHash) {
      finalTaskParams.contentHash = func.contentHash;
    }

    const nodeData: Partial<Task> = {
      name: newNodeName,
      label: isNewNode ? newNodeName : task.label || baseName,
      task_type: 'DIY_FUNCTION',
      type: 'DIY_FUNCTION',
      task_params: finalTaskParams,
      _display_type: 'DIY_FUNCTION',
      command: task.command || '', // Preserve command if already fetched
    };

    return graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
    });
  },
};

DiyFunctionTaskEditor.taskInfo = taskInfo;

export default DiyFunctionTaskEditor;
