import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, message, Spin, Typography, Card, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../api';

const { Title } = Typography;

const DiyFunctionInstanceDetailPage: React.FC = () => {
    const { runId } = useParams<{ runId: string }>();
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const response = await api.get<any[]>(`/api/tracking/runs/${runId}/events`);
                setEvents(response);
            } catch (error) {
                message.error('无法加载事件详情');
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [runId]);

    const columns = [
        {
            title: '事件名称',
            dataIndex: 'eventName',
            key: 'eventName',
        },
        {
            title: '时间戳',
            dataIndex: 'serverTimestamp',
            key: 'serverTimestamp',
        },
        {
            title: '数据',
            dataIndex: 'data',
            key: 'data',
            render: (data: any) => <pre>{JSON.stringify(data, null, 2)}</pre>,
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/functions/runs')} />
                    <Title level={4} style={{ margin: 0 }}>
                        运行详情: {runId}
                    </Title>
                </Space>
            </div>
            <Spin spinning={loading}>
                <Card>
                    <Table
                        columns={columns}
                        dataSource={events}
                        rowKey="serverTimestamp"
                        pagination={false}
                    />
                </Card>
            </Spin>
        </div>
    );
};

export default DiyFunctionInstanceDetailPage;
