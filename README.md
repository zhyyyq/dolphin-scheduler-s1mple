# this is a low code platform for dolphin-scheduler using pydolphinscheduler as cli 

## feature

- version control yaml file
- antv x6 editing the yaml file for pydolphin
- simple dash board
- file upload and download
  

# how to run this 

## start the dolphin-scheduler service using docker 

docker compose --profile schemea up -d

docker compose --profile all up -d

## start the backend

cd backend; mvn spring-boot:start

## start the frontend

cd frontend; npm run dev