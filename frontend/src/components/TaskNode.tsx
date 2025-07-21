import { register } from '@antv/x6-react-shape';
import { ShellIcon } from './ShellIcon';
import React from 'react';
import { Node } from '@antv/x6';

// A simple mapping for task types to icons.
// In a real app, you'd have different icons for each task.
const taskIcons: { [key: string]: React.ReactNode } = {
  SHELL: <ShellIcon />,
  SQL: <ShellIcon />,
  PYTHON: <ShellIcon />,
  HTTP: <ShellIcon />,
  SUB_PROCESS: <ShellIcon />,
  SWITCH: <ShellIcon />,
  CONDITIONS: <ShellIcon />,
  DEPENDENT: <ShellIcon />,
  SPARK: <ShellIcon />,
  FLINK: <ShellIcon />,
  MR: <ShellIcon />,
  PROCEDURE: <ShellIcon />,
  K8S: <ShellIcon />,
  DATAX: <ShellIcon />,
  SAGEMAKER: <ShellIcon />,
  MLFLOW: <ShellIcon />,
  OPENMLDB: <ShellIcon />,
  PYTORCH: <ShellIcon />,
  DVC: <ShellIcon />,
};

// The component that will be rendered
const TaskNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData();
  const { label, taskType } = data;

  return (
    <div className={`task-node ${taskType}`}>
      <span className="icon">
        {taskIcons[taskType] || <ShellIcon />}
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
          circle: {
            r: 4,
            magnet: true,
            stroke: '#5F95FF',
            strokeWidth: 1,
            fill: '#fff',
            style: {
              visibility: 'hidden',
            },
          },
        },
      },
      right: {
        position: 'right',
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: '#5F95FF',
            strokeWidth: 1,
            fill: '#fff',
            style: {
              visibility: 'hidden',
            },
          },
        },
      },
      bottom: {
        position: 'bottom',
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: '#5F95FF',
            strokeWidth: 1,
            fill: '#fff',
            style: {
              visibility: 'hidden',
            },
          },
        },
      },
      left: {
        position: 'left',
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: '#5F95FF',
            strokeWidth: 1,
            fill: '#fff',
            style: {
              visibility: 'hidden',
            },
          },
        },
      },
    },
    items: [
      {
        group: 'top',
      },
      {
        group: 'right',
      },
      {
        group: 'bottom',
      },
      {
        group: 'left',
      },
    ],
  },
});
