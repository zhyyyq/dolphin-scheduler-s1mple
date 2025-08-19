import { RootState } from "@/store";
import { Pie } from "@ant-design/plots";
import React, { memo, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { get_chinese_workflow_instance_status } from "../../config";

var config = {
  angleField: "value",
  colorField: "type",
  innerRadius: 0.6,
  label: {
    text: "type",
    style: {
      fontWeight: "bold",
    },
  },
  legend: {
    color: {
      title: false,
      position: "right",
      rowPadding: 5,
    },
  },
};

const DemoMemo = () => {
  const { taskStats } = useSelector((state: RootState) => state.maintain);
  const data = useMemo(() => {
    return taskStats
      ? taskStats
          .filter((item) => item.count > 0)
          .map((item) => ({
            type: get_chinese_workflow_instance_status(item.statusCode),
            value: item.count,
          }))
      : [];
  }, [taskStats]);
  if (data.length === 0) {
    return <div>No data available</div>;
  }
  return (
    <div>
      <Pie width={300} height={300} {...config} data={data} />
    </div>
  );
};

export default DemoMemo;
