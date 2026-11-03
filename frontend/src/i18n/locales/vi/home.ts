/** "Trang chủ" (HomePage, pages/home). */
export const home = {
  /** {{name}}: how the teacher is greeted ("cô Lan"). */
  greeting: 'Chào {{name}}!',
  greetingGuest: 'Chào bạn!',
  greetingTeacher: 'Chào cô!',
  question: 'Hôm nay lớp mình chơi gì nhỉ?',
  manageClasses: 'Quản lý lớp học',
  createClass: 'Tạo lớp học',
  /** Accessible name of the class picker. */
  teachingLabel: 'Lớp đang dạy: {{name}}. Đổi lớp',
  noClassLower: 'chưa có lớp',
  noClass: 'Chưa có lớp',
  play: 'Tổ chức trò chơi',
  heroAlt: 'Cô giáo và các bạn nhỏ bên bảng: Học vui, học tốt cùng Lớp Vui!',
  deleteConfirm: 'Xóa “{{title}}” khỏi thư viện?',
  deleteText: 'Trò chơi được lưu trữ, không mất kết quả cũ.',
  deleted: 'Đã xóa khỏi thư viện',
  /** Subject chip of a game without one. */
  mixed: 'Tổng hợp',

  tiles: {
    createSet: 'Tạo bộ câu hỏi',
    createSetText: 'Soạn một lần, dùng cho mọi trò',
    classes: 'Quản lý lớp học',
    classesText: 'Học sinh, nhóm và điểm sao',
  },

  recent: {
    title: 'Chơi gần đây',
    collapse: 'Thu gọn',
    showAll: 'Xem tất cả',
    loading: 'Đang tải trò chơi…',
    error: 'Chưa tải được danh sách trò chơi.',
    empty: 'Cô chưa có trò chơi nào.',
    createFirst: 'Tạo trò chơi đầu tiên',
    resume: 'Tiếp tục',
    replay: 'Chơi lại',
    replayLabel: 'Chơi lại {{title}}',
    editQuestions: 'Soạn câu hỏi',
    rulesSettings: 'Luật chơi & cài đặt',
    remove: 'Xóa khỏi thư viện',
    optionsFor: 'Tùy chọn cho {{title}}',
  },

  /** The games put forward on the home page, playable at once with their sample questions. */
  featured: {
    title: 'Trò chơi nổi bật',
    all: 'Xem tất cả',
  },

  tools: {
    title: 'Công cụ lớp học',
    all: 'Tất cả',
    /** The four tools of the home page: name and what it is for. */
    SPIN_WHEEL: 'Gọi tên',
    SPIN_WHEEL_text: 'Vòng quay',
    TIMER: 'Đồng hồ',
    TIMER_text: 'Bấm giờ',
    TEAM_MAKER: 'Chia nhóm',
    TEAM_MAKER_text: 'Ngẫu nhiên',
    NOISE_METER: 'Tiếng ồn',
    NOISE_METER_text: 'Giữ trật tự',
  },

  sets: {
    title: 'Bộ câu hỏi',
    showAll: 'Xem tất cả',
    /** <link> goes to the question sets. */
    empty: 'Chưa có bộ câu hỏi nào. <link>Tạo bộ câu hỏi</link>',
    playWith: 'Chơi với {{title}}',
    play: 'Chơi',
  },

  praise: {
    title: 'Góc tuyên dương',
    week: 'Tuần này',
    all: 'Tất cả',
    noStudents: 'Lớp chưa có học sinh.',
    noneThisWeek: 'Tuần này chưa có bạn nào được khen',
    noneYet: 'Lớp chưa có bạn nào được khen',
    hint: 'Tặng sao khi lớp chơi trò, hoặc khen ngay trong trang lớp học.',
    praise: 'Khen học sinh',
    fullRanking: 'Xem bảng xếp hạng đầy đủ',
    rankingWeek: 'Bảng xếp hạng tuần này',
    rankingAll: 'Bảng xếp hạng từ trước tới nay',
  },
}
