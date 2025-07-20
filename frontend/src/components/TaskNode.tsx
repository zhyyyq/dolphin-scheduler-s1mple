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
});
