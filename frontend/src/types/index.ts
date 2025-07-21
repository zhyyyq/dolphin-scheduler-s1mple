export interface Workflow {
  code: any; // Can be number from DS or string from local file
  name: string;
  projectCode: number;
  projectName: string;
  releaseState: 'ONLINE' | 'OFFLINE' | 'UNSUBMITTED';
  updateTime: string;
  isLocal?: boolean;
}

export interface Task {
  name: string;
  type: string;
  command: string;
}

export interface Relation {
  from: string;
  to: string;
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
  state: 'SUCCESS' | 'FAILURE' | 'RUNNING_EXECUTION' | 'STOP' | 'KILL';
  startTime: string;
  endTime: string;
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
