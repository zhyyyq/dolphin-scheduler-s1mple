## 基于dolphin 原始镜像的调整

### 1. jar包准备 见jars

1.mysql
2.db2
3.hive

### 2. python 安装

见worker里面docker镜像的操作

### 3. 配置修改

打开了python-api gateway
允许default tenant

### 4. 如何测试

1. 初始化数据库 docker compose --profile=schema  up --build -d
2. 构建镜像 并启动服务 docker compose --profile=all  up --build -d

### 5.如何同步到内网

4.2 操作完之后，导出docker 基础镜像，上传到内网替换