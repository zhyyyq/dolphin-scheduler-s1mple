import React from 'react';
import { Menu } from 'antd';
import { taskCategories, taskTypes } from '../config/taskTypes';

interface WorkflowContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onMenuClick: (e: { key: string }) => void;
}

export const WorkflowContextMenu: React.FC<WorkflowContextMenuProps> = ({
  visible,
  x,
  y,
  onMenuClick,
}) => {
  if (!visible) return null;

  const menuItems = taskCategories.map(category => ({
    key: category.key,
    label: category.label,
    children: taskTypes
      .filter(task => task.category === category.key)
      .map(task => ({
        key: task.type,
        label: task.label,
      })),
  }));

  // Manually add the "Add Parameter" option to the "General" category
  const generalCategory = menuItems.find(item => item.key === 'general');
  if (generalCategory) {
    generalCategory.children.unshift({
      key: 'ADD_PARAM',
      label: '参数',
    });
  }

  return (
    <div style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}>
      <Menu
        onClick={onMenuClick}
        items={menuItems}
        mode="vertical"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: '4px' }}
      />
    </div>
  );
};
