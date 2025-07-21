import React from 'react';
import { Input } from 'antd';

interface SqlTaskEditorProps {
  currentNode: any;
}

export const SqlTaskEditor: React.FC<SqlTaskEditorProps> = ({ currentNode }) => {
  const data = currentNode.getData();

  return (
    <>
      <p>数据源名称:</p>
      <Input value={data.datasource_name} onChange={e => currentNode.setData({ ...data, datasource_name: e.target.value })} />
      <p>SQL 类型:</p>
      <Input value={data.sql_type} onChange={e => currentNode.setData({ ...data, sql_type: e.target.value })} />
      <p>前置 SQL:</p>
      <Input.TextArea value={data.pre_statements?.join('\n')} onChange={e => currentNode.setData({ ...data, pre_statements: e.target.value.split('\n') })} rows={2} />
      <p>后置 SQL:</p>
      <Input.TextArea value={data.post_statements?.join('\n')} onChange={e => currentNode.setData({ ...data, post_statements: e.target.value.split('\n') })} rows={2} />
      <p>显示行数:</p>
      <Input type="number" value={data.display_rows} onChange={e => currentNode.setData({ ...data, display_rows: Number(e.target.value) })} />
    </>
  );
};
