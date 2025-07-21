import React from 'react';
import { Modal, Button, Input } from 'antd';

interface ViewYamlModalProps {
  isModalVisible: boolean;
  onCancel: () => void;
  onSync: () => void;
  yamlContent: string;
  onYamlContentChange: (content: string) => void;
}

export const ViewYamlModal: React.FC<ViewYamlModalProps> = ({
  isModalVisible,
  onCancel,
  onSync,
  yamlContent,
  onYamlContentChange,
}) => {
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
      width={800}
    >
      <Input.TextArea
        value={yamlContent}
        onChange={(e) => onYamlContentChange(e.target.value)}
        rows={20}
        style={{ fontFamily: 'monospace', background: '#f5f5f5' }}
      />
    </Modal>
  );
};
