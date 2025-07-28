import React, { useState, useEffect } from 'react';
import { Form, FormInstance, Input, Select, Switch, Radio, Button, Space, InputNumber, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import api from '../../../api';

const { Option } = Select;

interface DependentTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

interface DependentTaskEditorComponent extends React.FC<DependentTaskEditorProps> {
  taskInfo: any;
}

const DependentTaskEditor: DependentTaskEditorComponent = ({ form }) => {
  const denpendence = Form.useWatch('denpendence', form);
  const [projects, setProjects] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);

  useEffect(() => {
    api.getProjects().then(data => {
      setProjects(data || []);
    });
  }, []);

  // Pre-fill workflows when editing an existing node
  useEffect(() => {
    const initialProject = form.getFieldValue(['denpendence', 'project']);
    if (initialProject) {
      setIsLoadingWorkflows(true);
      api.getWorkflows(initialProject).then(data => {
        setWorkflows(data || []);
      }).finally(() => {
        setIsLoadingWorkflows(false);
      });
    }
  }, [projects, form]);

  const handleProjectChange = (projectCode: string) => {
    // Reset workflow when project changes
    form.setFieldValue(['denpendence', 'workflow'], undefined);
    
    setIsLoadingWorkflows(true);
    api.getWorkflows(projectCode).then(data => {
      setWorkflows(data || []);
    }).finally(() => {
      setIsLoadingWorkflows(false);
    });
  };

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 16 }}>
      <Form.Item
        label="依赖类型"
        name={['denpendence', 'type']}
        initialValue="workflow"
        rules={[{ required: true }]}
      >
        <Select>
          <Option value="workflow">依赖于工作流</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="项目名称"
        name={['denpendence', 'project']}
        rules={[{ required: true, message: '请选择项目' }]}
      >
        <Select
          showSearch
          placeholder="请选择项目"
          onChange={handleProjectChange}
          filterOption={(input, option) =>
            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {projects.map(p => <Option key={p.code} value={p.code}>{p.name}</Option>)}
        </Select>
      </Form.Item>

      <Form.Item
        label="工作流名称"
        name={['denpendence', 'workflow']}
        rules={[{ required: true, message: '请选择工作流' }]}
      >
        <Select
          showSearch
          placeholder="请先选择项目"
          loading={isLoadingWorkflows}
          disabled={!denpendence?.project}
          filterOption={(input, option) =>
            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {workflows.map(w => <Option key={w.code} value={w.code}>{w.name}</Option>)}
        </Select>
      </Form.Item>

      <Form.Item label="时间周期">
        <Space>
          <Form.Item name={['denpendence', 'date_unit']} noStyle initialValue="day">
            <Select style={{ width: 120 }}>
              <Option value="month">月</Option>
              <Option value="week">周</Option>
              <Option value="day">日</Option>
              <Option value="hour">时</Option>
            </Select>
          </Form.Item>
          <Form.Item name={['denpendence', 'date_value']} noStyle initialValue="today">
            <Select style={{ width: 120 }}>
              <Option value="today">今天</Option>
              <Option value="yesterday">昨天</Option>
              <Option value="before_2_days">前两天</Option>
              <Option value="before_3_days">前三天</Option>
              <Option value="before_7_days">前七天</Option>
            </Select>
          </Form.Item>
        </Space>
      </Form.Item>

      <Form.Item label="参数传递" valuePropName="checked" name={['denpendence', 'pass_params']}>
        <Switch />
      </Form.Item>

      {denpendence?.pass_params && (
        <Form.List name={['denpendence', 'param_mappings']}>
          {(paramFields, { add: addParam, remove: removeParam }) => (
            <div style={{ paddingLeft: 24 }}>
              {paramFields.map(paramField => (
                <Space key={paramField.key} align="baseline">
                  <Form.Item name={[paramField.name, 'source']} rules={[{ required: true, message: '必填' }]}>
                    <Input placeholder="上游参数" />
                  </Form.Item>
                  <Form.Item name={[paramField.name, 'target']} rules={[{ required: true, message: '必填' }]}>
                    <Input placeholder="当前节点参数" />
                  </Form.Item>
                  <DeleteOutlined onClick={() => removeParam(paramField.name)} />
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => addParam()} block icon={<PlusOutlined />}>
                  添加参数传递
                </Button>
              </Form.Item>
            </div>
          )}
        </Form.List>
      )}

      <Form.Item
        label="检查间隔"
        name={['denpendence', 'check_interval']}
        initialValue={10}
      >
        <InputNumber min={1} addonAfter="秒" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="依赖失败策略"
        name={['denpendence', 'failure_strategy']}
        initialValue="wait"
      >
        <Radio.Group>
          <Radio value="fail">失败</Radio>
          <Radio value="wait">等待</Radio>
        </Radio.Group>
      </Form.Item>

      {denpendence?.failure_strategy === 'wait' && (
        <Form.Item
          label="依赖失败等待时间"
          name={['denpendence', 'failure_waiting_time']}
          initialValue={30}
          rules={[{ required: true, message: '请输入等待时间' }]}
        >
          <InputNumber min={1} addonAfter="分" style={{ width: '100%' }} />
        </Form.Item>
      )}
    </div>
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
      task_params: {
        denpendence: {
          type: 'workflow',
          date_unit: 'day',
          date_value: 'today',
          check_interval: 10,
          failure_strategy: 'wait',
          failure_waiting_time: 30,
        },
      },
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
