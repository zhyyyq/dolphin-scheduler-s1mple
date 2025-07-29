import React, { useState, useEffect } from 'react';
import { Button, Input, Switch, Modal, DatePicker, Typography, List } from 'antd';
import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';
import dayjs from 'dayjs';
import { CronExpressionParser } from 'cron-parser';

const { RangePicker } = DatePicker;

interface WorkflowToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  workflowSchedule: string;
  onWorkflowScheduleChange: (schedule: string) => void;
  scheduleTimeRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  onScheduleTimeRangeChange: (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null]) => void;
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
  scheduleTimeRange,
  onScheduleTimeRangeChange,
  onShowYaml,
  onSave,
  onAutoLayout,
  onImportYaml,
}) => {
  const [isCronModalVisible, setIsCronModalVisible] = useState(false);
  const [nextRunTimes, setNextRunTimes] = useState<string[]>([]);
  const [cronError, setCronError] = useState<string | null>(null);

  useEffect(() => {
    if (workflowSchedule) {
      try {
        const interval = CronExpressionParser.parse(workflowSchedule);
        const nextTimes = [];
        for (let i = 0; i < 5; i++) {
          nextTimes.push(dayjs(interval.next().toDate()).format('YYYY-MM-DD HH:mm:ss'));
        }
        setNextRunTimes(nextTimes);
        setCronError(null);
      } catch (err) {
        setCronError('Cron 表达式格式错误');
        setNextRunTimes([]);
      }
    }
  }, [workflowSchedule]);
  console.log('WorkflowToolbar rendered');
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
            style={{ width: '150px', marginRight: '8px' }}
            disabled={!isScheduleEnabled}
            readOnly
          />
          <Button onClick={() => setIsCronModalVisible(true)} disabled={!isScheduleEnabled}>编辑</Button>
          <Switch style={{ marginLeft: '8px' }} checked={isScheduleEnabled} onChange={onIsScheduleEnabledChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '8px', fontWeight: '500', width: '120px' }}>起止时间:</span>
          <RangePicker
            showTime
            style={{ width: '350px' }}
            value={scheduleTimeRange}
            onChange={(dates) => {
              console.log('Selected dates:', dates);
              onScheduleTimeRangeChange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null]);
            }}
            disabled={!isScheduleEnabled}
          />
        </div>
      </div>
      <Modal
        title="定时配置"
        open={isCronModalVisible}
        onCancel={() => setIsCronModalVisible(false)}
        footer={null}
        width={650}
      >
        <Cron
          value={workflowSchedule}
          setValue={onWorkflowScheduleChange}
        />
        <div style={{ marginTop: '20px' }}>
          <Typography.Title level={5}>接下来五次执行时间</Typography.Title>
          {cronError ? (
            <Typography.Text type="danger">{cronError}</Typography.Text>
          ) : (
            <List
              bordered
              dataSource={nextRunTimes}
              renderItem={item => <List.Item>{item}</List.Item>}
            />
          )}
        </div>
      </Modal>
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
