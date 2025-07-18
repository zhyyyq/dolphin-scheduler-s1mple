import React from 'react';
import { Node } from '@antv/x6';
import { Card, Typography } from 'antd';
import { ShellIcon } from './ShellIcon'; // A simple SVG icon component

const { Title, Text } = Typography;

const TaskNode = ({ node }) => {
  const data = node.getData();
  const { name, type, command } = data;

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShellIcon />
          <Title level={5} style={{ margin: '0 0 0 8px' }}>{name}</Title>
        </div>
      }
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        background: 'white',
      }}
    >
      <Text type="secondary" style={{ fontSize: '12px' }}>Type: {type}</Text>
      <br />
      <Text strong style={{ fontFamily: 'monospace', fontSize: '12px' }}>
        {command}
      </Text>
    </Card>
  );
};

// Register the custom React component with X6
Node.registry.register('custom-react-node', {
  inherit: 'react-shape',
  width: 250,
  height: 100,
  component: <TaskNode />,
});

export default TaskNode;
