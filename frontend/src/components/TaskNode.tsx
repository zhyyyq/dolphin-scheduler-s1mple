import { register } from '@antv/x6-react-shape';
import { ShellIcon } from './ShellIcon';
import React from 'react';
import { Node } from '@antv/x6';

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

const TaskNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData();
  const { label, taskType } = data;

  return (
    <div className={`task-node ${taskType}`}>
      <span className="icon">{taskIcons[taskType] || <ShellIcon />}</span>
      <span className="label">{label}</span>
    </div>
  );
};

register({
  shape: 'task-node',
  width: 180,
  height: 36,
  component: TaskNodeComponent,
  propHooks(metadata: Node.Metadata) {
    // Always apply the default port configuration
    return {
      ...metadata,
      ports: {
        groups: {
          top: { position: 'top', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff', style: { visibility: 'visible' } } } },
          bottom: { position: 'bottom', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff', style: { visibility: 'visible' } } } },
        },
        items: [
          { id: 'top', group: 'top' },
          { id: 'bottom', group: 'bottom' },
        ],
      },
    };
  },
});
