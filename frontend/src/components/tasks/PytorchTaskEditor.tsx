import React from 'react';
import { Form, Input, Select, Switch } from 'antd';

const { Option } = Select;

const PytorchTaskEditor: React.FC = () => {
  const form = Form.useFormInstance();
  const isCreateEnvironment = Form.useWatch('is_create_environment', form);
  const pythonEnvTool = Form.useWatch('python_env_tool', form);

  return (
    <>
      <Form.Item
        label="脚本 (Script)"
        name="script"
        rules={[{ required: true, message: '请输入脚本路径' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="脚本参数 (Script Params)"
        name="script_params"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="项目路径 (Project Path)"
        name="project_path"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="是否创建环境"
        name="is_create_environment"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      {isCreateEnvironment ? (
        <>
          <Form.Item
            label="Python 环境工具"
            name="python_env_tool"
            rules={[{ required: true, message: '请选择环境工具' }]}
          >
            <Select>
              <Option value="conda">Conda</Option>
              <Option value="virtualenv">Virtualenv</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="依赖文件 (Requirements)"
            name="requirements"
            rules={[{ required: true, message: '请输入依赖文件路径' }]}
          >
            <Input />
          </Form.Item>
          {pythonEnvTool === 'conda' && (
            <Form.Item
              label="Conda Python 版本"
              name="conda_python_version"
              rules={[{ required: true, message: '请输入 Conda Python 版本' }]}
            >
              <Input />
            </Form.Item>
          )}
        </>
      ) : (
        <Form.Item
          label="Python 命令"
          name="python_command"
          rules={[{ required: true, message: '请输入 Python 命令' }]}
        >
          <Input />
        </Form.Item>
      )}
    </>
  );
};

export default PytorchTaskEditor;
