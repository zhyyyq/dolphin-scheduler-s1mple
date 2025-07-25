import React, { useEffect } from 'react';
import { Form, Input, Select, Button, Space, FormInstance } from 'antd';
import { MinusCircleOutlined, PlusOutlined, CloudServerOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';

const { Option } = Select;

interface HttpTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

interface HttpTaskEditorComponent extends React.FC<HttpTaskEditorProps> {
  taskInfo: any;
}

const HttpTaskEditor: HttpTaskEditorComponent = ({ form, initialValues }) => {
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  return (
    <>
      <Form.Item
        label="URL"
        name="url"
        rules={[{ required: true, message: '请输入 URL' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="HTTP 方法"
        name="http_method"
        rules={[{ required: true, message: '请选择 HTTP 方法' }]}
      >
        <Select>
          <Option value="GET">GET</Option>
          <Option value="POST">POST</Option>
          <Option value="PUT">PUT</Option>
          <Option value="DELETE">DELETE</Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="HTTP 检查条件"
        name="http_check_condition"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="条件"
        name="condition"
      >
        <Input />
      </Form.Item>
      
      <Form.Item label="HTTP 参数">
        <Form.List name="http_params">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'prop']}
                    rules={[{ required: true, message: '缺少属性' }]}
                  >
                    <Input placeholder="属性" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'value']}
                    rules={[{ required: true, message: '缺少值' }]}
                  >
                    <Input placeholder="值" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'httpParametersType']}
                    rules={[{ required: true, message: '缺少类型' }]}
                  >
                    <Select placeholder="类型" style={{ width: 120 }}>
                      <Option value="PARAMETER">PARAMETER</Option>
                      <Option value="HEADER">HEADER</Option>
                      <Option value="BODY">BODY</Option>
                    </Select>
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加参数
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form.Item>
    </>
  );
};

HttpTaskEditor.taskInfo = {
  label: 'HTTP',
  type: 'HTTP',
  command: 'curl http://example.com',
  category: 'general',
  icon: CloudServerOutlined,
  editor: HttpTaskEditor,
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
      command: task.command,
    };

    graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
    });
  },
};

export default HttpTaskEditor;
