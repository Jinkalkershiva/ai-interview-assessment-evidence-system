package com.examhelper.workupdate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionItem {
    @Builder.Default
    private String id = UUID.randomUUID().toString();
    private String task;
    private String assignee;
    private boolean completed;
    private String createdTime;
}
