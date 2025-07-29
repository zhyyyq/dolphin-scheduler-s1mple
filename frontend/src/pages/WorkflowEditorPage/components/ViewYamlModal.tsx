import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Modal, Button, Input, Tabs } from 'antd';
import { Diff, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import * as diff from 'diff';
import { RootState, AppDispatch } from '../../../store';
import {
  setIsYamlModalVisible,
  setYamlContent,
  syncYamlToGraph,
} from '../../../store/slices/workflowEditorSlice';

export const ViewYamlModal: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    isYamlModalVisible,
    yamlContent,
    originalYaml,
  } = useSelector((state: RootState) => state.workflowEditor);

  const onCancel = () => dispatch(setIsYamlModalVisible(false));
  const onSync = () => dispatch(syncYamlToGraph());
  const onYamlContentChange = (content: string) => dispatch(setYamlContent(content));
  const renderDiff = () => {
    if (!originalYaml) {
      return null;
    }

    if (originalYaml === yamlContent) {
      return <div>无变更</div>;
    }

    const patch = diff.createPatch('workflow.yaml', originalYaml, yamlContent, '', '', { context: 3 });
    
    // react-diff-view's parseDiff expects a full git diff format.
    // We prepend a git diff header to the patch created by the diff library.
    const gitDiff = `diff --git a/workflow.yaml b/workflow.yaml\nindex 0000000..0000000 100644\n${patch}`;

    const files = parseDiff(gitDiff);

    if (!files || files.length === 0 || files[0].hunks.length === 0) {
      return <div>无变更</div>;
    }

    const file = files[0];

    return (
      <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '2px' }}>
        <Diff viewType="split" diffType={file.type} hunks={file.hunks} />
      </div>
    );
  };

  const items = [
    {
      key: '1',
      label: '编辑',
      children: (
        <Input.TextArea
          value={yamlContent}
          onChange={(e) => onYamlContentChange(e.target.value)}
          rows={20}
          style={{ fontFamily: 'monospace', background: '#f5f5f5' }}
        />
      ),
    },
    ...(originalYaml ? [{
      key: '2',
      label: '差异',
      children: renderDiff(),
    }] : []),
  ];

  return (
    <Modal
      title="工作流 YAML"
      open={isModalVisible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={onSync}>
          同步到画布
        </Button>,
      ]}
      width={1000}
    >
      <Tabs defaultActiveKey="1" items={items} />
    </Modal>
  );
};
