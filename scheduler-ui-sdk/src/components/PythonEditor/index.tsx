import React, { useState, useEffect } from "react";
import { Button, message, Spin, Typography, Space, Modal } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Editor, { loader } from "@monaco-editor/react";
import api from "@/api";

const { Title } = Typography;

// Configure Monaco Editor to load from a local copy instead of CDN
// This is a workaround for environments where the CDN is not accessible.
// We need to ensure that 'monaco-editor' is copied to the public directory.



const PythonEditorPage: React.FC<{ functionId: string }> = ({ functionId }) => {
  const [functionName, setFunctionName] = useState("");
  const [code, setCode] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loader.config({ paths: { vs: window.schedulerSdk.vs_url || "/vs" } });
  }, [])
  useEffect(() => {
    const fetchFunction = async () => {
      try {
        const response = await api.get<any>(`/api/diy-functions/${functionId}`);
        setFunctionName(response.functionName);
        setCode(response.functionContent);
      } catch (error) {
        message.error("无法加载函数内容");
      } finally {
        setLoading(false);
      }
    };
    fetchFunction();
  }, [functionId]);

  const handleSave = async () => {
    try {
      await api.put(`/api/diy-functions/${functionId}`, {
        functionName: functionName,
        functionContent: code,
      });
      message.success("保存成功");
      const event = new CustomEvent("edit_function_end", {
        detail: "user saved",
      });
      document.querySelector("scheduler-edit-component")?.dispatchEvent(event);
    } catch (error) {
      message.error("保存失败");
    }
  };

  if (loading) {
    return (
      <Spin size="large" style={{ display: "block", marginTop: "50px" }} />
    );
  }

  return (
    <Modal
      open={true}
      width="80%"
      title="python编辑器"
      footer={null}
      onCancel={() => {
        const event = new CustomEvent("edit_function_end", {
          detail: "user canceld",
        });
        document
          .querySelector("scheduler-edit-component")
          ?.dispatchEvent(event);
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "80vh",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            backgroundColor: "white",
          }}
        >
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                 const event = new CustomEvent('edit_function_end', {
                    detail: "user saved"
                  });
                  document.querySelector("scheduler-edit-component")?.dispatchEvent(event);
              }}
            />
            <Title level={4} style={{ margin: 0 }}>
              编辑: {functionName}
            </Title>
          </Space>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
        <div style={{ flex: 1 }}>
          <Editor
            height="100%"
            language="python"
            value={code}
            onChange={(value) => setCode(value)}
            theme="light"
            options={{
              selectOnLineNumbers: true,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default PythonEditorPage;
