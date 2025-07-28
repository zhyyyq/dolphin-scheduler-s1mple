export interface Workflow {
  uuid: string;
  code: any; // Can be number from DS or string from local file
  name: string;
  projectCode: number;
  projectName:string;
  releaseState: 'ONLINE' | 'OFFLINE' | 'UNSUBMITTED' | 'MODIFIED';
  updateTime: string | number;
  isLocal?: boolean;
  schedule_text?: string;
  schedule_human_readable?: string;
  local_status?: 'new' | 'modified' | 'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown';
  schedule?: {
    id: number;
    [key: string]: any;
  };
}

export interface Parameter {
  name: string;
  type: 'VARCHAR' | 'INTEGER' | 'LONG' | 'FLOAT' | 'DOUBLE' | 'DATE' | 'TIMESTAMP' | 'BOOLEAN';
  value: any;
}

export interface WorkflowDetail extends Workflow {
  tasks?: Task[];
  parameters?: Parameter[];
  relations?: Relation[];
  filename: string;
  yaml_content: string;
  schedule?: any;
  locations?: string;
}

export interface HttpParam {
  prop: string;
  httpParametersType: 'PARAMETER' | 'HEADER';
  value: string;
}

export interface SwitchBranch {
  task: string;
  condition?: string;
}

export interface SwitchCondition {
  dependTaskList: SwitchBranch[];
}

export interface ConditionTask {
  task: string;
  flag: boolean;
}

export interface ConditionGroup {
  op: 'AND' | 'OR';
  groups: (ConditionGroup | ConditionTask)[];
}

export interface Task {
  id?: string;
  name: string;
  label?: string;
  type?: string;
  task_type?: string;
  description?: string;
  command: string;
  task_params?: Record<string, any>;
  localParams?: any[];
  cpu_quota?: number;
  memory_max?: number;
  datasource_name?: string;
  sql_type?: 'SELECT' | 'NOT_SELECT';
  pre_statements?: string[];
  post_statements?: string[];
  display_rows?: number;
  url?: string;
  http_method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  http_params?: HttpParam[];
  http_check_condition?: 'STATUS_CODE_DEFAULT' | 'STATUS_CODE_CUSTOM' | 'BODY_CONTAINS' | 'BODY_NOT_CONTAINS';
  condition?: any;
  connect_timeout?: number;
  socket_timeout?: number;
  workflow_name?: string;
  switch_condition?: SwitchCondition;
  success_task?: string;
  failed_task?: string;
  op?: 'AND' | 'OR';
  groups?: (ConditionGroup | ConditionTask)[];
  deps?: string[];
  _display_type?: string;
  downstream?: Record<string, string[]>;
  failRetryTimes?: number;
  failRetryInterval?: number;
}

export interface Relation {
  from: string;
  to: string;
  from_port?: string;
  to_port?: string;
}

export interface PreviewData {
  name: string;
  tasks: Task[];
  relations: Relation[];
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  returncode?: number;
  message?: string;
}

export interface WorkflowInstance {
  id: number;
  name: string;
  state: 'SUCCESS' | 'FAILURE' | 'RUNNING_EXECUTION' | 'STOP' | 'KILL' | string;
  startTime: string;
  endTime: string;
  duration: string;
  processDefinition: {
    projectCode: number;
  };
}

export interface DashboardStats {
  success: number;
  failure: number;
  running: number;
  other: number;
  total: number;
  recent_instances: WorkflowInstance[];
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
}
