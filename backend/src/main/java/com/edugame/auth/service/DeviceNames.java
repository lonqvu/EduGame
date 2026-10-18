package com.edugame.auth.service;

import java.util.List;
import java.util.Locale;

/**
 * "Chrome trên Windows" from a browser's User-Agent. Sign-in alerts compare these names rather than the raw
 * header, which changes with every browser update and would make each update look like a new device.
 */
public final class DeviceNames {

    private record Match(String token, String name) {
    }

    // Order matters: Edge, Opera, Cốc Cốc... also say "Chrome"; Chrome also says "Safari".
    private static final List<Match> BROWSERS = List.of(
            new Match("coc_coc_browser", "Cốc Cốc"),
            new Match("edg", "Edge"),
            new Match("opr/", "Opera"),
            new Match("samsungbrowser", "Samsung Internet"),
            new Match("firefox/", "Firefox"),
            new Match("fxios", "Firefox"),
            new Match("crios", "Chrome"),
            new Match("chrome/", "Chrome"),
            new Match("safari/", "Safari"));

    // iPhone and iPad before Mac OS X (they say "like Mac OS X"), Android before Linux.
    private static final List<Match> SYSTEMS = List.of(
            new Match("iphone", "iPhone"),
            new Match("ipad", "iPad"),
            new Match("android", "Android"),
            new Match("windows", "Windows"),
            new Match("cros", "ChromeOS"),
            new Match("mac os x", "macOS"),
            new Match("linux", "Linux"));

    private DeviceNames() {
    }

    /** The device name, or {@code null} without a User-Agent (API clients). */
    public static String of(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        String ua = userAgent.toLowerCase(Locale.ROOT);
        return "%s trên %s".formatted(find(BROWSERS, ua, "Trình duyệt"), find(SYSTEMS, ua, "thiết bị khác"));
    }

    private static String find(List<Match> matches, String ua, String fallback) {
        return matches.stream().filter(m -> ua.contains(m.token())).map(Match::name).findFirst().orElse(fallback);
    }
}
