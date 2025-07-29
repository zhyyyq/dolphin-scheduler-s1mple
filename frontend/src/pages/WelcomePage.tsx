import React from 'react';
import { Card, Row, Col, Typography, Button } from 'antd';
import { ApartmentOutlined, PlusOutlined, UploadOutlined, HistoryOutlined, CodeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const WelcomePage: React.FC = () => {
  return (
    <div style={{ padding: '24px', background: '#f0f2f5' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <Title>欢迎使用极简任务调度平台</Title>
        <Paragraph>
          一个强大而易于使用的平台，可帮助您管理和调度所有数据工作流。
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <ApartmentOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            <Title level={4}>工作流管理</Title>
            <Paragraph>轻松创建、编辑和管理您的工作流。 可视化 DAG 编辑器使复杂的工作流变得简单。</Paragraph>
            <Link to="/workflows">
              <Button type="primary">前往工作流</Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <HistoryOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
            <Title level={4}>任务实例</Title>
            <Paragraph>跟踪和监控所有工作流的运行实例。 查看日志、状态和历史记录。</Paragraph>
            <Link to="/instances">
              <Button type="primary">查看实例</Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <CodeOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <Title level={4}>自定义组件</Title>
            <Paragraph>使用 Python 创建您自己的可重用组件，以扩展平台的功能。</Paragraph>
            <Link to="/functions">
              <Button type="primary">管理组件</Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <PlusOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            <Title level={4}>新建工作流</Title>
            <Paragraph>立即开始构建您的第一个工作流。</Paragraph>
            <Link to="/workflow/edit">
              <Button type="primary">新建</Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <UploadOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
            <Title level={4}>上传资源</Title>
            <Paragraph>上传和管理您的脚本、jar 和其他工作流所需的资源文件。</Paragraph>
            <Link to="/upload">
              <Button type="primary">上传</Button>
            </Link>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WelcomePage;
