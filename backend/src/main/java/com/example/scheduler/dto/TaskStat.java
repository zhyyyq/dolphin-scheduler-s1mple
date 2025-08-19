package com.example.scheduler.dto;

import lombok.Data;

//{ statusDesc: string; count: number; statusCode: number }[]
@Data
public class TaskStat {
  private String statusDesc;
  private int count;
  private int statusCode;
}
