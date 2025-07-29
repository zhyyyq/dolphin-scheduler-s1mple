import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, message, Tag, Input, Space, DatePicker, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import dayjs from 'dayjs';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_OPTIONS = ['SUCCESS', 'FAILURE', 'RUNNING'];

const DiyFunctionInstancesPage: React.FC = () => {
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
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

    const uniqueWorkflows = useMemo(() => {
        const workflowNames = new Set(runs.map(run => run.workflowName).filter(Boolean));
        return Array.from(workflowNames);
    }, [runs]);

    const filteredRuns = useMemo(() => {
        return runs.filter(run => {
            const isMatchSearchText = searchText ? run.functionName?.toLowerCase().includes(searchText.toLowerCase()) : true;
            
            const runDate = dayjs(run.startTime);
            const isMatchDateRange = dateRange ? runDate.isAfter(dateRange[0]) && runDate.isBefore(dateRange[1]) : true;

            const isMatchWorkflow = selectedWorkflow ? run.workflowName === selectedWorkflow : true;
            
            const isMatchStatus = selectedStatus ? run.status === selectedStatus : true;

            return isMatchSearchText && isMatchDateRange && isMatchWorkflow && isMatchStatus;
        });
    }, [runs, searchText, dateRange, selectedWorkflow, selectedStatus]);

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
            <Space style={{ marginBottom: 16 }} wrap>
                <Button onClick={fetchRuns}>
                    刷新
                </Button>
                <Search
                    placeholder="按函数名称搜索"
                    onSearch={setSearchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 200 }}
                    allowClear
                />
                <RangePicker onChange={(dates) => setDateRange(dates as any)} />
                <Select
                    placeholder="按工作流筛选"
                    style={{ width: 200 }}
                    onChange={setSelectedWorkflow}
                    allowClear
                >
                    {uniqueWorkflows.map(wf => <Option key={wf} value={wf}>{wf}</Option>)}
                </Select>
                <Select
                    placeholder="按状态筛选"
                    style={{ width: 120 }}
                    onChange={setSelectedStatus}
                    allowClear
                >
                    {STATUS_OPTIONS.map(status => <Option key={status} value={status}>{status}</Option>)}
                </Select>
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
