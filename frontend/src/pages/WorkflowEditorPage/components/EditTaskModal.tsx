import React, { useEffect, useState } from 'react';
import { Modal, Input, Form, Switch, Space, Button, InputNumber } from 'antd';
import { Task } from '../../../types';
import DefaultTaskEditor from './tasks/DefaultTaskEditor';
import yaml from 'js-yaml';
import { taskTypes } from '../../../config/taskTypes';
import { Graph } from '@antv/x6';

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  allTasks: Task[];
  graph: Graph | null;
  onCancel: () => void;
  onSave: (updated_task: Task) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ open, task, allTasks, graph, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [useDefaultEditor, setUseDefaultEditor] = useState(false);

  useEffect(() => {
    setUseDefaultEditor(false);
    if (open && task) {
      const taskCopy = JSON.parse(JSON.stringify(task));
      const formValues = {
        ...taskCopy,
        ...taskCopy.task_params,
      };

      // Unify script source. The form uses 'command', but the data might come from 'rawScript'.
      const script = task.command || task.task_params?.rawScript || '';
      formValues.command = script;

      // The Python editor specifically uses the 'definition' field.
      if (task.task_type === 'PYTHON') {
        formValues.definition = script;
      }
      
      if (task.task_type === 'SWITCH' && !formValues.switch_conditions) {
        formValues.switch_conditions = [];
      }
      form.setFieldsValue(formValues);
    }
  }, [open, task, form]);

  useEffect(() => {
    if (!graph || !open || !task || task.task_type !== 'SWITCH') return;

    const updateSwitchConditions = () => {
      const outgoingEdges = graph.getOutgoingEdges(task.name);
      if (outgoingEdges) {
        const newConditions = outgoingEdges.map((edge, index) => {
          const targetNode = edge.getTargetNode();
          const existingCondition = form.getFieldValue('switch_conditions')?.[index] || {};
          return {
            ...existingCondition,
            target_node: targetNode?.id,
          };
        });
        form.setFieldsValue({ switch_conditions: newConditions });
      }
    };

    const handleEdgeConnected = ({ edge }: { edge: any }) => {
      if (edge.getSourceNode()?.id === task.name) {
        updateSwitchConditions();
      }
    };

    const handleEdgeRemoved = ({ edge }: { edge: any }) => {
      if (edge.getSourceNode()?.id === task.name) {
        updateSwitchConditions();
      }
    };

    graph.on('edge:connected', handleEdgeConnected);
    graph.on('edge:removed', handleEdgeRemoved);

    // Initial update
    updateSwitchConditions();

    return () => {
      graph.off('edge:connected', handleEdgeConnected);
      graph.off('edge:removed', handleEdgeRemoved);
    };
  }, [graph, open, task, form]);

  if (!task) {
    return null;
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      const { name, command, definition, failRetryTimes, failRetryInterval, ...other_values } = values;
      
      // Deep copy the original task_params to avoid mutating the shared object
      const updated_task_params = { ...JSON.parse(JSON.stringify(task?.task_params || {})), ...other_values };

      // For Python tasks, the script comes from the 'definition' field.
      // We map it to the 'command' property for standardization in the YAML.
      const final_command = task?.task_type === 'PYTHON' ? definition : command;

      // Also update rawScript in task_params for compatibility with DolphinScheduler
      updated_task_params.rawScript = final_command;

      // Ensure failRetryTimes and failRetryInterval are part of task_params
      updated_task_params.failRetryTimes = failRetryTimes;
      updated_task_params.failRetryInterval = failRetryInterval;

      let finalTask: Task = {
        ...task!,
        name: name,
        command: final_command, // Keep command for consistency within our app
        task_params: updated_task_params,
      };

      if (useDefaultEditor && values.yaml_content) {
        try {
          const yamlData = yaml.load(values.yaml_content) as any;
          
          // Prevent modification of name and type from YAML content
          delete yamlData.name;
          delete yamlData.type;
          delete yamlData.task_type;

          finalTask = {
            ...task,
            ...values,
            ...yamlData,
          };
        } catch (e) {
          console.error("Error parsing YAML:", e);
          return;
        }
      } else if (values.conditions_yaml) {
        try {
          const conditionsData = yaml.load(values.conditions_yaml) as { op: string, groups: any[] };
          
          const successTask = allTasks.find(t => task.downstream?.success?.includes(t.name));
          const failedTask = allTasks.find(t => task.downstream?.failure?.includes(t.name));

          finalTask = {
            ...task!,
            name: values.name,
            success_task: successTask ? successTask.name : '',
            failed_task: failedTask ? failedTask.name : '',
            op: conditionsData.op as any,
            groups: conditionsData.groups,
          };
        } catch (e) {
          console.error("Error parsing YAML for Conditions:", e);
          return;
        }
      }

      // Ensure type and task_type are not modified
      finalTask.type = task.type;
      finalTask.task_type = task.task_type;

      // Remove temporary fields
      delete (finalTask as any).yaml_content;
      delete (finalTask as any).conditions_yaml;

      onSave(finalTask);

    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  const renderTaskEditor = () => {
    if (useDefaultEditor) {
      return <DefaultTaskEditor initialValues={task} form={form} />;
    }

    const taskConfig = taskTypes.find(t => t.type === task?.task_type);

    if (taskConfig && taskConfig.editor) {
      const EditorComponent = taskConfig.editor as React.FC<any>;
      const isCustom = task?.task_params?.isCustom === true;
      return <EditorComponent form={form} initialValues={task} allTasks={allTasks} graph={graph} isCustom={isCustom} task={task} />;
    }

    return <DefaultTaskEditor initialValues={task} form={form} />;
  };

  return (
    <Modal
      title={`编辑任务: ${task.name}`}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      forceRender
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Switch checked={useDefaultEditor} onChange={setUseDefaultEditor} />
            <span>使用 YAML 编辑器</span>
          </Space>
          <div>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" onClick={handleOk}>确定</Button>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="任务名称"
          name="name"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input />
        </Form.Item>
        {renderTaskEditor()}
        <Form.Item label="失败重试次数" name="failRetryTimes" initialValue={0}>
          <InputNumber min={0} style={{ width: '100%' }} addonAfter="次" />
        </Form.Item>
        <Form.Item label="失败重试间隔" name="failRetryInterval" initialValue={1}>
          <InputNumber min={1} style={{ width: '100%' }} addonAfter="分" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditTaskModal;
