import React, { useEffect } from 'react';
import { Form, FormInstance, Input } from 'antd';
import yaml from 'js-yaml';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import { NodeIndexOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface DependentTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

interface DependentTaskEditorComponent extends React.FC<DependentTaskEditorProps> {
  taskInfo: any;
}

const DependentTaskEditor: DependentTaskEditorComponent = ({ form, initialValues }) => {

  useEffect(() => {
    if (initialValues) {
      const { denpendence } = initialValues;
      // If denpendence is null or undefined, dump an empty object to avoid 'null' string
      const yamlText = yaml.dump(denpendence || {});
      form.setFieldsValue({ denpendence_yaml: yamlText });
    }
  }, [initialValues, form]);

  return (
    <Form.Item
      label="依赖逻辑 (YAML)"
      name="denpendence_yaml"
      rules={[
        { required: true, message: '请输入依赖逻辑' },
        {
          validator: async (_, value) => {
            try {
              yaml.load(value);
            } catch (e) {
              throw new Error('YAML 格式无效');
            }
          },
        },
      ]}
    >
      <TextArea rows={15} placeholder="在此输入 denpendence 的 YAML 结构" />
    </Form.Item>
  );
};

DependentTaskEditor.taskInfo = {
  label: '依赖',
  type: 'DEPENDENT',
  command: '',
  category: 'logic',
  icon: NodeIndexOutlined,
  editor: DependentTaskEditor,
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
      task_params: (task as any).default_params || {},
      _display_type: task.type,
    };

    graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
    });
  },
};

export default DependentTaskEditor;
