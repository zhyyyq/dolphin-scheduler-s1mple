import React from 'react';
import { Modal, Button, Input, Tabs } from 'antd';
import { Diff, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import * as diff from 'diff';

interface Change {
  type: 'add' | 'del' | 'normal';
  content: string;
  isInsert?: boolean;
  isDelete?: boolean;
  isNormal?: boolean;
}

interface Hunk {
  content: string;
  changes: Change[];
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  isNormal?: boolean;
}

interface ViewYamlModalProps {
  isModalVisible: boolean;
  onCancel: () => void;
  onSync: () => void;
  yamlContent: string;
  onYamlContentChange: (content: string) => void;
  originalYaml?: string;
}

export const ViewYamlModal: React.FC<ViewYamlModalProps> = ({
  isModalVisible,
  onCancel,
  onSync,
  yamlContent,
  onYamlContentChange,
  originalYaml,
}) => {
  const renderDiff = () => {
    if (!originalYaml) {
      return null;
    }

    if (originalYaml === yamlContent) {
      return <div>无变更</div>;
    }

    const diffResult = diff.diffLines(originalYaml, yamlContent);
    const hunks: Hunk[] = [];
    let currentHunk: Hunk | null = null;

    diffResult.forEach((part, i) => {
      const lines = part.value.split('\n');
      if (part.added || part.removed) {
        if (!currentHunk) {
          currentHunk = {
            content: `@@ -1,1 +1,1 @@`,
            changes: [],
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
          };
        }
        lines.forEach(line => {
          if (line) {
            currentHunk.changes.push({
              type: part.added ? 'add' : 'del',
              content: (part.added ? '+' : '-') + line,
              isInsert: part.added,
              isDelete: part.removed,
            });
          }
        });
      } else {
        if (currentHunk) {
          hunks.push(currentHunk);
          currentHunk = null;
        }
      }
    });

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return (
      <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '2px' }}>
        <Diff viewType="split" diffType="modify" hunks={hunks} />
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
