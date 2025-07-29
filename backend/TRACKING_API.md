# 自定义组件埋点 API 文档

本文档描述了用于跟踪自定义组件运行状态的埋点 API。

## 1. 记录埋点事件

此端点用于接收并记录由自定义组件代码发送的埋点事件。

- **URL**: `/api/tracking/event`
- **Method**: `POST`
- **Content-Type**: `application/json`

### 请求体 (Request Body)

| 字段           | 类型   | 必须 | 描述                                                 |
| -------------- | ------ | ---- | ---------------------------------------------------- |
| `runId`        | String | 是   | 当前工作流的唯一运行 ID。应由 Worker 通过环境变量提供。 |
| `functionName` | String | 是   | 当前执行的自定义组件的名称。应由 Worker 通过环境变量提供。 |
| `eventName`    | String | 是   | 事件的名称，例如 "start", "end", "error", "milestone_1"。 |
| `data`         | Object | 否   | 与事件相关的任意 JSON 数据。                         |

**请求示例:**
```json
{
  "runId": "run-20250729-xyz",
  "functionName": "my-custom-function",
  "eventName": "milestone_1",
  "data": {
    "processed_records": 100,
    "status": "in_progress"
  }
}
```

### 响应 (Response)

- **Success**: `200 OK` (无响应体)
- **Error**: 返回标准的 Spring Boot 错误响应。

---

## 2. 获取所有运行实例

此端点用于获取所有自定义组件的运行实例列表。

- **URL**: `/api/tracking/runs`
- **Method**: `GET`

### 响应 (Response)

返回一个 `TrackingRun` 对象的 JSON 数组。

**响应示例:**
```json
[
  {
    "id": 1,
    "runId": "run-20250729-xyz",
    "functionName": "my-custom-function",
    "startTime": "2025-07-29T01:30:00.123Z",
    "status": "SUCCESS"
  },
  {
    "id": 2,
    "runId": "run-20250729-abc",
    "functionName": "another-function",
    "startTime": "2025-07-29T01:35:10.456Z",
    "status": "FAILURE"
  }
]
```

---

## 3. 获取指定运行实例的事件

此端点用于获取某个特定运行实例的所有埋点事件。

- **URL**: `/api/tracking/runs/{runId}/events`
- **Method**: `GET`

### URL 参数

| 参数    | 类型   | 描述                |
| ------- | ------ | ------------------- |
| `runId` | String | 要查询的运行实例的 ID。 |

### 响应 (Response)

返回一个 `TrackingEvent` 对象的 JSON 数组。

**响应示例:**
```json
[
  {
    "id": 1,
    "runId": "run-20250729-xyz",
    "functionName": "my-custom-function",
    "eventName": "start",
    "eventData": "{}",
    "timestamp": "2025-07-29T01:30:00.123Z"
  },
  {
    "id": 2,
    "runId": "run-20250729-xyz",
    "functionName": "my-custom-function",
    "eventName": "end",
    "eventData": "{\"status\":\"success\"}",
    "timestamp": "2025-07-29T01:30:05.789Z"
  }
]
