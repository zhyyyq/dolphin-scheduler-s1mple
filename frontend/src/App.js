import React, { useState } from 'react';
import { Upload, Button, Layout, Row, Col, Card, message, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import './App.css';

const { Header, Content } = Layout;
const { Dragger } = Upload;
const { Title, Text } = Typography;

function App() {
  const [fileList, setFileList] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const props = {
    name: 'file',
    multiple: false,
    action: 'http://127.0.0.1:8000/api/parse',
    onChange(info) {
      const { status, response } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} file uploaded and parsed successfully.`);
        setPreview(response.preview);
        setUploadedFile(response.filename);
      } else if (status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
      setFileList([info.file]);
    },
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      message.warning('Please upload and parse a file first.');
      return;
    }
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: uploadedFile }),
      });

      if (response.ok) {
        const result = await response.json();
        message.success(result.message);
      } else {
        message.error('Failed to submit task for execution.');
      }
    } catch (error) {
      message.error('An error occurred while submitting the task.');
      console.error('Submit error:', error);
    }
  };

  return (
    <Layout className="layout">
      <Header>
        <Title level={3} style={{ color: 'white', lineHeight: '64px' }}>极简任务调度平台</Title>
      </Header>
      <Content style={{ padding: '20px 50px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card title="上传任务文件">
              <Dragger {...props} fileList={fileList} height={400}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">请上传你的任务配置文件</p>
                <p className="ant-upload-hint">
                  支持拖拽或点击上传
                </p>
              </Dragger>
            </Card>
          </Col>
          <Col span={16}>
            <Card title="任务解析预览">
              <div style={{ height: 400, background: '#f0f2f5', padding: '16px', overflowY: 'auto' }}>
                {preview ? (
                  <div>
                    <Title level={5}>任务依赖 (DAG)</Title>
                    <div style={{ border: '1px solid #d9d9d9', padding: '10px', borderRadius: '4px', background: 'white' }}>
                      <img src={preview.dag_image_url} alt="DAG Preview" style={{ maxWidth: '100%' }}/>
                    </div>
                    <Title level={5} style={{marginTop: '20px'}}>调度信息</Title>
                     <div style={{ border: '1px solid #d9d9d9', padding: '10px', borderRadius: '4px', background: 'white' }}>
                        <p><Text strong>时间范围:</Text> {preview.schedule}</p>
                        <p><Text strong>Crontab:</Text> {preview.crontab}</p>
                     </div>
                  </div>
                ) : (
                  <div style={{textAlign: 'center', paddingTop: '150px'}}>
                    <Text type="secondary">等待上传文件以生成预览</Text>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
        <Row>
            <Col span={24} style={{textAlign: 'right', marginTop: '20px'}}>
                <Button type="primary" size="large" onClick={handleSubmit}>提交</Button>
            </Col>
        </Row>
      </Content>
    </Layout>
  );
}

export default App;
