import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Spin } from 'antd';
import api from '@/api';

interface LogViewerProps {
  visible: boolean;
  onClose: () => void;
  taskInstanceId: number | null;
}

const LogViewer: React.FC<LogViewerProps> = ({ visible, onClose, taskInstanceId }) => {
  const [logContent, setLogContent] = useState<string>('');
  const [logLoading, setLogLoading] = useState<boolean>(false);

  const fetchLog = useCallback(async () => {
    if (!taskInstanceId) return;
    setLogLoading(true);
    try {
      const logData = await api.get<string>(`/api/ds/log/${taskInstanceId}`);
      const formattedLog = logData.replace(/\\r\\n/g, '\n');
      setLogContent(formattedLog);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setLogContent(`无法加载日志: ${errorMessage}`);
    } finally {
      setLogLoading(false);
    }
  }, [taskInstanceId]);

  useEffect(() => {
    if (visible) {
      fetchLog();
    }
  }, [visible, fetchLog]);

  return (
    <Modal
      title="查看日志"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width="80%"
    >
      <Spin spinning={logLoading}>
        <pre style={{ background: '#f5f5f5', padding: '10px', maxHeight: '60vh', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <code>{logContent}</code>
        </pre>
      </Spin>
    </Modal>
  );
};

export default LogViewer;
