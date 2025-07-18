import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Switch, message, Card, Modal, Input } from 'antd';
import { ApartmentOutlined, CodeOutlined } from '@ant-design/icons';
import DagGraph from './DagGraph';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';

function WorkflowViewer() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { projectCode, workflowCode } = useParams();
  
  const [viewMode, setViewMode] = useState('dag'); // 'dag' or 'code'
  const [workflowCodeContent, setWorkflowCodeContent] = useState('');
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [viewingNode, setViewingNode] = useState(null);

  useEffect(() => {
    const fetchWorkflow = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/project/${projectCode}/workflow/${workflowCode}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Failed to fetch workflow details');
        }
        const data = await response.json();
        setPreview(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [projectCode, workflowCode]);

  useEffect(() => {
    const fetchCode = async () => {
      if (viewMode === 'code' && !workflowCodeContent && preview?.name) {
        setIsCodeLoading(true);
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/workflow/${preview.name}.py/content`);
          if (!response.ok) {
            throw new Error('无法获取工作流代码。');
          }
          const data = await response.json();
          setWorkflowCodeContent(data.content);
        } catch (err) {
          message.error(err.message);
        } finally {
          setIsCodeLoading(false);
        }
      }
    };
    fetchCode();
  }, [viewMode, workflowCodeContent, preview]);


  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon style={{ margin: '24px' }} />;
  }

  const handleNodeDoubleClick = useCallback((node) => {
    setViewingNode(node);
  }, []);

  const renderContent = () => {
    if (viewMode === 'code') {
      return (
        <Spin spinning={isCodeLoading}>
          <Editor
            value={workflowCodeContent}
            onValueChange={() => {}} // Read-only
            highlight={code => highlight(code, languages.python)}
            padding={10}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 14,
              height: 'calc(100vh - 200px)',
              overflow: 'auto',
              border: '1px solid #d9d9d9',
              background: '#f5f5f5'
            }}
            readOnly
          />
        </Spin>
      );
    }
    return <DagGraph data={preview} onNodeDoubleClick={handleNodeDoubleClick} />;
  };

  return (
    <>
      <Card
        title={`工作流: ${preview?.name}`}
        extra={
          <Switch
            checkedChildren={<CodeOutlined />}
            unCheckedChildren={<ApartmentOutlined />}
            onChange={(checked) => setViewMode(checked ? 'code' : 'dag')}
          />
        }
        bodyStyle={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
      >
        {renderContent()}
      </Card>
      <Modal
          title={`节点详情: ${viewingNode?.name}`}
          open={!!viewingNode}
          onCancel={() => setViewingNode(null)}
          footer={null}
      >
          <p><strong>类型:</strong> {viewingNode?.type}</p>
          <p><strong>命令:</strong></p>
          <Input.TextArea 
              rows={10} 
              value={viewingNode?.command} 
              readOnly
              style={{ background: '#f5f5f5', cursor: 'text' }}
          />
      </Modal>
    </>
  );
}

export default WorkflowViewer;
