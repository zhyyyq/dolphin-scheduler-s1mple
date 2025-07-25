import React, { useEffect, useState } from 'react';
import { Modal, Input, Form, Switch, Space, Button } from 'antd';
import { Task } from '../types';
import DefaultTaskEditor from './tasks/DefaultTaskEditor';
import yaml from 'js-yaml';
import { taskTypes } from '../config/taskTypes';

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  allTasks: Task[];
  onCancel: () => void;
  onSave: (updated_task: Task) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ open, task, allTasks, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [useDefaultEditor, setUseDefaultEditor] = useState(false);

  useEffect(() => {
    // Reset the switch when a new task is opened
    setUseDefaultEditor(false);
    if (open && task) {
      // Set form values from both top-level task properties and task_params
      form.setFieldsValue({
        ...task,
        ...task.task_params,
      });
    }
  }, [open, task, form]);

  if (!task) {
    return null;
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      const { name, command, definition, ...other_values } = values;
      const updated_task_params = { ...task?.task_params, ...other_values };

      // For Python tasks, the script comes from the 'definition' field.
      // We map it to the 'command' property for standardization in the YAML.
      const final_command = task?.task_type === 'PYTHON' ? definition : command;

      let finalTask: Task = {
        ...task!,
        name: name,
        command: final_command,
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
      // Pass form and initialValues to all editors.
      // Editors that don't need them will simply ignore them.
      return <EditorComponent form={form} initialValues={task} allTasks={allTasks} />;
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
      </Form>
    </Modal>
  );
};

export default EditTaskModal;
