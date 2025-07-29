import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, message, Tag, Input, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Search } = Input;

const DiyFunctionInstancesPage: React.FC = () => {
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
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

    const filteredRuns = useMemo(() => {
        if (!searchText) {
            return runs;
        }
        return runs.filter(run =>
            run.functionName?.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [runs, searchText]);

    const columns = [
        {
            title: '运行 ID',
            dataIndex: 'runId',
            key: 'runId',
        },
        {
            title: '工作流名称',
            dataIndex: 'workflowName',
            key: 'workflowName',
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
        <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
            <Space style={{ marginBottom: 16 }}>
                <Button onClick={fetchRuns}>
                    刷新
                </Button>
                <Search
                    placeholder="按函数名称搜索"
                    onSearch={setSearchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                />
            </Space>
            <Table
                columns={columns}
                dataSource={filteredRuns}
                rowKey="runId"
                loading={loading}
                bordered
            />
        </div>
    );
};

export default DiyFunctionInstancesPage;
