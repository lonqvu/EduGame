package com.edugame.common.mail;

/** The frame every Lớp Vui mail is drawn in: the logo on a white card, in the app's colours. */
public final class MailLayout {

    private MailLayout() {
    }

    /** The HTML version of a mail around {@code body} (already escaped). */
    public static String wrap(String body) {
        return """
                <div style="background:#F3F9FE;padding:32px 16px;font-family:Nunito,'Segoe UI',Arial,sans-serif;\
                color:#1F2A44;font-size:16px;line-height:1.5">
                  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
                    <p style="margin:0 0 24px;font-size:22px;font-weight:900">⭐ Lớp Vui</p>
                    %s
                  </div>
                </div>
                """.formatted(body);
    }
}
