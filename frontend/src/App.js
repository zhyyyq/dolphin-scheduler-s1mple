import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, Link, useLocation } from 'react-router-dom';
import { Upload, Button, Layout, message, Typography, Modal, Switch, Input, Spin, Menu } from 'antd';
import { InboxOutlined, CodeOutlined, ApartmentOutlined, PlusOutlined, DashboardOutlined } from '@ant-design/icons';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';
import DagGraph from './DagGraph';
import Home from './Home';
import WorkflowViewer from './WorkflowViewer';
import Dashboard from './Dashboard';
import './App.css';

const { Header, Content, Sider } = Layout;
const { Dragger } = Upload;
const { Title } = Typography;
const { TextArea } = Input;

function WorkflowEditor() {
  const [searchParams] = useSearchParams();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editedCode, setEditedCode] = useState('');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeCommand, setNodeCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);

  useEffect(() => {
    const projectCode = searchParams.get('projectCode');
    const workflowCode = searchParams.get('workflowCode');
    if (projectCode && workflowCode) {
      const fetchWorkflowForEdit = async () => {
        setIsLoadingWorkflow(true);
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/project/${projectCode}/workflow/${workflowCode}`);
          if (!response.ok) {
            throw new Error('Failed to fetch workflow for editing.');
          }
          const data = await response.json();
          // We need to reconstruct the python code from the parsed data.
          // This is a simplification. A real implementation would be more complex.
          let reconstructedCode = `from pydolphinscheduler.tasks import Shell\nfrom pydolphinscheduler.workflow import Workflow\n\n`;
          reconstructedCode += `with Workflow(name='${data.name}', schedule='0 0 0 * * ? *') as wf:\n`;
          for (const task of data.tasks) {
            reconstructedCode += `    ${task.name} = Shell(name='${task.name}', command='${task.command}')\n`;
          }
          // Note: Reconstructing relations (<<) is complex and omitted here for brevity.
          
          setEditedCode(reconstructedCode);
          setPreview(data);
          setIsEditorVisible(true);
        } catch (error) {
          message.error(error.message);
        } finally {
          setIsLoadingWorkflow(false);
        }
      };
      fetchWorkflowForEdit();
    }
  }, [searchParams]);

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
        setIsEditorVisible(true); // Automatically open the editor on upload
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
    
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadedFile, code: editedCode }),
      });

      const result = await response.json();

      if (response.ok && result.returncode === 0) {
        setExecutionResult(result);
        setTimeout(() => {
          message.success(result.message || 'Task executed successfully.');
        }, 0);
      } else {
        const errorMessage = result.detail?.message || result.message || 'Failed to submit task for execution.';
        message.error(errorMessage);
        setExecutionResult(result.detail || result);
      }
    } catch (error) {
      message.error('An error occurred while submitting the task.');
      setExecutionResult({ stderr: error.toString() });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNodeDoubleClick = useCallback((node) => {
    setEditingNode(node);
    setNodeCommand(node.command);
  }, []);

  const handleNodeEditSave = () => {
    if (!editingNode) return;

    const taskName = editingNode.name;
    const oldCommand = editingNode.command;
    const newCommand = nodeCommand;

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
                <Button type="primary" size="large" onClick={handleSubmit} loading={isExecuting}>提交</Button>
            </>
        )}
    </div>
  );

  return (
    <>
      {renderAppbar()}
      <DagGraph data={preview} onNodeDoubleClick={handleNodeDoubleClick} />
      {!preview && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
              <Dragger {...props} style={{ width: '800px', padding: '64px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
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
      <Modal
          title="Execution Result"
          open={!!executionResult}
          onCancel={() => setExecutionResult(null)}
          footer={[
              <Button key="back" onClick={() => setExecutionResult(null)}>
                  Close
              </Button>,
          ]}
      >
          {isExecuting ? <Spin /> : (
              <div>
                  <h4>Standard Output:</h4>
                  <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                      {executionResult?.stdout || '(empty)'}
                  </pre>
                  <h4>Standard Error:</h4>
                  <pre style={{ background: '#fffbe6', color: '#d4380d', padding: '10px', borderRadius: '4px' }}>
                      {executionResult?.stderr || '(empty)'}
                  </pre>
              </div>
          )}
      </Modal>
    </>
  );
}

function App() {
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="logo" style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu theme="dark" selectedKeys={[location.pathname]} mode="inline">
          <Menu.Item key="/dashboard" icon={<DashboardOutlined />}>
            <Link to="/dashboard">Dashboard</Link>
          </Menu.Item>
          <Menu.Item key="/" icon={<ApartmentOutlined />}>
            <Link to="/">Workflows</Link>
          </Menu.Item>
          <Menu.Item key="/upload" icon={<PlusOutlined />}>
            <Link to="/upload">New Workflow</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 16px' }}>
          <Title level={3} style={{ color: 'white', lineHeight: '64px', float: 'left' }}>极简任务调度平台</Title>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<WorkflowEditor />} />
            <Route path="/project/:projectCode/workflow/:workflowCode" element={<WorkflowViewer />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

// We need to wrap App with Router to use useLocation hook
function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;

// The default export is now the wrapper
// export default App;
