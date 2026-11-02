/** "Góp ý cho Lớp Vui" dialog (FeedbackDialog, utils/feedback). */
export const feedback = {
  title: 'Góp ý cho Lớp Vui',
  intro: 'Cô gặp lỗi, có ý tưởng hay muốn khen? Đội Lớp Vui đọc mọi góp ý.',
  kindLegend: 'Cô muốn',
  kinds: {
    BUG: 'Báo lỗi',
    IDEA: 'Đề xuất',
    PRAISE: 'Khen',
    OTHER: 'Khác',
  },
  /** Placeholder of the message box, by kind. */
  placeholders: {
    BUG: 'Cô đang làm gì thì gặp lỗi? Màn hình hiện ra như thế nào?',
    IDEA: 'Cô muốn Lớp Vui có thêm trò chơi hay tính năng gì?',
    PRAISE: 'Cô thích điều gì ở Lớp Vui?',
    OTHER: 'Cô muốn nhắn gì tới đội Lớp Vui?',
  },
  ratingLegend: 'Cô thấy Lớp Vui thế nào?',
  /** The five faces, 1 to 5. */
  ratings: {
    '1': 'Rất không hài lòng',
    '2': 'Chưa hài lòng',
    '3': 'Bình thường',
    '4': 'Hài lòng',
    '5': 'Rất hài lòng',
  },
  message: 'Nội dung',
  screenshot: 'Ảnh màn hình',
  screenshotAlt: 'Ảnh màn hình đính kèm',
  /** {{size}}: in KB. */
  attached: 'Đã đính kèm ảnh ({{size}} KB)',
  removeScreenshot: 'Bỏ ảnh',
  capture: 'Chụp màn hình trang này',
  capturing: 'Đang chụp…',
  pickImage: 'Chọn ảnh',
  readingImage: 'Đang đọc ảnh…',
  orPaste: 'hoặc dán ảnh chụp (Ctrl+V)',
  /** {{email}} is shown in bold. */
  contactOk: 'Đội Lớp Vui có thể trả lời cô qua email <b>{{email}}</b>',
  noEmail: 'Tài khoản chưa có email nên đội Lớp Vui chưa trả lời lại cô được.',
  context: 'Kèm theo trang cô đang mở và loại trình duyệt, để đội dễ tìm lỗi.',
  send: 'Gửi góp ý',
  sending: 'Đang gửi…',
  thanksTitle: 'Cảm ơn cô đã góp ý!',
  thanks: 'Đội Lớp Vui đọc mọi góp ý để làm Lớp Vui tốt hơn mỗi ngày.',
  thanksWillReply: 'Đội Lớp Vui đọc mọi góp ý để làm Lớp Vui tốt hơn mỗi ngày. Khi cần, đội sẽ trả lời cô qua email.',
  imageUnreadable: 'Không đọc được ảnh này, cô chọn ảnh khác nhé.',
  captureFailed: 'Chưa chụp được màn hình này. Cô dán ảnh chụp (Ctrl+V) hoặc chọn ảnh từ máy nhé.',
  imageType: 'Cô chọn ảnh PNG, JPG hoặc WEBP nhé.',
  imageEmpty: 'File ảnh này bị trống.',
  imageTooLarge: 'Ảnh lớn quá (tối đa 3 MB), cô chọn ảnh khác nhé.',
}
