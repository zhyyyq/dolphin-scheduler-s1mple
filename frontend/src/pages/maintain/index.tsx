import React, { useCallback, useEffect, useMemo } from 'react';
import { Select, Segmented, DatePicker } from 'antd'
import './index.less';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchProjects, fetchStats, setSelectedProject, setSelectedTimeRange, setSelectedTimeType } from '@/store/slices/maintainSlice';
import { Dayjs } from 'dayjs';
const { RangePicker } = DatePicker;

const p_refixCls = 'maintain';
const MaintainPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    projects,
    loading,
    error,
    selectedTimeType,
    selectedProject,
    selectedTimeRange
  } = useSelector((state: RootState) => state.maintain);
  const project_options = useMemo(() => {
    return projects.map(projects => ({
      label: projects.name,
      value: projects.code,
    }));
  }
    , [projects]);
  const renderWorkflowInstanceStats = useMemo(() => {
    if (loading) {
      return <div>Loading...</div>;
    }
    return null;


  }, [loading]);
  const handleProjectChange = useCallback((value: number[]) => {
    dispatch(setSelectedProject(value));
  }, [dispatch])
  const handleTimeTypeChange = useCallback((value: string) => {
    dispatch(setSelectedTimeType(value));
  }, [dispatch]);
  const handleTimeRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null, dateStrings: [string, string]) => {
      if (dates && dates[0] && dates[1]) {
        dispatch(setSelectedTimeRange([dates[0], dates[1]]));
      } else {
        dispatch(setSelectedTimeRange(undefined));
      }
    },
    [dispatch]
  );
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);
  useEffect(() => {
    dispatch(fetchStats());
   }, [selectedProject, selectedTimeType, selectedTimeRange]);
  return (
    <div>
      <div className={`${p_refixCls}-overview-panel`}>
        <div className={`${p_refixCls}-overview-panel-filter-by-project`}>
          <div>所有任务流</div>
          <div>
            <Select mode='multiple' options={project_options} value={selectedProject} onChange={handleProjectChange} />
          </div>
        </div>
        <div className={`${p_refixCls}-overview-panel-filter-by-time`}>
          <Segmented
            value={selectedTimeType}
            options={[
              { label: '调度时间', value: 'schedule' },
              { label: '执行时间', value: 'execute' },
            ]}
            onChange={handleTimeTypeChange}
            defaultValue='schedule' />
          <RangePicker value={selectedTimeRange} onChange={handleTimeRangeChange}/>
        </div>
      </div>
      <div className={`${p_refixCls}-stats-panel`}>
        <div>
          饼图
        </div>
        <div>
          <div>任务统计信息/任务统计星系</div>
          {renderWorkflowInstanceStats}
        </div>
      </div>
      <h1>维护页面</h1>
      <p>这里是维护相关的内容。</p>
    </div>
  );
}


export default MaintainPage;