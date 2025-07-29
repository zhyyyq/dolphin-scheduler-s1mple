import React, { useState, useEffect } from 'react';
import { Table, Button, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const DiyFunctionInstancesPage: React.FC = () => {
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchRuns = async () => {
        setLoading(true);
        try {
            const response = await api.get<any[]>('/api/tracking/runs');
            setRuns(response);
        } catch (error) {
            message.error('无法加载运行实例');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRuns();
    }, []);

    const columns = [
        {
            title: '运行 ID',
            dataIndex: 'runId',
            key: 'runId',
        },
        {
            title: '函数名称',
            dataIndex: 'functionName',
            key: 'functionName',
        },
        {
            title: '开始时间',
            dataIndex: 'startTime',
            key: 'startTime',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                let color = 'default';
                if (status === 'RUNNING') color = 'processing';
                if (status === 'SUCCESS') color = 'success';
                if (status === 'FAILURE') color = 'error';
                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <Button type="link" onClick={() => navigate(`/functions/runs/${record.runId}`)}>
                    查看详情
                </Button>
            ),
        },
    ];

    return (
        <div>
            <Button onClick={fetchRuns} style={{ marginBottom: 16 }}>
                刷新
            </Button>
            <Table
                columns={columns}
                dataSource={runs}
                rowKey="runId"
                loading={loading}
            />
        </div>
    );
};

export default DiyFunctionInstancesPage;
