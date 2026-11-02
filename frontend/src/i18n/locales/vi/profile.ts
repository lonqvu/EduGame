/** "Hồ sơ của tôi" page and its dialogs (ProfilePage, pages/profile, utils/profile). */
export const profile = {
  title: 'Hồ sơ của tôi',
  intro: 'Quản lý thông tin cá nhân và tài khoản Lớp Vui của bạn.',
  accountSettings: 'Cài đặt tài khoản',
  signOutConfirm: 'Đăng xuất khỏi Lớp Vui?',
  signOut: 'Đăng xuất',
  stay: 'Ở lại',
  soon: 'Sắp có',

  /** Rows of "Cài đặt tài khoản". */
  rows: {
    personal: 'Thông tin cá nhân',
    personalText: 'Họ tên, email, số điện thoại, ảnh đại diện',
    security: 'Bảo mật tài khoản',
    securityText: 'Đổi mật khẩu, quản lý phiên đăng nhập',
    notifications: 'Thông báo',
    notificationsText: 'Email khi đăng nhập trên thiết bị mới, khi đổi mật khẩu',
    display: 'Hiển thị & trình chiếu',
    displayText: 'Hiệu ứng chuyển động, toàn màn hình khi trình chiếu',
    help: 'Trợ giúp',
    helpText: 'Hướng dẫn sử dụng, câu hỏi thường gặp',
  },

  /** The card with the teacher's picture, name and contacts. */
  card: {
    email: 'Email',
    noEmail: 'Chưa có email',
    phone: 'Số điện thoại',
    noPhone: 'Chưa có số điện thoại',
    active: 'Tài khoản đang hoạt động',
    /** {{date}}: the day the account was made. */
    memberSince: 'Tham gia Lớp Vui từ: {{date}}',
    edit: 'Chỉnh sửa hồ sơ',
    teacher: 'Giáo viên',
    admin: 'Quản trị viên',
  },

  /** "Tổng quan hoạt động": four figures, each with its unit under the number. */
  overview: {
    title: 'Tổng quan hoạt động',
    classrooms: 'Lớp đang quản lý',
    classroomsUnit_one: 'lớp',
    classroomsUnit_other: 'lớp',
    students: 'Tổng số học sinh',
    studentsUnit_one: 'học sinh',
    studentsUnit_other: 'học sinh',
    questionSets: 'Bộ câu hỏi đã tạo',
    questionSetsUnit_one: 'bộ câu hỏi',
    questionSetsUnit_other: 'bộ câu hỏi',
    activities: 'Hoạt động đã tổ chức',
    activitiesUnit_one: 'hoạt động',
    activitiesUnit_other: 'hoạt động',
  },

  edit: {
    title: 'Thông tin cá nhân',
    saved: 'Đã lưu hồ sơ.',
    imageUnreadable: 'Không đọc được ảnh này, cô chọn ảnh khác nhé.',
    picture: 'Ảnh đại diện',
    upload: 'Tải ảnh của cô lên',
    uploadTitle: 'Tải ảnh lên',
    uploadShort: 'Tải ảnh',
    uploaded: 'Ảnh của cô',
    pictureHint: 'Ảnh JPG, PNG… tối đa 15 MB; ảnh được cắt vuông ở giữa.',
    name: 'Họ và tên',
    nameRequired: 'Cô nhập họ và tên nhé',
    /** {{count}}: the longest name. */
    nameTooLong_one: 'Tối đa {{count}} ký tự',
    nameTooLong_other: 'Tối đa {{count}} ký tự',
    namePlaceholder: 'VD: Cô Lan',
    email: 'Email',
    emailHint: 'Email dùng để đăng nhập nên chưa đổi được ở đây.',
    phone: 'Số điện thoại (không bắt buộc)',
    phonePlaceholder: 'VD: 0987 654 321',
    phoneInvalid: 'Số điện thoại gồm 9–15 chữ số, ví dụ 0987 654 321.',
    pictureType: 'Cô chọn ảnh JPG, PNG, WEBP hoặc GIF nhé.',
    pictureTooLarge: 'Ảnh lớn quá (tối đa 15 MB), cô chọn ảnh khác nhé.',
  },

  /** Names of the pictures a teacher can pick. */
  avatars: {
    teacher: 'Cô giáo',
    bear: 'Gấu',
    rabbit: 'Thỏ',
    lion: 'Sư tử',
    cat: 'Mèo',
    fox: 'Cáo',
    panda: 'Gấu trúc',
    owl: 'Cú mèo',
    frog: 'Ếch',
  },

  security: {
    title: 'Bảo mật tài khoản',
    changePassword: 'Đổi mật khẩu',
    currentPassword: 'Mật khẩu hiện tại',
    currentRequired: 'Cô nhập mật khẩu hiện tại nhé',
    newPassword: 'Mật khẩu mới',
    newRequired: 'Cô nhập mật khẩu mới nhé',
    tooShort_one: 'Mật khẩu cần ít nhất {{count}} ký tự',
    tooShort_other: 'Mật khẩu cần ít nhất {{count}} ký tự',
    samePassword: 'Mật khẩu mới cần khác mật khẩu hiện tại',
    confirm: 'Nhập lại mật khẩu mới',
    confirmRequired: 'Cô nhập lại mật khẩu mới nhé',
    mismatch: 'Mật khẩu nhập lại chưa khớp',
    afterChange: 'Sau khi đổi, các thiết bị khác sẽ phải đăng nhập lại bằng mật khẩu mới.',
    /** {{others}}: one of `othersSignedOut` / `noOthers`. */
    changed: 'Đã đổi mật khẩu. {{others}}',
    othersSignedOut_one: 'Đã đăng xuất {{count}} thiết bị khác.',
    othersSignedOut_other: 'Đã đăng xuất {{count}} thiết bị khác.',
    noOthers: 'Không có thiết bị nào khác đang đăng nhập.',
    devices: 'Thiết bị đăng nhập',
    devicesText: 'Đã đăng nhập trên máy tính ở trường hay máy của người khác? Cô đăng xuất các thiết bị đó, máy này vẫn giữ đăng nhập.',
    signOutOthers: 'Đăng xuất khỏi các thiết bị khác',
    signOutOthersConfirm: 'Đăng xuất khỏi các thiết bị khác?',
    signOutOthersText: 'Mọi máy tính, điện thoại khác đang đăng nhập tài khoản này sẽ phải đăng nhập lại. Máy này vẫn giữ đăng nhập.',
    signOutOthersOk: 'Đăng xuất thiết bị khác',
  },

  help: {
    title: 'Trợ giúp',
    intro: 'Những câu hỏi thường gặp khi dùng Lớp Vui.',
    notFound: 'Chưa thấy câu trả lời?',
    feedback: 'Gửi góp ý cho đội Lớp Vui',
    /** The questions, each with its answer and, for some, a link. */
    games: 'Làm sao để tổ chức một trò chơi?',
    gamesText:
      'Vào “Trò chơi”, bấm “Chọn trò chơi” ở trò cô muốn, đặt tên rồi chọn dùng bộ câu hỏi có sẵn hoặc soạn nội dung mới. Ở trang chuẩn bị, cô xem luật chơi, trình chiếu luật cho cả lớp rồi bấm “Bắt đầu trò chơi”.',
    gamesLink: 'Đi tới Chọn trò chơi',
    sets: 'Bộ câu hỏi dùng để làm gì?',
    setsText:
      'Bộ câu hỏi là nơi cô soạn câu hỏi một lần rồi dùng cho nhiều trò chơi: Trắc nghiệm, Rung chuông vàng, Đua thuyền và Lật ô. Câu tự luận chỉ dùng được cho Lật ô.',
    setsLink: 'Đi tới Bộ câu hỏi',
    students: 'Làm sao để thêm học sinh vào lớp?',
    studentsText: 'Vào “Lớp học”, mở lớp rồi thêm học sinh từng bạn, dán cả danh sách, hoặc nhập từ file Excel / CSV theo file mẫu.',
    studentsLink: 'Đi tới Lớp học',
    projector: 'Trình chiếu lên máy chiếu thế nào?',
    projectorText: 'Nối máy tính với máy chiếu, mở trò chơi rồi bấm “Bắt đầu trò chơi”. Màn chơi tự co giãn vừa mọi màn hình; bấm F11 để toàn màn hình.',
    password: 'Quên mật khẩu thì làm sao?',
    passwordText:
      'Ở màn đăng nhập, bấm “Quên mật khẩu?” và nhập email: Lớp Vui gửi mã để cô đặt mật khẩu mới. Khi đang đăng nhập, cô đổi mật khẩu trong “Bảo mật tài khoản”.',
  },
}
