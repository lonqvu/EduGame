package com.edugame.feedback.service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.edugame.feedback.dto.AdminFeedbackResponse;

/** The admin export: a CSV that Excel opens with its Vietnamese letters (UTF-8 with a BOM). */
public final class FeedbackCsv {

    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final List<String> HEADER = List.of("Mã", "Thời gian", "Loại", "Đánh giá", "Nội dung", "Giáo viên",
            "Email", "Liên hệ lại", "Trang", "Thiết bị", "Cửa sổ", "Phiên bản", "Có ảnh", "Trạng thái");

    private FeedbackCsv() {
    }

    public static String of(List<AdminFeedbackResponse> feedback, ZoneId zone) {
        StringBuilder csv = new StringBuilder("﻿");
        row(csv, HEADER);
        for (AdminFeedbackResponse f : feedback) {
            row(csv, List.of(
                    f.code(),
                    WHEN.format(f.createdAt().atZone(zone)),
                    f.kind().label(),
                    f.rating() == null ? "" : f.rating().toString(),
                    f.message(),
                    f.teacher() == null ? "" : nullToEmpty(f.teacher().displayName()),
                    f.teacher() == null ? "" : nullToEmpty(f.teacher().email()),
                    f.contactOk() ? "Có" : "Không",
                    nullToEmpty(f.page()),
                    nullToEmpty(f.device()),
                    nullToEmpty(f.viewport()),
                    nullToEmpty(f.appVersion()),
                    f.screenshotUrl() == null ? "Không" : "Có",
                    f.status().name()));
        }
        return csv.toString();
    }

    private static void row(StringBuilder csv, List<String> cells) {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                csv.append(',');
            }
            csv.append(cell(cells.get(i)));
        }
        csv.append("\r\n");
    }

    /** Quoted, and a leading = + - @ made text, so Excel never runs what a teacher typed as a formula. */
    static String cell(String value) {
        String safe = !value.isEmpty() && "=+-@\t\r".indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
