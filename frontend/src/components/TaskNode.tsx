import { register } from '@antv/x6-react-shape';
import React from 'react';
import { Node } from '@antv/x6';
import { taskTypes } from '../config/taskTypes';
import { QuestionCircleOutlined } from '@ant-design/icons';

const TaskNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData();
  const { name, task_type } = data;

  const taskConfig = taskTypes.find(t => t.type.toUpperCase() === task_type?.toUpperCase());
  const IconComponent = taskConfig?.icon || QuestionCircleOutlined;

  return (
    <div className={`task-node ${task_type}`}>
      <span className="icon"><IconComponent /></span>
      <span className="label">{name} ({task_type})</span>
    </div>
  );
};

register({
  shape: 'task-node',
  width: 200, // Revert to a fixed width
  height: 36,
  component: TaskNodeComponent,
  propHooks(metadata: Node.Metadata) {
    const { ports, ...rest } = metadata;
    if (ports) {
      return { ...rest, ports };
    }
    return {
      ...rest,
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
