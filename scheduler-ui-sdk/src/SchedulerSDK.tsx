
import { createRoot } from 'react-dom/client';
import React from 'react';
import SchedulerEditor from './components/SchedulerEditor';
import { Provider } from 'react-redux';
import { store } from './store';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './index.css'

class SchedulerSDKComponent extends HTMLElement {
  connectedCallback() {
    const mountPoint = document.createElement('div');
    this.appendChild(mountPoint);
    const root = createRoot(mountPoint!);
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
              <AntApp>
                <SchedulerEditor />
              </AntApp>
          </ConfigProvider>

        </ConfigProvider>
      </Provider>
    </React.StrictMode>);
  }
}

export class SchedulerSDK {
  constructor() {
    this.init();
  } 
  init() {
    customElements.define('scheduler-sdk', SchedulerSDKComponent); // 定义自定义元素名称和类名关联起来
  }

} 
