import React from 'react';
import { register } from '@antv/x6-react-shape';
import { ShellIcon } from './ShellIcon';

const TaskNodeComponent = ({ node }) => {
  const data = node.getData();
  const { name, type, command } = data;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        background: 'white',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
        <ShellIcon />
        <span style={{ marginLeft: '8px', fontWeight: 'bold', fontSize: '14px' }}>{name}</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <p style={{ margin: '0', color: '#888', fontSize: '12px' }}>Type: {type}</p>
        <p
          style={{
            margin: '4px 0 0 0',
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: '#333',
          }}
          title={command}
        >
          {command}
        </p>
      </div>
    </div>
  );
};

register({
  shape: 'custom-react-node',
  width: 250,
  height: 100,
  component: TaskNodeComponent,
});
