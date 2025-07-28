import React, { useState, useEffect } from 'react';
import { Select, Form } from 'antd';
import { Node, Graph } from '@antv/x6';
import { Task } from '../../../types';
import { PartitionOutlined } from '@ant-design/icons';
import api from '../../../api';

const { Option } = Select;

interface SubProcessTaskEditorProps {
  form: any;
  initialValues: Task;
}

interface SubProcessTaskEditorComponent extends React.FC<SubProcessTaskEditorProps> {
  taskInfo: any;
}

const SubProcessTaskEditor: SubProcessTaskEditorComponent = ({ form, initialValues }) => {
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await api.get<any[]>('/api/ds/workflows');
        setWorkflows(response);
      } catch (error) {
        console.error("Failed to fetch workflows", error);
      }
    };
    fetchWorkflows();
  }, []);

  return (
    <Form.Item
      label="子节点"
      name="processDefinitionCode"
      rules={[{ required: true, message: '请选择一个子流程' }]}
    >
      <Select
        showSearch
        placeholder="选择一个工作流"
        optionFilterProp="children"
        filterOption={(input, option) =>
          (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
        }
      >
        {workflows.map(wf => (
          <Option key={wf.code} value={wf.code}>
            {`${wf.projectName} / ${wf.name}`}
          </Option>
        ))}
      </Select>
    </Form.Item>
  );
};

SubProcessTaskEditor.taskInfo = {
  label: '子流程',
  type: 'SUB_PROCESS',
  command: '',
  category: 'logic',
  icon: PartitionOutlined,
  editor: SubProcessTaskEditor,
  createNode: (graph: Graph, task: any, contextMenu: { px: number, py: number }) => {
    const existingNodes = graph.getNodes();
    let newNodeName = task.label;
    let counter = 1;
    while (existingNodes.some(n => n.getData().label === newNodeName)) {
      newNodeName = `${task.label}_${counter}`;
      counter++;
    }

    const nodeData: Partial<Task> = {
      name: newNodeName,
      label: newNodeName,
      task_type: task.type,
      type: task.type,
      task_params: {
        processDefinitionCode: '',
      },
      _display_type: task.type,
    };

    return graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
    });
  },
};

export default SubProcessTaskEditor;
