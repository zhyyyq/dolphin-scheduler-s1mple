import React, { useState } from 'react';
import { Upload, Button, Layout, message, Typography, Modal, Switch, Input } from 'antd';
import { InboxOutlined, CodeOutlined } from '@ant-design/icons';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';
import DagGraph from './DagGraph';
import './App.css';

const { Header, Content } = Layout;
const { Dragger } = Upload;
const { Title } = Typography;
const { TextArea } = Input;

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editedCode, setEditedCode] = useState('');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeCommand, setNodeCommand] = useState('');

  const props = {
    name: 'file',
    multiple: false,
    action: 'http://127.0.0.1:8000/api/parse',
    showUploadList: false,
    onChange(info) {
      const { status, response } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} file uploaded and parsed successfully.`);
        setPreview(response.preview);
        setEditedCode(response.content);
        setUploadedFile(response.filename);
      } else if (status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  const handleReparse = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/reparse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editedCode }),
      });
      if (response.ok) {
        const result = await response.json();
        setPreview(result.preview);
        message.success('Code re-parsed and DAG updated.');
      } else {
        message.error('Failed to re-parse code.');
      }
    } catch (error) {
      message.error('An error occurred while re-parsing.');
    }
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      message.warning('Please upload a file first.');
      return;
    }
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadedFile, code: editedCode }),
      });

      if (response.ok) {
        const result = await response.json();
        message.success(result.message);
      } else {
        message.error('Failed to submit task for execution.');
      }
    } catch (error) {
      message.error('An error occurred while submitting the task.');
    }
  };

  const handleNodeDoubleClick = (node) => {
    setEditingNode(node);
    setNodeCommand(node.command);
  };

  const handleNodeEditSave = () => {
    if (!editingNode) return;

    const taskName = editingNode.name;
    const oldCommand = editingNode.command;
    const newCommand = nodeCommand;

    // This is a simplified way to replace the command.
    // A more robust solution would use a proper code parser/manipulator.
    const regex = new RegExp(`(${taskName}\\s*=\\s*Shell\\([^)]*command=)('${oldCommand}'|"${oldCommand}")`);
    if (regex.test(editedCode)) {
        const newCode = editedCode.replace(regex, `$1'${newCommand}'`);
        setEditedCode(newCode);
    } else {
        message.error("Could not find the task command in the code to update it.");
    }
    
    setEditingNode(null);
  };

  const renderAppbar = () => (
    <div style={{ position: 'absolute', top: 12, right: 24, zIndex: 10, display: 'flex', gap: '16px', alignItems: 'center' }}>
        {preview && (
            <>
                <Switch
                    checkedChildren={<CodeOutlined />}
                    unCheckedChildren={<CodeOutlined />}
                    checked={isEditorVisible}
                    onChange={setIsEditorVisible}
                />
                <Button type="primary" size="large" onClick={handleSubmit}>提交</Button>
            </>
        )}
    </div>
  );

  return (
    <Layout className="layout">
      <Header>
        <Title level={3} style={{ color: 'white', lineHeight: '64px', float: 'left' }}>极简任务调度平台</Title>
        {renderAppbar()}
      </Header>
      <Content style={{ padding: '0', height: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
        {preview ? (
            <DagGraph data={preview} onNodeDoubleClick={handleNodeDoubleClick} />
        ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Dragger {...props} style={{ width: '800px', padding: '64px' }}>
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">请上传你的任务配置文件</p>
                    <p className="ant-upload-hint">支持拖拽或点击上传</p>
                </Dragger>
            </div>
        )}
        <Modal
            title="代码编辑器 (可拖动)"
            open={isEditorVisible}
            onCancel={() => setIsEditorVisible(false)}
            width="60%"
            styles={{ body: { height: '70vh' } }}
            destroyOnHidden
            draggable
            footer={[
                <Button key="reparse" onClick={handleReparse}>
                    Update DAG
                </Button>,
            ]}
        >
            <Editor
                value={editedCode}
                onValueChange={code => setEditedCode(code)}
                highlight={code => highlight(code, languages.python)}
                padding={10}
                style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 14,
                    height: '100%',
                    overflow: 'auto',
                    border: '1px solid #d9d9d9'
                }}
            />
        </Modal>
        <Modal
            title={`编辑节点: ${editingNode?.name}`}
            open={!!editingNode}
            onOk={handleNodeEditSave}
            onCancel={() => setEditingNode(null)}
        >
            <p>Command:</p>
            <TextArea 
                rows={4} 
                value={nodeCommand} 
                onChange={(e) => setNodeCommand(e.target.value)} 
            />
        </Modal>
      </Content>
    </Layout>
  );
}

export default App;
