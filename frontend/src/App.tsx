import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { App as AntApp, Layout, Menu, ConfigProvider, Typography } from 'antd';
import { DashboardOutlined, ApartmentOutlined, PlusOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import VersionHistoryPage from './pages/VersionHistoryPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import WorkflowViewerPage from './pages/WorkflowViewerPage';

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
      key: '/upload',
      icon: <PlusOutlined />,
      label: <Link to="/upload">新建工作流</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="logo" style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 16px' }}>
          <Title level={3} style={{ color: 'white', lineHeight: '64px', float: 'left' }}>极简任务调度平台</Title>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<WorkflowEditorPage />} />
            <Route path="/project/:projectCode/workflow/:workflowCode" element={<WorkflowViewerPage />} />
            <Route path="/workflow/:workflowName/history" element={<VersionHistoryPage />} />
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
          darkItemColor: '#91caff',
          darkItemHoverColor: '#ffffff',
          darkItemSelectedColor: '#ffffff',
          darkItemSelectedBg: '#1677ff',
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
