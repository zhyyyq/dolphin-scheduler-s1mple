import React from 'react';
import { Card, Row, Col, Typography, Button, Divider } from 'antd';
import { ApartmentOutlined, PlusOutlined, UploadOutlined, HistoryOutlined, CodeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; link: string; buttonText: string }> = ({ icon, title, description, link, buttonText }) => (
  <Col xs={24} sm={12} md={6}>
    <Card hoverable style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', color: '#1677ff', marginBottom: '20px' }}>{icon}</div>
      <div style={{ flexGrow: 1 }}>
        <Title level={4}>{title}</Title>
        <Paragraph>{description}</Paragraph>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'auto' }}>
        <Link to={link}>
          <Button type="primary">{buttonText}</Button>
        </Link>
      </div>
    </Card>
  </Col>
);

const WelcomePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: '#f0f2f5' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2}>欢迎使用极简任务调度平台</Title>
        <Paragraph style={{ fontSize: '16px', color: '#595959', maxWidth: '600px' }}>
          一个强大而易于使用的平台，可帮助您通过可视化的方式，轻松构建、调度和管理复杂的数据工作流。
        </Paragraph>
      </div>

      <Row gutter={[32, 32]} style={{ maxWidth: '1200px', width: '100%' }}>
        <FeatureCard
          icon={<ApartmentOutlined />}
          title="可视化工作流"
          description="通过拖拽节点和连线，轻松构建、编辑和管理您的工作流。直观的 DAG 编辑器让复杂依赖关系一目了然。"
          link="/workflows"
          buttonText="管理工作流"
        />
        <FeatureCard
          icon={<CodeOutlined />}
          title="自定义组件"
          description="使用 Python 创建您自己的可重用组件，封装业务逻辑，扩展平台功能，实现更高程度的复用。"
          link="/functions"
          buttonText="管理组件"
        />
        <FeatureCard
          icon={<PlusOutlined />}
          title="新建工作流"
          description="没有比现在更好的时机了！立即开始构建您的第一个工作流，体验流程自动化的魅力。"
          link="/workflow/edit"
          buttonText="立即新建"
        />
        <FeatureCard
          icon={<HistoryOutlined />}
          title="查看运行实例"
          description="查看您或其他团队成员已经执行过的任务，了解平台的实际运行情况。"
          link="/dashboard"
          buttonText="查看运行实例"
        />
      </Row>
    </div>
  );
};

export default WelcomePage;
