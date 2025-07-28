import React, { useEffect } from 'react';
import { Form, Input, Select, Button, Space, FormInstance } from 'antd';
import { MinusCircleOutlined, PlusOutlined, CloudServerOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';

const { TextArea } = Input;
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
        name="httpMethod"
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
        label="校验条件"
        name="httpCheckCondition"
        initialValue="STATUS_CODE_CUSTOM"
      >
        <Select>
          <Option value="STATUS_CODE_CUSTOM">默认响应码200</Option>
          <Option value="BODY_CONTAINS">Body包含</Option>
          <Option value="BODY_NOT_CONTAINS">Body不包含</Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="校验内容"
        name="httpCheckContent"
      >
        <TextArea rows={4} placeholder="请填写校验内容" />
      </Form.Item>

      <Form.Item
        label="条件"
        name="condition"
      >
        <Input />
      </Form.Item>

      <Form.Item label="HTTP 参数">
        <Form.List name="httpParams">
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
                      <Option value="PARAMETER">Parameter</Option>
                      <Option value="HEADERS">Headers</Option>
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

      <Form.Item
        label="请求Body"
        name="httpBody"
      >
        <TextArea rows={4} placeholder="请填写http body,如若填写将忽略请求参数中的body类型参数" />
      </Form.Item>

      <Form.Item
        label="连接超时 (ms)"
        name="connectTimeout"
        initialValue={60000}
      >
        <Input type="number" />
      </Form.Item>

      <Form.Item
        label="Socket 超时 (ms)"
        name="socketTimeout"
        initialValue={60000}
      >
        <Input type="number" />
      </Form.Item>
    </>
  );
};

HttpTaskEditor.taskInfo = {
  label: 'HTTP',
  type: 'HTTP',
  category: 'general',
  icon: CloudServerOutlined,
  editor: HttpTaskEditor,
  default_params: {
    failRetryTimes: 0,
    failRetryInterval: 1,
    url: '',
    httpMethod: 'GET',
    httpCheckCondition: 'STATUS_CODE_CUSTOM',
    httpCheckContent: '',
    condition: '',
    httpParams: [],
    httpBody: '',
    connectTimeout: 60000,
    socketTimeout: 60000,
    localParams: [],
    resourceList: [],
  },
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
      task_params: JSON.parse(JSON.stringify((task as any).default_params || {})),
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

export default HttpTaskEditor;
