import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { App as AntApp, Layout, Menu, ConfigProvider, Typography } from 'antd';
import { DashboardOutlined, ApartmentOutlined, PlusOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import WorkflowViewerPage from './pages/WorkflowViewerPage';
import WorkflowHistoryPage from './pages/WorkflowHistoryPage';

import './App.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">仪表盘</Link>,
    },
    {
      key: '/',
      icon: <ApartmentOutlined />,
      label: <Link to="/">工作流</Link>,
    },
    {
      key: '/workflow/edit',
      icon: <PlusOutlined />,
      label: <Link to="/workflow/edit">新建工作流</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible style={{ background: '#1677ff' }}>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>极简任务调度平台</Title>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/workflow/edit" element={<WorkflowEditorPage />} />
            <Route path="/workflow/edit/:workflow_uuid" element={<WorkflowEditorPage />} />
            <Route path="/workflow/:workflow_uuid/history" element={<WorkflowHistoryPage />} />
            <Route path="/project/:projectCode/workflow/:workflowCode" element={<WorkflowViewerPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const AppWrapper: React.FC = () => (
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#1677ff',
        colorLink: '#1677ff',
        colorLinkHover: '#4096ff',
        colorLinkActive: '#0958d9',
      },
      components: {
        Menu: {
          darkItemBg: '#1677ff',
          darkItemColor: 'rgba(255, 255, 255, 0.85)',
          darkItemHoverColor: '#ffffff',
          darkItemSelectedColor: '#ffffff',
          darkItemSelectedBg: '#096dd9',
        },
      },
    }}
  >
    <Router>
      <AntApp>
        <App />
      </AntApp>
    </Router>
  </ConfigProvider>
);

export default AppWrapper;
