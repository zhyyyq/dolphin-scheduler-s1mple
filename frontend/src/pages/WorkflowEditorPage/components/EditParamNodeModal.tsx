import React, { useEffect, useState } from 'react';
import { Modal, Input, Form, Select, Button } from 'antd';
import { Task } from '@/types'; // We can still use Task as a loose shape for the node data
import { Graph } from '@antv/x6';

interface EditParamNodeModalProps {
  open: boolean;
  node: Task | null;
  graph: Graph | null;
  onCancel: () => void;
  onSave: (updated_node: Task) => void;
}

const { Option } = Select;

const EditParamNodeModal: React.FC<EditParamNodeModalProps> = ({ open, node, graph, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (open && node && graph) {
      const edges = graph.getConnectedEdges(node.name);
      setIsConnected(edges && edges.length > 0);
      form.setFieldsValue({
        prop: node.name, // The 'name' of the node is the 'prop' of the parameter
        ...(node.task_params || {}),
      });
    }
  }, [open, node, form]);

  if (!node) {
    return null;
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      const finalNode: Task = {
        ...node,
        name: values.prop, // Sync name with prop
        label: values.prop,
        task_params: {
          ...node.task_params,
          prop: values.prop,
          type: values.type,
          value: values.value,
          direction: values.direction,
        },
      };
      onSave(finalNode);
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  return (
    <Modal
      title={`编辑参数: ${node.name}`}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      forceRender
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="参数名"
          name="prop"
          rules={[{ required: true, message: '请输入参数名' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="方向"
          name="direction"
          initialValue="OUT"
        >
          <Select disabled={isConnected}>
            <Option value="IN">IN</Option>
            <Option value="OUT">OUT</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="类型"
          name="type"
          initialValue="VARCHAR"
        >
          <Select>
            <Option value="VARCHAR">VARCHAR</Option>
            <Option value="INTEGER">INTEGER</Option>
            <Option value="LONG">LONG</Option>
            <Option value="FLOAT">FLOAT</Option>
            <Option value="DOUBLE">DOUBLE</Option>
            <Option value="DATE">DATE</Option>
            <Option value="TIMESTAMP">TIMESTAMP</Option>
            <Option value="BOOLEAN">BOOLEAN</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="参数值"
          name="value"
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditParamNodeModal;
