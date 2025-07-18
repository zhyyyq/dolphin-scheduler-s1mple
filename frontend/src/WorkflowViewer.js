import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Button, Modal, message } from 'antd';
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
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [workflowCodeContent, setWorkflowCodeContent] = useState('');

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

  const showCodeModal = async () => {
    if (!preview || !preview.name) {
      message.error("无法获取工作流名称。");
      return;
    }
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/workflow/${preview.name}.py/content`);
      if (!response.ok) {
        throw new Error('无法获取工作流代码。');
      }
      const data = await response.json();
      setWorkflowCodeContent(data.content);
      setIsCodeModalVisible(true);
    } catch (err) {
      message.error(err.message);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon style={{ margin: '24px' }} />;
  }

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 130px)' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <Button type="primary" onClick={showCodeModal}>
          查看代码
        </Button>
      </div>
      <DagGraph data={preview} />
      <Modal
        title={`代码: ${preview?.name}`}
        open={isCodeModalVisible}
        onCancel={() => setIsCodeModalVisible(false)}
        width="60%"
        footer={null}
        destroyOnClose
      >
        <Editor
          value={workflowCodeContent}
          onValueChange={() => {}} // Read-only
          highlight={code => highlight(code, languages.python)}
          padding={10}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
            height: '60vh',
            overflow: 'auto',
            border: '1px solid #d9d9d9',
            background: '#f5f5f5'
          }}
          readOnly
        />
      </Modal>
    </div>
  );
}

export default WorkflowViewer;
