import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Menu } from 'antd';
import { taskCategories, taskTypes } from '../../../config/taskTypes';
import { RootState, AppDispatch } from '../../../store';
import { handleMenuClick as handleMenuClickThunk } from '../../../store/slices/workflowEditorSlice';

export const WorkflowContextMenu: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    contextMenu: { visible, x, y },
    diyFunctions,
  } = useSelector((state: RootState) => state.workflowEditor);

  const onMenuClick = (e: { key: string }) => {
    dispatch(handleMenuClickThunk(e));
  };
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

  if (diyFunctions.length > 0) {
    menuItems.push({
      key: 'diy',
      label: '自定义组件',
      children: diyFunctions.map(func => ({
        key: `diy-${func.functionName}`, // Use a prefix to identify diy functions
        label: func.functionName,
      })),
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
