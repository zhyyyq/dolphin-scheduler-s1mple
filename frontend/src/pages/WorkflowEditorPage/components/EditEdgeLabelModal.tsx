import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Modal, Form, Input } from 'antd';
import { Edge } from '@antv/x6';
import { RootState, AppDispatch } from '../../../store';
import { setCurrentEdge, saveEdgeLabel } from '../../../store/slices/workflowEditorSlice';

const EditEdgeLabelModal: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { currentEdge: edge } = useSelector((state: RootState) => state.workflowEditor);
  const open = !!edge;
  const onCancel = () => dispatch(setCurrentEdge(null));
  const onSave = (edge: Edge, newLabel: string) => dispatch(saveEdgeLabel({ edge, newLabel }));
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && edge) {
      const label = edge.getLabelAt(0)?.attrs?.label?.text || '';
      form.setFieldsValue({ label });
    }
  }, [open, edge, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      if (edge) {
        onSave(edge, values.label);
      }
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  return (
    <Modal
      title="编辑 Case 条件"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      forceRender
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Case 条件 (为空则为 Default)"
          name="label"
        >
          <Input placeholder="e.g., ${variable} == 'value'" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditEdgeLabelModal;
