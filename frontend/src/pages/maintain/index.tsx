import React, { useCallback, useEffect, useMemo } from "react";
import { Select, Segmented, DatePicker } from "antd";
import "./index.less";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  fetchProjects,
  fetchStats,
  setSelectedDisplayType,
  setSelectedProject,
  setSelectedTimeRange,
  setSelectedTimeType,
} from "@/store/slices/maintainSlice";
import dayjs from "dayjs";
import Pie from "./components/pieGraph";
import StatsItem from "./components/statsItem";
const { RangePicker } = DatePicker;

const SegmentedConfig = [
  {
    label: "调度时间",
    value: "0",
  },
  {
    label: "执行时间",
    value: "1",
  },
];

const SegmentedConfig2 = [
  {
    label: "任务流统计信息",
    value: "0",
  },
  {
    label: "任务统计信息",
    value: "1",
  },
];

const p_refixCls = "maintain";
const MaintainPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    projects,
    loading,
    selectedTimeType,
    selectedDisplayType,
    taskStats,
    selectedProject,
    selectedTimeRange,
    workflowStats,
    selectedTaskType,
  } = useSelector((state: RootState) => state.maintain);
  const project_options = useMemo(() => {
    return projects.map((projects) => ({
      label: projects.name,
      value: projects.code,
    }));
  }, [projects]);
  const renderStats = useMemo(() => {
    if (loading) {
      return <div>Loading...</div>;
    }
    const stats = selectedDisplayType === "0" ? workflowStats : taskStats;
    const total = stats.reduce((acc, item) => acc + item.count, 0);
    if (total === 0) {
      return <div>No workflow instance stats available</div>;
    }
    return (
      <div className={`${p_refixCls}-stats-panel-content`}>
        <StatsItem statusCode={-1} value={total}></StatsItem>
        {stats.map((item) => (
          <StatsItem
            key={item.statusCode}
            value={item.count}
            statusCode={item.statusCode}
          />
        ))}
      </div>
    );
  }, [taskStats, loading, selectedDisplayType]);
  const handleProjectChange = useCallback(
    (value: number[]) => {
      dispatch(setSelectedProject(value));
    },
    [dispatch]
  );
  const handleTimeRangeChange = useCallback(
    (
      dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null,
      dateStrings: [string, string]
    ) => {
      if (dates && dates[0] && dates[1]) {
        dispatch(setSelectedTimeRange([dates[0], dates[1]]));
      } else {
        dispatch(setSelectedTimeRange(undefined));
      }
    },
    [dispatch]
  );
  const handleTimeTypeChange = useCallback(
    (value: string) => {
      dispatch(setSelectedTimeType(value));
    },
    [dispatch]
  );
  const selectedTimeRangeValue = useMemo(() => {
    return [dayjs(selectedTimeRange[0]), dayjs(selectedTimeRange[1])] as [
      dayjs.Dayjs,
      dayjs.Dayjs
    ];
  }, [selectedTimeRange]);
  const handleDisplayTypeChange = useCallback(
    (value: string) => {
      dispatch(setSelectedDisplayType(value));
    },
    [dispatch]
  );
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);
  useEffect(() => {
    dispatch(fetchStats());
  }, [selectedProject, selectedTimeRange, selectedTimeType, dispatch]);

  return (
    <div className="maintain-page">
      <div className="maintain-header">
        <div className={`${p_refixCls}-overview-panel`}>
          <div className={`${p_refixCls}-overview-panel-filter-by-project`}>
            <div>项目</div>
            <div>
              <Select
                mode="multiple"
                options={project_options}
                value={selectedProject}
                onChange={handleProjectChange}
              />
            </div>
          </div>
          <div className={`${p_refixCls}-overview-panel-filter-by-time`}>
            <div>
              <Segmented<string>
                options={SegmentedConfig}
                value={selectedTimeType}
                onChange={handleTimeTypeChange}
              />
            </div>
            <RangePicker
              value={selectedTimeRangeValue}
              onChange={handleTimeRangeChange}
            />
          </div>

        </div>
        <div className={`${p_refixCls}-stats-panel`}>
          <div>
            <Pie />
          </div>
          <div>
            <div>
              <Segmented<string>
                options={SegmentedConfig2}
                value={selectedDisplayType}
                onChange={handleDisplayTypeChange}
              />
            </div>
            {renderStats}
          </div>
        </div>
      </div>

      <div className={`${p_refixCls}-workflows-workspace`}>
        <div className="workflows-list">workflows</div>
        <div className="workflow-detail">workflow-details</div>
      </div>
    </div>
  );
};

export default MaintainPage;
