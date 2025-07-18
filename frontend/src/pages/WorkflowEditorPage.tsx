import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, Button, Modal, Switch, Input, Spin, Card, App as AntApp } from 'antd';
import { InboxOutlined, CodeOutlined, ApartmentOutlined } from '@ant-design/icons';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';
import DagGraph from '../components/DagGraph';
import { PreviewData, Task, ExecutionResult } from '../types';

const { Dragger } = Upload;
const { TextArea } = Input;

const WorkflowEditorPage: React.FC = () => {
  const { message } = AntApp.useApp();
  const [searchParams] = useSearchParams();
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [editedCode, setEditedCode] = useState<string>('');
  const [editingNode, setEditingNode] = useState<Task | null>(null);
  const [nodeCommand, setNodeCommand] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [viewMode, setViewMode] = useState<'dag' | 'code'>('dag');

  const handleReparse = useCallback(async (codeToParse: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/reparse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToParse }),
      });
      if (response.ok) {
        const result = await response.json();
        setPreview(result.preview);
      } else {
        message.error('重新解析代码失败。');
      }
    } catch (error) {
      message.error('重新解析时发生错误。');
    }
  }, [message]);

  useEffect(() => {
    const workflowName = searchParams.get('workflowName');
    if (workflowName) {
      const fetchWorkflowContent = async () => {
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/workflow/${workflowName}/content`);
          if (!response.ok) throw new Error('Failed to fetch workflow content for editing.');
          const data = await response.json();
          setEditedCode(data.content);
          setUploadedFile(data.filename);
          handleReparse(data.content);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          message.error(errorMessage);
        }
      };
      fetchWorkflowContent();
    }
  }, [searchParams, handleReparse, message]);

  const handleNodeDoubleClick = useCallback((node: Task) => {
    setEditingNode(node);
    setNodeCommand(node.command);
  }, []);

  const handleNodeEditSave = async () => {
    if (!editingNode) return;
    const taskName = editingNode.name;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/update-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editedCode, task_name: taskName, new_command: nodeCommand }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update command.');
      }
      const result = await response.json();
      setEditedCode(result.new_code);
      message.success(`节点 ${taskName} 的命令已更新。`);
      handleReparse(result.new_code);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(`更新失败: ${errorMessage}`);
    } finally {
      setEditingNode(null);
    }
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
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(`提交任务时发生错误: ${errorMessage}`);
      setExecutionResult({ stdout: '', stderr: errorMessage });
    } finally {
      setIsExecuting(false);
    }
  };

  const renderContent = () => {
    if (!preview) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Dragger
            name="file"
            multiple={false}
            action="http://127.0.0.1:8000/api/parse"
            showUploadList={false}
            onChange={(info) => {
              const { status, response } = info.file;
              if (status === 'done') {
                message.success(`文件 ${info.file.name} 上传并解析成功。`);
                setPreview(response.preview);
                setEditedCode(response.content);
                setUploadedFile(response.filename);
              } else if (status === 'error') {
                message.error(`文件 ${info.file.name} 上传失败。`);
              }
            }}
            style={{ width: '800px', padding: '64px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">请上传你的任务配置文件</p>
            <p className="ant-upload-hint">支持拖拽或点击上传</p>
          </Dragger>
        </div>
      );
    }

    if (viewMode === 'code') {
      return (
        <Editor
          value={editedCode}
          onValueChange={setEditedCode}
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
      );
    }
    return <DagGraph data={preview} onNodeDoubleClick={handleNodeDoubleClick} />;
  };

  return (
    <>
      <Card
        title={uploadedFile ? `工作流: ${uploadedFile}` : "新建工作流"}
        extra={
          preview && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Switch
                checkedChildren={<CodeOutlined />}
                unCheckedChildren={<ApartmentOutlined />}
                checked={viewMode === 'code'}
                onChange={(checked) => setViewMode(checked ? 'code' : 'dag')}
              />
              <Button onClick={() => handleReparse(editedCode)}>更新 DAG</Button>
              <Button type="primary" size="large" onClick={handleSubmit} loading={isExecuting}>提交</Button>
            </div>
          )
        }
        styles={{ body: { height: 'calc(100vh - 220px)', overflow: 'auto' } }}
      >
        {renderContent()}
      </Card>
      
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
};

export default WorkflowEditorPage;
