/** The app's frame: menu, top bar, loading and error states, sign-in prompts, words used everywhere. */
export const app = {
  /** The sidebar menu (MainLayout) and its drawer on phones. */
  nav: {
    home: 'Trang chủ',
    games: 'Trò chơi',
    questionSets: 'Bộ câu hỏi',
    classes: 'Lớp học',
    reports: 'Báo cáo',
    admin: 'Quản trị',
    feedback: 'Góp ý',
    /** Accessible name of the "Góp ý" button. */
    feedbackLabel: 'Góp ý cho Lớp Vui',
    settings: 'Cài đặt',
    help: 'Trợ giúp',
    /** Accessible name of the menu itself. */
    main: 'Điều hướng chính',
    /** The ☰ button on phones. */
    openMenu: 'Mở menu',
    /** A menu item whose page is not built yet; {{page}} is its name. */
    comingSoon: 'Trang “{{page}}” đang được hoàn thiện.',
  },

  /** Names of the languages, each written in its own language (the picker shows them so). */
  languages: {
    vi: 'Tiếng Việt',
    en: 'English',
  },

  /** Words and buttons used on many screens. */
  common: {
    cancel: 'Hủy',
    close: 'Đóng',
    save: 'Lưu',
    saveChanges: 'Lưu thay đổi',
    saving: 'Đang lưu…',
    saved: 'Đã lưu',
    delete: 'Xóa',
    edit: 'Sửa',
    add: 'Thêm',
    create: 'Tạo',
    retry: 'Thử lại',
    back: 'Quay lại',
    next: 'Tiếp tục',
    done: 'Xong',
    later: 'Để sau',
    search: 'Tìm kiếm',
    loading: 'Đang tải',
    optional: 'không bắt buộc',
    more: 'Thêm thao tác',
    goHome: 'Về trang chủ',
    yes: 'Có',
    no: 'Không',
    /** An error with no better message. */
    error: 'Có lỗi xảy ra, cô thử lại nhé.',
    /** Title of a new game a visitor makes without naming it. */
    newGame: 'Trò chơi mới',
  },

  /** How long ago (utils/dateLabels); {{time}} is "09:10". */
  time: {
    justNow: 'Vừa xong',
    today: 'Hôm nay {{time}}',
    yesterday: 'Hôm qua {{time}}',
    daysAgo_one: '{{count}} ngày trước',
    daysAgo_other: '{{count}} ngày trước',
    weeksAgo_one: '{{count}} tuần trước',
    weeksAgo_other: '{{count}} tuần trước',
    monthsAgo_one: '{{count}} tháng trước',
    monthsAgo_other: '{{count}} tháng trước',
    overAYear: 'Hơn 1 năm trước',
  },

  /** States of a page whose data loads (LoadState, AppShell, TopLoadingBar). */
  load: {
    logoLoading: 'Lớp Vui đang tải',
    errorTitle: 'Chưa tải được dữ liệu',
    errorText: 'Cô kiểm tra kết nối mạng rồi thử lại nhé.',
    notFound: 'Trang bạn tìm không tồn tại.',
    adminOnlyTitle: 'Trang dành cho quản trị viên',
    adminOnlyText: 'Tài khoản của cô chưa có quyền quản trị.',
  },

  /** The bar at the top right: the visitor's sign-in links, or the teacher's bell and account menu. */
  topBar: {
    signUp: 'Đăng ký',
    signIn: 'Đăng nhập',
    notifications: 'Thông báo',
    noNotifications: 'Chưa có thông báo mới.',
    profile: 'Hồ sơ của tôi',
    signOut: 'Đăng xuất',
    /** Accessible name of the account button; {{name}} is the teacher's. */
    account: 'Tài khoản {{name}}',
    /** Accessible name of the language button; {{name}} is the language shown now. */
    language: 'Ngôn ngữ: {{name}}',
    /** Next to English while its translation is not finished. */
    languageBeta: 'đang thử nghiệm',
  },

  /** The speaker button of the projector screens. */
  sound: {
    turnOff: 'Tắt âm thanh (phím M)',
    turnOn: 'Bật âm thanh (phím M)',
    turnOffShort: 'Tắt âm thanh (M)',
    turnOnShort: 'Bật âm thanh (M)',
  },

  /** "Cần đăng nhập": a visitor opened something that needs an account (LoginPrompt). */
  loginPrompt: {
    /** The features, as the title names them. */
    features: {
      questionSets: 'Bộ câu hỏi',
      classes: 'Quản lý lớp học',
      reports: 'Báo cáo',
      profile: 'Hồ sơ',
      admin: 'Quản trị',
      upload: 'Tải ảnh lên',
      feedback: 'Góp ý',
      page: 'trang này',
    },
    /** One line under the title, per feature (none for the others). */
    why: {
      questionSets: 'Soạn một lần, dùng lại cho mọi trò chơi.',
      classes: 'Lưu danh sách lớp để gọi tên, chia nhóm và khen thưởng.',
      reports: 'Xem lại kết quả của lớp sau mỗi buổi chơi.',
      upload: 'Ảnh được lưu trong tài khoản để dùng lại ở trò chơi khác.',
    },
    badge: 'Dành cho tài khoản giáo viên',
    /** {{feature}} is one of `features`, shown in color. */
    title: 'Đăng nhập để dùng <feature>{{feature}}</feature>',
    benefits: {
      classes: 'Lưu lớp học và danh sách học sinh',
      questionSets: 'Soạn bộ câu hỏi dùng cho nhiều trò chơi',
      reports: 'Xem lại kết quả và báo cáo',
    },
    signIn: 'Đăng nhập',
    signUp: 'Tạo tài khoản miễn phí',
    later: 'Để sau, tôi chơi thử không cần tài khoản',
    tryWithout: 'Chơi thử không cần tài khoản',
  },
}
