import React from 'react';
import { Card, Row, Col, Typography, Button, Divider } from 'antd';
import { ApartmentOutlined, PlusOutlined, UploadOutlined, HistoryOutlined, CodeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; link: string; buttonText: string }> = ({ icon, title, description, link, buttonText }) => (
  <Col xs={24} sm={12} md={8}>
    <Card hoverable style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: '48px', color: '#1677ff', textAlign: 'center', marginBottom: '16px' }}>{icon}</div>
      <div style={{ textAlign: 'center', flexGrow: 1 }}>
        <Title level={4}>{title}</Title>
        <Paragraph style={{ minHeight: '60px' }}>{description}</Paragraph>
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
    <div style={{ padding: '24px', background: '#ffffff' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <Title>欢迎使用极简任务调度平台</Title>
        <Paragraph style={{ fontSize: '16px', color: '#595959' }}>
          一个强大而易于使用的平台，可帮助您通过可视化的方式，轻松构建、调度和管理复杂的数据工作流。
        </Paragraph>
      </div>

      <Divider>核心功能</Divider>

      <Row gutter={[24, 24]} style={{ marginBottom: '48px' }}>
        <FeatureCard
          icon={<ApartmentOutlined />}
          title="可视化工作流"
          description="通过拖拽节点和连线，轻松构建、编辑和管理您的工作流。直观的 DAG 编辑器让复杂依赖关系一目了然。"
          link="/workflows"
          buttonText="管理工作流"
        />
        <FeatureCard
          icon={<HistoryOutlined />}
          title="任务实例监控"
          description="实时跟踪和监控所有工作流的运行实例。方便地查看日志、运行状态和历史记录，快速定位问题。"
          link="/instances"
          buttonText="查看实例"
        />
        <FeatureCard
          icon={<CodeOutlined />}
          title="自定义组件"
          description="使用 Python 创建您自己的可重用组件，封装业务逻辑，扩展平台功能，实现更高程度的复用。"
          link="/functions"
          buttonText="管理组件"
        />
      </Row>

      <Divider>快速入门</Divider>

      <Row gutter={[24, 24]}>
        <FeatureCard
          icon={<PlusOutlined />}
          title="新建工作流"
          description="没有比现在更好的时机了！立即开始构建您的第一个工作流，体验流程自动化的魅力。"
          link="/workflow/edit"
          buttonText="立即新建"
        />
        <FeatureCard
          icon={<UploadOutlined />}
          title="上传资源"
          description="集中上传和管理您的脚本、JAR 包和其他工作流所需的资源文件，方便在任务中引用。"
          link="/upload"
          buttonText="上传资源"
        />
        <FeatureCard
          icon={<PlayCircleOutlined />}
          title="查看运行实例"
          description="查看您或其他团队成员已经执行过的任务，了解平台的实际运行情况。"
          link="/instances"
          buttonText="查看运行实例"
        />
      </Row>
    </div>
  );
};

export default WelcomePage;
