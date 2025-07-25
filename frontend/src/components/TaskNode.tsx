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
    if (metadata.ports) {
      return metadata;
    }
    
    // Default ports for nodes that don't have them defined
    return {
      ...metadata,
      ports: {
        groups: {
          top: {
            position: 'top',
            attrs: {
              circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' },
              text: { fill: '#666', fontSize: 12, y: -15 }, // Adjust y for offset
            },
            label: {
              position: {
                name: 'outside',
                args: { y: -6, x: 18 },
              },
            },
          },
          bottom: {
            position: 'bottom',
            attrs: {
              circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' },
              text: { fill: '#666', fontSize: 12 },
            },
            label: {
              position: {
                name: 'outside',
                args: { y: 6, x: 18 },
              },
            },
          },
        },
        items: [
          { group: 'top', id: 'in', attrs: { text: { text: 'in' } } },
          { group: 'bottom', id: 'out', attrs: { text: { text: 'out' } } },
        ],
      },
    };
  },
});
