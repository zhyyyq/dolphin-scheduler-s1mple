import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, Button, Spin, Alert, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '../api';

interface DeletedWorkflow {
  filename: string;
  commit_hash: string;
}

interface RestoreWorkflowModalProps {
  open: boolean;
  onCancel: () => void;
  onRestored: () => void;
}

const RestoreWorkflowModal: React.FC<RestoreWorkflowModalProps> = ({ open, onCancel, onRestored }) => {
  const { message } = AntApp.useApp();
  const [deletedWorkflows, setDeletedWorkflows] = useState<DeletedWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeletedWorkflows = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DeletedWorkflow[]>('/api/workflows/deleted');
      setDeletedWorkflows(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    fetchDeletedWorkflows();
  }, [fetchDeletedWorkflows]);

  const handleRestore = async (record: DeletedWorkflow) => {
    try {
      await api.post('/api/workflow/restore', {
        filename: record.filename,
        commit_hash: record.commit_hash,
      });
      message.success(`工作流 ${record.filename} 已成功恢复。`);
      onRestored();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(`恢复失败: ${errorMessage}`);
    }
  };

  const columns: ColumnsType<DeletedWorkflow> = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: '删除于 (Commit)',
      dataIndex: 'commit_hash',
      key: 'commit_hash',
      render: (hash: string) => <code>{hash.substring(0, 7)}</code>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" onClick={() => handleRestore(record)}>
          恢复
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="恢复已删除的工作流"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {loading ? (
        <Spin />
      ) : error ? (
        <Alert message="加载失败" description={error} type="error" />
      ) : (
        <Table
          columns={columns}
          dataSource={deletedWorkflows}
          rowKey="filename"
          pagination={false}
        />
      )}
    </Modal>
  );
};

export default RestoreWorkflowModal;
