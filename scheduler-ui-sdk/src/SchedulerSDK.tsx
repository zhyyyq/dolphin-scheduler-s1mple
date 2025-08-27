
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import SchedulerEditor from './components/SchedulerEditor';
import { Provider } from 'react-redux';
import { store } from './store';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './index.css'
import api from './api';
import { WorkflowData } from './store/slices/workflowEditorSlice';
import { Workflow } from './types';
import WelcomePage from './components/Welcome';
import DashboardPage from './components/Dashboard';
import MaintainPage from './components/Maintain';
import HomePage from './components/Manage';
import DiyFunctionPage from './components/DiyFunction';
import WorkflowHistoryPage from './components/WorkflowHistory';
import PythonEditorPage from './components/PythonEditor';
import WorkflowInstanceDetailPage from './components/InstanceDetail';


class SchedulerInstanceDetailComponent extends HTMLElement {
  static component_name = 'scheduler-instance-detail'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <WorkflowInstanceDetailPage projectCode={this.getAttribute("projectCode") || ''} instanceId={this.getAttribute("instanceId") || ''} />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}

class SchedulerEditFunctionComponent extends HTMLElement {
  static component_name = 'scheduler-edit-component'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <PythonEditorPage functionId={this.getAttribute("functionId") || ''} />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}

class SchedulerWorkflowHistoryComponent extends HTMLElement {
  static component_name = 'scheduler-workflow-history'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <WorkflowHistoryPage workflow_uuid={this.getAttribute("workflow_id") || ''} />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}

class SchedulerFunctionManageComponent extends HTMLElement {
  static component_name = 'scheduler-function-manage'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <DiyFunctionPage />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}

class SchedulerManageComponent extends HTMLElement {
  static component_name = 'scheduler-manage'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <HomePage />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}


class SchedulerMaintainComponent extends HTMLElement {
  static component_name = 'scheduler-maintain'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <MaintainPage />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}


class SchedulerDashboardComponent extends HTMLElement {
  static component_name = 'scheduler-dashboard'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <DashboardPage />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}


class SchedulerWelcomeComponent extends HTMLElement {
  static component_name = 'scheduler-welcome'
  root: Root | undefined;
  connectedCallback() {
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <WelcomePage />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}


class SchedulerEditorComponent extends HTMLElement {
  static component_name = 'scheduler-editor'
  root: Root | undefined;
  connectedCallback() {
    const workflow_id = this.getAttribute("workflow_id");
    const projectCode = this.getAttribute("projectCode");
    const projectName = this.getAttribute("projectName");
    const modal_mode = this.parentElement == document.body;
    const root = createRoot(this);
    root.render(<React.StrictMode>
      <Provider store={store}>
        <ConfigProvider>
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
            <AntApp style={{flex: 1}}>
              <SchedulerEditor modal_mode={modal_mode} workflow_id={workflow_id} projectCode={projectCode ? parseInt(projectCode) : null} projectName={projectName} />
            </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
    this.root = root;
  }
  disconnectedCallback() {
    this.root?.unmount()
  }
  
}

export class SchedulerSDK {
  api_endpoint: string;
  vs_url: string;
  constructor(api_endpoint?: string, vs_url?: string) {
    this.api_endpoint = api_endpoint || 'http://localhost:8000';
    this.vs_url = vs_url || 'http://localhost:5173/vs'
    window.schedulerSdk = this;
    this.init();
  }
  init() {
    // 注册组件
    customElements.define(SchedulerEditorComponent.component_name, SchedulerEditorComponent); // 定义自定义元素名称和类名关联起来
    customElements.define(SchedulerWelcomeComponent.component_name, SchedulerWelcomeComponent); // 定义自定义元素名称和类名关联起来
    customElements.define(SchedulerDashboardComponent.component_name, SchedulerDashboardComponent); // 定义自定义元素名称和类名关联起来
    customElements.define(SchedulerMaintainComponent.component_name, SchedulerMaintainComponent);
    customElements.define(SchedulerManageComponent.component_name, SchedulerManageComponent);
    customElements.define(SchedulerFunctionManageComponent.component_name, SchedulerFunctionManageComponent);
    customElements.define(SchedulerWorkflowHistoryComponent.component_name, SchedulerWorkflowHistoryComponent);
    customElements.define(SchedulerEditFunctionComponent.component_name, SchedulerEditFunctionComponent);
    customElements.define(SchedulerInstanceDetailComponent.component_name, SchedulerInstanceDetailComponent);
  }
  async create_or_modify_workflow(workflow_id?: string, mount_ref?: HTMLElement | null, projectCode?: string, projectName?: string) {
    // 低代码形式
    // 创建组件
    console.log(workflow_id);
    const editor = document.createElement(SchedulerEditorComponent.component_name);
    workflow_id && editor.setAttribute("workflow_id", workflow_id);
    projectCode && editor.setAttribute("projectCode", projectCode);
    projectName && editor.setAttribute("projectName", projectName);
    // 挂载组件
    if (mount_ref) {
      mount_ref.append(editor);
      editor.style = "display:flex; width: 100%; height: 100%; flex-direction: column"
    } else {
      document.body.append(editor);
    }
    // 注册事件
    const result = await new Promise((res) => {
      editor.addEventListener("workflow_edit_end", (data) => {
        res(data)
      })
    })
    // 结果
    console.log(result);
    // 卸载组件
    if (mount_ref) {
      mount_ref.removeChild(editor);
    } else {
      document.body.removeChild(editor);
    }
    return result;
  }
  async get_workflow_info(workflow_id: number) {
    // 获取工作流配置
    const response = await api.get<WorkflowData>(`/api/workflow/${workflow_id}`);
    return response;
  }
  async get_projects() {
    // 查询项目组
    const projects = await api.get(`/api/projects`);
    return projects;
  }
  async get_workflows() {
    // 查询工作流列表
    const res = await api.get<Workflow[]>(`/api/workflow/combined`);
    return res;
  }
  async change_route(target: string) {
    console.log("change route " + target);
  }

  async check_workflow_changes(workflow_id: string) {
    // 低代码形式
    // 创建组件
    const editor = document.createElement(SchedulerWorkflowHistoryComponent.component_name);
    workflow_id && editor.setAttribute("workflow_id", workflow_id);
    // 挂载组件
    document.body.append(editor);
    // 注册事件
    const result = await new Promise((res) => {
      editor.addEventListener("check_workflow_changes_end", (data) => {
        res(data)
      })
    })
    // 结果
    console.log(result);
    // 卸载组件
    document.body.removeChild(editor);
    
    return result;
  }

  async edit_diy_function(function_id: string) {
    // 低代码形式
    // 创建组件
    const editor = document.createElement(SchedulerEditFunctionComponent.component_name);
    function_id && editor.setAttribute("functionId", function_id);
    // 挂载组件
    document.body.append(editor);
    // 注册事件
    const result = await new Promise((res) => {
      editor.addEventListener("edit_function_end", (data) => {
        res(data)
      })
    })
    // 结果
    console.log(result);
    // 卸载组件
    document.body.removeChild(editor);
    
    return result;
  }

  async check_instance_detail(projectCode: string, instanceId: string) {
    // 低代码形式
    // 创建组件
    const editor = document.createElement(SchedulerInstanceDetailComponent.component_name);
    projectCode && editor.setAttribute("projectCode", projectCode);
    instanceId && editor.setAttribute("instanceId", instanceId);
    // 挂载组件
    document.body.append(editor);
    // 注册事件
    const result = await new Promise((res) => {
      editor.addEventListener("check_instance_detail_end", (data) => {
        res(data)
      })
    })
    // 结果
    console.log(result);
    // 卸载组件
    document.body.removeChild(editor);
    
    return result;
  }
} 
