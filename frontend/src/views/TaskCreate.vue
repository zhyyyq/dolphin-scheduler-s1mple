<template>
  <div>
    <h1>Create Task</h1>
    <el-form :model="form" label-width="120px">
      <el-form-item label="Task Name">
        <el-input v-model="form.name"></el-input>
      </el-form-item>
      <el-form-item label="Task Type">
        <el-select v-model="form.task_type" placeholder="please select your task type">
          <el-option label="Shell" value="SHELL"></el-option>
          <el-option label="Python" value="PYTHON"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="Description">
        <el-input v-model="form.description" type="textarea"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSubmit">Create</el-button>
        <el-button>Cancel</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import axios from 'axios'

const form = reactive({
  name: 'Test Task from Code',
  task_type: 'SHELL',
  description: 'This is a test task created from the code.',
})

const onSubmit = async () => {
  try {
    const response = await axios.post('http://localhost:9000/tasks/', form)
    console.log(response.data)
    // 在这里可以添加创建成功后的提示或跳转逻辑
  } catch (error) {
    console.error(error)
  }
}
</script>
