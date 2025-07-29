import requests

# 将此函数包含在您的自定义组件代码中
def track_event(name, data={}):
    # 假设 Worker 会设置这些环境变量
    run_id = '${system.task.instance.id}' 
    function_name = '${system.task.definition.name}'
    
    # 后端 API 的地址，需要根据您的部署环境进行调整
    api_endpoint = "http://localhost:8080/api/tracking/event"

    payload = {
        "runId": run_id,
        "functionName": function_name,
        "eventName": name,
        "data": data
    }
    try:
        response = requests.post(api_endpoint, json=payload)
        response.raise_for_status()
    except Exception as e:
        # 在生产环境中，您可能希望有更健壮的错误处理
        print(f"Failed to send tracking event: {e}")



def main():
  # --- 您的业务逻辑 ---
  track_event("start")
  print("Hello, World!")
  track_event("end", {"status": "success"})
  
if __name__ == "__main__":
  main()
  

  