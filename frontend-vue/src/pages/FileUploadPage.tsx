import React, { useState, useEffect } from 'react';
import { Upload, Button, message, Table, Tag, Space } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api from '../api';

interface ResourceFile {
  filename: string;
  size: number;
  last_modified: number;
}

const FileUploadPage: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [resourceFiles, setResourceFiles] = useState<ResourceFile[]>([]);

  const fetchResourceFiles = async () => {
    try {
      const files = await api.get<ResourceFile[]>('/api/files/list');
      setResourceFiles(files);
    } catch (error) {
      message.error('获取资源文件列表失败。');
    }
  };

  useEffect(() => {
    fetchResourceFiles();
  }, []);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要上传的文件。');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('file', file as any);
    });

    try {
      const response = await api.post<{ filename: string, path: string }>('/api/files/upload', formData);
      setFileList([]);
      message.success(`文件 '${response.filename}' 上传成功。`);
      fetchResourceFiles(); // Refresh the list
    } catch (error) {
      message.error('文件上传失败。');
    } finally {
      setUploading(false);
    }
  };

  const props = {
    onRemove: (file: UploadFile) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file: UploadFile) => {
      setFileList([...fileList, file]);
      return false;
    },
    fileList,
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: '上传时间',
      dataIndex: 'last_modified',
      key: 'last_modified',
      render: (ts: number) => new Date(ts * 1000).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ResourceFile) => (
        <Button
          icon={<DownloadOutlined />}
          onClick={() => window.open(`http://localhost:8000/api/files/download/${record.filename}`)}
        >
          下载
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>上传资源文件</h1>
      <p>在这里上传您在工作流中通过 <code>$FILE{'{...}'}</code> 引用的文件（如 SQL 脚本）。</p>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Upload {...props}>
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
        <Button
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0}
          loading={uploading}
        >
          {uploading ? '上传中...' : '开始上传'}
        </Button>
        <Table columns={columns} dataSource={resourceFiles} rowKey="filename" />
      </Space>
    </div>
  );
};

export default FileUploadPage;
