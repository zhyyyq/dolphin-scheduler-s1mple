import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, Link, useLocation } from 'react-router-dom';
import { Upload, Button, Layout, message, Typography, Modal, Switch, Input, Spin, Menu, ConfigProvider } from 'antd';
import { InboxOutlined, CodeOutlined, ApartmentOutlined, PlusOutlined, DashboardOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';
import DagGraph from './DagGraph';
import Home from './Home';
import WorkflowViewer from './WorkflowViewer';
import Dashboard from './Dashboard';
import VersionHistory from './VersionHistory';
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
  const handleReparse =  useCallback(async (codeToParse) => {
    const code = typeof codeToParse === 'string' ? codeToParse : editedCode;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/reparse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
      });
      if (response.ok) {
        const result = await response.json();
        setPreview(result.preview);
        if (typeof codeToParse !== 'string') {
          message.success('代码已重新解析，DAG 图已更新。');
        }
      } else {
        message.error('重新解析代码失败。');
      }
    } catch (error) {
      message.error('重新解析时发生错误。');
    }
  }, [editedCode]);
  useEffect(() => {
    const workflowName = searchParams.get('workflowName');
    if (workflowName) {
      const fetchWorkflowContent = async () => {
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/workflow/${workflowName}/content`);
          if (!response.ok) {
            throw new Error('Failed to fetch workflow content for editing.');
          }
          const data = await response.json();
          
          setEditedCode(data.content);
          setUploadedFile(data.filename); // Set the filename for future submits
          // setIsEditorVisible(true); // Do not open automatically
          
          // Also, re-parse the content to show the DAG
          handleReparse(data.content);

        } catch (error) {
          message.error(error.message);
        } finally {
        }
      };
      fetchWorkflowContent();
    }
  }, [searchParams, handleReparse]);

  const props = {
    name: 'file',
    multiple: false,
    action: 'http://127.0.0.1:8000/api/parse',
    showUploadList: false,
    onChange(info) {
      const { status, response } = info.file;
      if (status === 'done') {
        message.success(`文件 ${info.file.name} 上传并解析成功。`);
        setPreview(response.preview);
        setEditedCode(response.content);
        setUploadedFile(response.filename);
        // setIsEditorVisible(true); // Do not open automatically
      } else if (status === 'error') {
        message.error(`文件 ${info.file.name} 上传失败。`);
      }
    },
  };

  

  const handleSubmit = async () => {
    if (!uploadedFile) {
      message.warning('请先上传一个文件。');
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
          message.success(result.message || '任务提交成功。');
        }, 0);
      } else {
        const errorMessage = result.detail?.message || result.message || '提交任务执行失败。';
        message.error(errorMessage);
        setExecutionResult(result.detail || result);
      }
    } catch (error) {
      message.error('提交任务时发生错误。');
      setExecutionResult({ stderr: error.toString() });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNodeDoubleClick = useCallback((node) => {
    setEditingNode(node);
    setNodeCommand(node.command);
  }, []);

  const handleNodeEditSave = async () => {
    if (!editingNode) return;

    const taskName = editingNode.name;
    const newCommand = nodeCommand;

    try {
      const response = await fetch('http://127.0.0.1:8000/api/update-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editedCode,
          task_name: taskName,
          new_command: newCommand,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update command.');
      }

      const result = await response.json();
      setEditedCode(result.new_code);
      message.success(`节点 ${taskName} 的命令已更新。`);
      
      // Also re-parse to update the DAG view with the new command
      handleReparse(result.new_code);

    } catch (error) {
      message.error(`更新失败: ${error.message}`);
    } finally {
      setEditingNode(null);
    }
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
                  更新 DAG
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
          <p>命令:</p>
          <TextArea 
              rows={4} 
              value={nodeCommand} 
              onChange={(e) => setNodeCommand(e.target.value)} 
          />
      </Modal>
      <Modal
          title="执行结果"
          open={!!executionResult}
          onCancel={() => setExecutionResult(null)}
          footer={[
              <Button key="back" onClick={() => setExecutionResult(null)}>
                  关闭
              </Button>,
          ]}
      >
          {isExecuting ? <Spin /> : (
              <div>
                  <h4>标准输出:</h4>
                  <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                      {executionResult?.stdout || '(空)'}
                  </pre>
                  <h4>标准错误:</h4>
                  <pre style={{ background: '#fffbe6', color: '#d4380d', padding: '10px', borderRadius: '4px' }}>
                      {executionResult?.stderr || '(空)'}
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
          <Menu.Item key="/" icon={<DashboardOutlined />}>
            <Link to="/">仪表盘</Link>
          </Menu.Item>
          <Menu.Item key="/workflows" icon={<ApartmentOutlined />}>
            <Link to="/workflows">工作流</Link>
          </Menu.Item>
          <Menu.Item key="/upload" icon={<PlusOutlined />}>
            <Link to="/upload">新建工作流</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 16px' }}>
          <Title level={3} style={{ color: 'white', lineHeight: '64px', float: 'left' }}>极简任务调度平台</Title>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflows" element={<Home />} />
            <Route path="/upload" element={<WorkflowEditor />} />
            <Route path="/project/:projectCode/workflow/:workflowCode" element={<WorkflowViewer />} />
            <Route path="/workflow/:workflowName/history" element={<VersionHistory />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

// We need to wrap App with Router to use useLocation hook
function AppWrapper() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <App />
      </Router>
    </ConfigProvider>
  );
}

export default AppWrapper;

// The default export is now the wrapper
// export default App;
