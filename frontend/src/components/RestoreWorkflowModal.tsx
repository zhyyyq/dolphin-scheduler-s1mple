import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Table, Button, Spin, Alert, App as AntApp, Space, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism.css';
import api from '../api';

interface DeletedWorkflow {
  path: string;
  commit: string;
  message: string;
  name: string;
  filename: string;
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingContent, setViewingContent] = useState('');
  const [viewingTitle, setViewingTitle] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDeletedWorkflows = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DeletedWorkflow[]>('/api/workflow/deleted');
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

  const filteredWorkflows = useMemo(() => {
    if (!searchTerm) {
      return deletedWorkflows;
    }
    return deletedWorkflows.filter(wf =>
      wf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wf.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deletedWorkflows, searchTerm]);

  const handleRestore = async (record: DeletedWorkflow) => {
    try {
      await api.post('/api/workflow/restore', {
        path: record.path,
        commit: record.commit,
      });
      message.success(`工作流 ${record.name} 已成功恢复。`);
      onRestored();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(`恢复失败: ${errorMessage}`);
    }
  };

  const handleView = async (record: DeletedWorkflow) => {
    setViewingTitle(`查看: ${record.name} (${record.filename})`);
    setIsViewModalOpen(true);
    setViewLoading(true);
    try {
      const response = await api.get<{ content: string }>(`/api/workflow/content/${record.commit_hash}/${record.filename}`);
      const highlightedContent = Prism.highlight(response.content, Prism.languages.yaml, 'yaml');
      setViewingContent(highlightedContent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setViewingContent(`<pre><code>Error loading content: ${errorMessage}</code></pre>`);
    } finally {
      setViewLoading(false);
    }
  };

  const columns: ColumnsType<DeletedWorkflow> = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: '删除于 (Commit)',
      dataIndex: 'commit',
      key: 'commit',
      render: (hash: string) => <code>{hash ? hash.substring(0, 7) : 'N/A'}</code>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button onClick={() => handleView(record)}>查看</Button>
          <Button type="primary" onClick={() => handleRestore(record)}>
            恢复
          </Button>
        </Space>
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
      <Input.Search
        placeholder="按名称或文件名搜索"
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      {loading ? (
        <Spin />
      ) : error ? (
        <Alert message="加载失败" description={error} type="error" />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredWorkflows}
          rowKey="filename"
          pagination={{ pageSize: 5 }}
        />
      )}
      <Modal
        title={viewingTitle}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={null}
        width="80vw"
      >
        {viewLoading ? <Spin /> : (
          <pre style={{ background: '#f5f5f5', padding: '16px', maxHeight: '70vh', overflow: 'auto' }}>
            <code dangerouslySetInnerHTML={{ __html: viewingContent }} />
          </pre>
        )}
      </Modal>
    </Modal>
  );
};

export default RestoreWorkflowModal;
