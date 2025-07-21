import { register } from '@antv/x6-react-shape';
import { ShellIcon } from './ShellIcon';
import React from 'react';
import { Node } from '@antv/x6';

// A simple mapping for task types to icons.
// In a real app, you'd have different icons for each task.
const taskIcons: { [key: string]: React.ReactNode } = {
  SHELL: <div className="task-icon-text">Shell</div>,
  SQL: <div className="task-icon-text">SQL</div>,
  PYTHON: <div className="task-icon-text">Py</div>,
  HTTP: <div className="task-icon-text">Http</div>,
  SUB_PROCESS: <div className="task-icon-text">Sub</div>,
  SWITCH: <div className="task-icon-text">Sw</div>,
  CONDITIONS: <div className="task-icon-text">Cond</div>,
  DEPENDENT: <div className="task-icon-text">Dep</div>,
  SPARK: <div className="task-icon-text">Spark</div>,
  FLINK: <div className="task-icon-text">Flink</div>,
  MR: <div className="task-icon-text">MR</div>,
  PROCEDURE: <div className="task-icon-text">Proc</div>,
  K8S: <div className="task-icon-text">K8s</div>,
  DATAX: <div className="task-icon-text">DataX</div>,
  SAGEMAKER: <div className="task-icon-text">Sage</div>,
  MLFLOW: <div className="task-icon-text">ML</div>,
  OPENMLDB: <div className="task-icon-text">DB</div>,
  PYTORCH: <div className="task-icon-text">Torch</div>,
  DVC: <div className="task-icon-text">DVC</div>,
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
