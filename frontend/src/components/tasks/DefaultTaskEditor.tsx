import React, { useEffect } from 'react';
import { Form, Input, FormInstance } from 'antd';
import yaml from 'js-yaml';
import { Graph } from '@antv/x6';
import { Task } from '../../types';

const { TextArea } = Input;

interface DefaultTaskEditorProps {
  initialValues: any;
  form: FormInstance<any>;
}

interface DefaultTaskEditorComponent extends React.FC<DefaultTaskEditorProps> {
  createNode: (graph: Graph, task: any, contextMenu: { px: number, py: number }) => void;
}

const DefaultTaskEditor: DefaultTaskEditorComponent = ({ initialValues, form }) => {

  useEffect(() => {
    // Convert the initial task object to a YAML string, omitting fields
    // that are managed by the main modal form (like name).
    const { name, ...rest } = initialValues;
    
    // Also remove fields that are added by the backend or are not part of the core definition
    const coreFields = ['deps', 'id', 'x', 'y', 'label', '_display_type', 'type', 'task_type', 'name'];
    const task_params: { [key: string]: any } = {};

    for (const key in rest) {
      if (!coreFields.includes(key)) {
        task_params[key] = rest[key];
        delete rest[key];
      }
    }
    rest.task_params = task_params;

    const yamlString = yaml.dump(rest.task_params);
    
    // Set the value in the antd form instance
    form.setFieldsValue({ yaml_content: yamlString });

  }, [initialValues, form]);

  return (
    <Form.Item
      label="任务节点 YAML"
      name="yaml_content"
      rules={[
        {
          validator: async (_, value) => {
            if (!value) return; // Allow empty value
            try {
              yaml.load(value);
            } catch (e) {
              throw new Error('YAML 格式无效');
            }
          },
        },
      ]}
    >
      <TextArea
        rows={15}
        placeholder="以 YAML 格式编辑任务属性"
      />
    </Form.Item>
  );
};

DefaultTaskEditor.createNode = (graph: Graph, taskInfo: any, contextMenu: { px: number, py: number }) => {
  const existingNodes = graph.getNodes();
  let newNodeName = taskInfo.label;
  let counter = 1;
  while (existingNodes.some(n => n.getData().label === newNodeName)) {
    newNodeName = `${taskInfo.label}_${counter}`;
    counter++;
  }

  const nodeData: Partial<Task> = {
    name: newNodeName,
    label: newNodeName,
    task_type: taskInfo.type,
    type: taskInfo.type,
    task_params: (taskInfo as any).default_params || {},
    _display_type: taskInfo.type,
  };

  if (['SHELL', 'PYTHON', 'HTTP'].includes(taskInfo.type)) {
    nodeData.command = taskInfo.command;
  }

  graph.addNode({
    shape: 'task-node',
    x: contextMenu.px,
    y: contextMenu.py,
    data: nodeData as Task,
  });
};

export default DefaultTaskEditor;
