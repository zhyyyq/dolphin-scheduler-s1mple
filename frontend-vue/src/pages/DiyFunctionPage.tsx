import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, message, Popconfirm, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import api from '../api';

interface DiyFunction {
    functionId: number;
    functionName: string;
    functionContent: string;
}

const DiyFunctionPage: React.FC = () => {
    const [functions, setFunctions] = useState<DiyFunction[]>([]);
    const navigate = useNavigate();

    const fetchFunctions = async () => {
        try {
            const response = await api.get<DiyFunction[]>('/api/diy-functions');
            setFunctions(response);
        } catch (error) {
            message.error('无法加载自定义函数');
        }
    };

    useEffect(() => {
        fetchFunctions();
    }, []);

    const handleEdit = (record: DiyFunction) => {
        navigate(`/functions/edit/${record.functionId}`);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/api/diy-functions/${id}`);
            message.success('删除成功');
            fetchFunctions();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const uploadProps = {
        name: 'file',
        action: '/api/diy-functions/upload',
        headers: {
            // authorization: 'authorization-text',
        },
        showUploadList: false,
        onChange(info: any) {
            if (info.file.status === 'done') {
                message.success(`${info.file.name} 文件上传成功`);
                fetchFunctions();
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} 文件上传失败.`);
            }
        },
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'functionId',
            key: 'functionId',
        },
        {
            title: '函数名称',
            dataIndex: 'functionName',
            key: 'functionName',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <span>
                    <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
                    <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(record.functionId)}>
                        <Button type="link" danger>删除</Button>
                    </Popconfirm>
                </span>
            ),
        },
    ];

    return (
        <div>
            <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} type="primary" style={{ marginBottom: 16 }}>
                    上传 Python 文件新增
                </Button>
            </Upload>
            <Table columns={columns} dataSource={functions} rowKey="functionId" />
        </div>
    );
};

export default DiyFunctionPage;
