import React from 'react';
import { Button, Input, Switch } from 'antd';

interface WorkflowToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  workflowSchedule: string;
  onWorkflowScheduleChange: (schedule: string) => void;
  isScheduleEnabled: boolean;
  onIsScheduleEnabledChange: (enabled: boolean) => void;
  onShowYaml: () => void;
  onSave: () => void;
  onAutoLayout: () => void;
  onImportYaml: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  workflowName,
  onWorkflowNameChange,
  workflowSchedule,
  onWorkflowScheduleChange,
  isScheduleEnabled,
  onIsScheduleEnabledChange,
  onShowYaml,
  onSave,
  onAutoLayout,
  onImportYaml,
}) => {
  return (
    <>
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '8px', fontWeight: '500', width: '120px' }}>工作流名称:</span>
          <Input value={workflowName} onChange={e => onWorkflowNameChange(e.target.value)} style={{ width: '200px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '8px', fontWeight: '500', width: '120px' }}>定时设置 (Cron):</span>
          <Input
            value={workflowSchedule}
            onChange={e => onWorkflowScheduleChange(e.target.value)}
            style={{ width: '200px', marginRight: '8px' }}
            disabled={!isScheduleEnabled}
          />
          <Switch checked={isScheduleEnabled} onChange={onIsScheduleEnabledChange} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '8px' }}>
        <Button onClick={() => document.getElementById('yaml-importer')?.click()}>
          导入 YAML
        </Button>
        <input
          type="file"
          id="yaml-importer"
          style={{ display: 'none' }}
          accept=".yaml,.yml"
          onChange={onImportYaml}
        />
        <Button onClick={onAutoLayout}>自动布局</Button>
        <Button onClick={onShowYaml}>查看 YAML</Button>
        <Button type="primary" onClick={onSave}>保存工作流</Button>
      </div>
    </>
  );
};
