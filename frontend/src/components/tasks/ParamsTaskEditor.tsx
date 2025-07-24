import React from 'react';
import { Typography } from 'antd';
import LocalParamsEditor from './common/LocalParamsEditor';

const { Title } = Typography;

const ParamsTaskEditor: React.FC = () => {
  return (
    <>
      <Title level={5}>定义输出参数</Title>
      <LocalParamsEditor />
    </>
  );
};

export default ParamsTaskEditor;
