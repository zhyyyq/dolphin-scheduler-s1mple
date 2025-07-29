import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Spin, Typography, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Editor, { loader } from '@monaco-editor/react';
import api from '../api';

const { Title } = Typography;

// Configure Monaco Editor to load from a local copy instead of CDN
// This is a workaround for environments where the CDN is not accessible.
// We need to ensure that 'monaco-editor' is copied to the public directory.
loader.config({ paths: { vs: '/vs' } });

const PythonEditorPage: React.FC = () => {
    const { functionId } = useParams<{ functionId: string }>();
    const navigate = useNavigate();
    const [functionName, setFunctionName] = useState('');
    const [code, setCode] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFunction = async () => {
            try {
                const response = await api.get<any>(`/api/diy-functions/${functionId}`);
                setFunctionName(response.functionName);
                setCode(response.functionContent);
            } catch (error) {
                message.error('无法加载函数内容');
            } finally {
                setLoading(false);
            }
        };
        fetchFunction();
    }, [functionId]);

    const handleSave = async () => {
        try {
            await api.put(`/api/diy-functions/${functionId}`, {
                functionName: functionName,
                functionContent: code,
            });
            message.success('保存成功');
            navigate('/functions');
        } catch (error) {
            message.error('保存失败');
        }
    };

    if (loading) {
        return <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 32px)' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: 'white',
                }}
            >
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/functions')} />
                    <Title level={4} style={{ margin: 0 }}>
                        编辑: {functionName}
                    </Title>
                </Space>
                <Button type="primary" onClick={handleSave}>
                    保存
                </Button>
            </div>
            <div style={{ flex: 1 }}>
                <Editor
                    height="100%"
                    language="python"
                    value={code}
                    onChange={(value) => setCode(value)}
                    theme="vs-dark"
                    options={{
                        selectOnLineNumbers: true,
                        automaticLayout: true,
                    }}
                />
            </div>
        </div>
    );
};

export default PythonEditorPage;
