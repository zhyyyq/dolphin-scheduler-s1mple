# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

r"""A tutorial example take you to experience pydolphinscheduler.

After tutorial.py file submit to Apache DolphinScheduler server a DAG would be create,
and workflow DAG graph as below:

                  --> task_child_one
                /                    \
task_parent -->                        -->  task_union
                \                    /
                  --> task_child_two

it will instantiate and run all the task it have.
"""

# [start tutorial]
# [start package_import]
# Import Workflow object to define your workflow attributes
from pydolphinscheduler.core.workflow import Workflow

# Import task Shell object cause we would create some shell tasks later
from pydolphinscheduler.tasks.shell import Shell

# [end package_import]

# [start workflow_declare]
with Workflow(
    name="tutorial",
    schedule="0 0 0 * * ? *",
    start_time="2022-01-01",
) as workflow:
    # [end workflow_declare]
    # [start task_declare]
    task_parent = Shell(name="task_parent", command="echo hello pydolphinscheduler")
    task_child_one = Shell(
        name="task_child_one",
        command="""
        echo "Executing line 1 with parameter str type ${param1}"
        echo "Executing line 2 with parameter int type ${param2}"
        echo "Executing line 3 with parameter build-in parameter currently date ${param3}"
        """,
        params={"param1": "str1", "param2": 123, "param3": "$[yyyy-MM-dd]"},
    )
    task_child_two = Shell(name="task_child_two", command="echo 'child two'")
    task_union = Shell(name="task_union", command="echo union")

    # [start resource_limit]
    resource_limit = Shell(
        name="resource_limit",
        command="echo resource limit",
        cpu_quota=1,
        memory_max=100,
    )
    # [end resource_limit]
    # [end task_declare]

    # [start task_relation_declare]
    task_group = [task_child_one, task_child_two]
    task_parent.set_downstream(task_group)

    resource_limit << task_union << task_group
    # [end task_relation_declare]

    # [start submit_or_run]
    workflow.run()
    # [end submit_or_run]
# [end tutorial]
