import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import api from '../api';

interface DiyFunction {
    functionId: number;
    functionName: string;
    functionContent: string;
}

const { TextArea } = Input;

const DiyFunctionPage: React.FC = () => {
    const [functions, setFunctions] = useState<DiyFunction[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingFunction, setEditingFunction] = useState<DiyFunction | null>(null);
    const [form] = Form.useForm();

    const fetchFunctions = async () => {
        try {
            const response = await api.get<DiyFunction[]>('/api/diy-functions');
            setFunctions(response);
        } catch (error) {
            message.error('无法加载自定义函数');
        }
    };

    useEffect(() => {
        fetchFunctions();
    }, []);

    const handleAdd = () => {
        setEditingFunction(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingFunction(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/api/diy-functions/${id}`);
            message.success('删除成功');
            fetchFunctions();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingFunction) {
                await api.put(`/api/diy-functions/${editingFunction.functionId}`, values);
                message.success('更新成功');
            } else {
                await api.post('/api/diy-functions', values);
                message.success('创建成功');
            }
            setIsModalVisible(false);
            fetchFunctions();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'functionId',
            key: 'functionId',
        },
        {
            title: '函数名称',
            dataIndex: 'functionName',
            key: 'functionName',
        },
        {
            title: '函数内容',
            dataIndex: 'functionContent',
            key: 'functionContent',
            ellipsis: true,
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <span>
                    <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
                    <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(record.functionId)}>
                        <Button type="link" danger>删除</Button>
                    </Popconfirm>
                </span>
            ),
        },
    ];

    return (
        <div>
            <Button type="primary" onClick={handleAdd} style={{ marginBottom: 16 }}>
                新增自定义函数
            </Button>
            <Table columns={columns} dataSource={functions} rowKey="functionId" />
            <Modal
                title={editingFunction ? '编辑自定义函数' : '新增自定义函数'}
                visible={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="functionName"
                        label="函数名称"
                        rules={[{ required: true, message: '请输入函数名称' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="functionContent"
                        label="函数内容"
                        rules={[{ required: true, message: '请输入函数内容' }]}
                    >
                        <TextArea rows={10} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DiyFunctionPage;
