package com.examhelper.workupdate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantStatement {
    @Builder.Default
    private String id = UUID.randomUUID().toString();
    private Instant timestamp;
    private String formattedTime;
    private String transcript;
    private String category;
}
