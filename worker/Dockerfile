FROM apache/dolphinscheduler-worker:3.2.2

# install python

RUN apt-get update && apt-get install -y python3 python3-pip
RUN ln -s /usr/bin/python3 /usr/bin/python

# allow default tenant
# allow python gateway
COPY application.yaml /opt/dolphinscheduler/conf

# copy libs
COPY ./libs/*.jar /opt/dolphinscheduler/libs/
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --index-url https://pypi.tuna.tsinghua.edu.cn/simple --extra-index-url https://download.pytorch.org/whl/cpu