import { register } from '@antv/x6-react-shape';
import { ShellIcon } from './ShellIcon';
import React from 'react';
import { Node } from '@antv/x6';

// The component that will be rendered
const TaskNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData();
  const { label, taskType } = data;

  return (
    <div className={`task-node ${taskType}`}>
      <span className="icon">
        {taskType === 'SHELL' && <ShellIcon />}
      </span>
      <span className="label">{label}</span>
    </div>
  );
};

// Register the custom React node
register({
  shape: 'task-node',
  width: 180,
  height: 36,
  component: TaskNodeComponent,
  ports: {
    groups: {
      top: {
        position: 'top',
        attrs: {
          portBody: {
            magnet: true,
          },
          portDot: {
            fill: '#8f8f8f',
          },
        },
      },
      bottom: {
        position: 'bottom',
        attrs: {
          portBody: {
            magnet: true,
          },
          portDot: {
            fill: '#8f8f8f',
          },
        },
      },
      left: {
        position: 'left',
        attrs: {
          portBody: {
            magnet: true,
          },
          portDot: {
            fill: '#8f8f8f',
          },
        },
      },
      right: {
        position: 'right',
        attrs: {
          portBody: {
            magnet: true,
          },
          portDot: {
            fill: '#8f8f8f',
          },
        },
        allowMulti: true,
      },
    },
  },
  portMarkup: [
    {
      tagName: 'circle',
      selector: 'portBody',
      attrs: {
        r: 10,
        fill: 'transparent',
        stroke: 'none',
      },
    },
    {
      tagName: 'circle',
      selector: 'portDot',
      attrs: {
        r: 5,
        fill: '#8f8f8f',
      },
    },
  ],
});
