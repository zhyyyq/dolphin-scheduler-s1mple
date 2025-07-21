import { register } from '@antv/x6-react-shape';
import React from 'react';
import { Node } from '@antv/x6';
import { taskTypes } from '../config/taskTypes';
import { QuestionCircleOutlined } from '@ant-design/icons';

const TaskNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData();
  const { label, type } = data;

  const taskConfig = taskTypes.find(t => t.type.toUpperCase() === type?.toUpperCase() || (type === 'SUB_PROCESS' && t.type === 'SubWorkflow'));
  const IconComponent = taskConfig?.icon || QuestionCircleOutlined;

  return (
    <div className={`task-node ${type}`}>
      <span className="icon"><IconComponent /></span>
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
