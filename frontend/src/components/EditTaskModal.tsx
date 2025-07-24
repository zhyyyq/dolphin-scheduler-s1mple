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
      // This is the key fix: form values should be merged into task_params,
      // not spread directly onto the task object.
      const updated_task_params = { ...task?.task_params, ...values };
      
      // The name is a top-level property, not part of task_params.
      delete updated_task_params.name;

      let finalTask: Task = {
        ...task!,
        name: values.name, // Keep name at the top level
        task_params: updated_task_params,
      };

      // For PARAMS node, sync the node name with the parameter's prop
      if (task.type === 'PARAMS' && values.prop) {
        finalTask.name = values.prop;
        finalTask.label = values.prop;
      }

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
          finalTask = {
            ...task!,
            name: values.name,
            success_task: values.success_task,
            failed_task: values.failed_task,
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
