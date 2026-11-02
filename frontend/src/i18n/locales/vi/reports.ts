/** "Báo cáo" (ReportsPage, pages/reports, utils/reports). */
export const reports = {
  title: 'Báo cáo',
  text: 'Lớp đã chơi gì, kết quả ra sao và các em được khen bao nhiêu sao',
  filters: 'Bộ lọc báo cáo',
  class: 'Lớp',
  period: 'Thời gian',
  periodLabel: 'Khoảng thời gian',
  custom: '📅 Tùy chọn',
  from: 'Từ ngày',
  to: 'đến',
  toLabel: 'Đến ngày',
  presets: {
    week: 'Tuần này',
    month: 'Tháng này',
    term: 'Học kỳ này',
  },
  /** Ends sentences of the tips: "… chưa được khen sao nào trong tháng này." */
  during: {
    week: 'trong tuần này',
    month: 'trong tháng này',
    term: 'trong học kỳ này',
    custom: 'trong kỳ này',
  },
  /** The figures at the top. */
  plays: 'lượt chơi',
  completed: 'chơi đến cuối',
  playTime: 'thời gian chơi',
  /** {{starred}} of {{total}} students got stars. */
  stars: 'sao · {{starred}}/{{total}} em được khen',
  emptyTitle: 'Chưa có hoạt động nào trong khoảng thời gian này',
  emptyText: 'Mỗi trò chơi cô mở cho lớp trên màn chiếu sẽ được ghi lại ở đây, cùng kết quả của các đội.',
  play: 'Tổ chức trò chơi',
  when: 'Lớp chơi khi nào',
  bar: 'Mỗi cột là',
  byDay: 'Theo ngày',
  byWeek: 'Theo tuần',
  ended: 'Chơi đến cuối',
  stopped: 'Dừng giữa chừng',
  praise: 'Khen thưởng →',
  download: '⬇ Tải báo cáo ▾',
  starsCsv: 'Sao của học sinh (CSV)',
  historyCsv: 'Lịch sử hoạt động (CSV)',
  noClassTitle: 'Cô chưa có lớp nào',
  noClassText: 'Báo cáo được lập theo từng lớp. Cô tạo lớp và chơi cùng các em để xem báo cáo nhé.',
  toClasses: 'Đến trang Lớp học',
  rangeMissing: 'Cô chọn ngày bắt đầu và ngày kết thúc nhé.',
  rangeOrder: 'Ngày bắt đầu phải trước ngày kết thúc.',
  rangeTooLong: 'Mỗi báo cáo xem tối đa 1 năm.',

  /** Durations: "45 phút", "2 giờ", "2 giờ 5 phút", "1 giờ 48" (short, on a tile). */
  minutes: '{{minutes}} phút',
  hours: '{{hours}} giờ',
  hoursMinutes: '{{hours}} giờ {{minutes}} phút',
  hoursShort: '{{hours}} giờ {{minutes}}',
  underAMinute: 'dưới 1 phút',
  /** The days of the week, Sunday first, short ("T2") and long ("Thứ Hai"). */
  weekdaysShort: 'CN,T2,T3,T4,T5,T6,T7',
  weekdays: 'Chủ nhật,Thứ Hai,Thứ Ba,Thứ Tư,Thứ Năm,Thứ Sáu,Thứ Bảy',
  today: 'Hôm nay · {{day}}',
  yesterday: 'Hôm qua · {{day}}',
  /** {{start}} – {{end}} of a week on the chart. */
  week: 'Tuần {{start}} – {{end}}',
  trendSame: 'Bằng kỳ trước',
  trendSameLower: 'bằng kỳ trước',
  /** {{change}}: "+3" or "−2". */
  trendChange: '{{change}} so với kỳ trước',

  /** What a game ended with. */
  result: {
    unfinished: 'Chưa chơi đến cuối',
    done: 'Đã hoàn thành',
    draw: 'Hòa · {{scores}}',
    /** {{names}}: the winning teams. */
    won: '{{names}} thắng · {{scores}}',
    wonTogether: '{{names}} cùng thắng · {{scores}}',
    noneLeft: 'Không bạn nào trụ đến cuối',
    goldenBell: '{{names}} rung chuông vàng',
    /** "An, Bình, Chi và 2 bạn". */
    andMore: '{{names}} và {{count}} bạn',
    and: ' và ',
    /** "Yến, An và 3 bạn khác". */
    andOthers: '{{names}} và {{count}} bạn khác',
  },

  /** The CSV files. */
  csv: {
    start: 'Bắt đầu',
    game: 'Trò chơi',
    kind: 'Loại trò chơi',
    status: 'Trạng thái',
    minutes: 'Thời lượng (phút)',
    result: 'Kết quả',
    done: 'Hoàn thành',
    number: 'STT',
    student: 'Học sinh',
    stars: 'Sao ({{period}})',
    /** Part of the file name, without accents. */
    historyFile: 'lich-su',
    starsFile: 'sao',
    reportFile: 'bao-cao',
  },

  /** "Gợi ý cho cô" under the report. */
  tips: {
    title: '💡 Gợi ý cho cô',
    label: 'Gợi ý cho cô',
    wholeClass: 'Cả lớp',
    /** After the names, in bold. {{during}}: "trong tháng này". */
    unpraised: ' chưa được khen sao nào {{during}}.',
    praiseNow: 'Khen ngay',
    unfinished_one: '{{count}} lượt chơi',
    unfinished_other: '{{count}} lượt chơi',
    /** After the count, in bold. */
    unfinishedText: ' dừng giữa chừng, gần nhất là “{{title}}”.',
    replay: 'Chơi lại',
    /** Before and after the game to try, in bold. */
    varietyBefore: 'Lớp chơi {{name}} nhiều nhất. Đổi gió với ',
    varietyAfter: '?',
    seeGames: 'Xem trò',
  },

  blocks: {
    history: 'Lịch sử hoạt động',
    historyCorrect: '{{plays}} lượt chơi · {{correct}} câu trả lời đúng của các đội',
    historyPlays: '{{plays}} lượt chơi',
    show: 'Lượt chơi hiện',
    all: 'Tất cả',
    noneEnded: 'Chưa trò nào được chơi đến cuối trong kỳ này.',
    more: 'Xem thêm ({{count}})',
    limited: 'Hiện {{count}} lượt chơi gần nhất. Cô chọn khoảng thời gian ngắn hơn để xem các lượt cũ.',
    toEnd: '✓ Đến cuối',
    classStars: 'Ngôi sao của lớp',
    /** <link> goes to the class page. */
    noStudents: 'Lớp chưa có học sinh. <link>Thêm học sinh</link>',
    noStars: 'Chưa em nào được thưởng sao trong kỳ này.',
    podium: 'Ba bạn nhiều sao nhất',
    next: 'Các bạn tiếp theo',
    collapse: 'Thu gọn',
    showAllStudents: 'Xem cả {{count}} em',
    waiting: 'Chưa được khen ({{count}})',
    waitingList: 'Học sinh chưa được khen',
    favorites: 'Trò lớp hay chơi',
    sortBy: 'Xếp theo',
    byKind: 'Loại trò',
    byGame: 'Trò của cô',
    kindsList: 'Loại trò chơi',
    gamesList: 'Trò chơi được chơi nhiều',
    times_one: '{{count}} lần',
    times_other: '{{count}} lần',
    timesWord_one: 'lần',
    timesWord_other: 'lần',
    /** {{name}}: {{count}} times. */
    timesTitle: '{{name}}: {{count}} lần',
    allKinds: 'Xem cả {{count}} loại',
    allGames: 'Xem cả {{count}} trò',
  },

  chart: {
    title: 'Hoạt động',
    main: 'hoạt động',
    second: 'hoàn thành',
    secondTitle: 'Hoàn thành',
    byDay: '{{title}} theo ngày',
    byWeek: '{{title}} theo tuần',
    day: 'Ngày',
    week: 'Tuần',
  },
}
