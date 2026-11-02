/** "Cài đặt" page (SettingsPage, SettingsParts, utils/settings). */
export const settings = {
  title: 'Cài đặt',
  intro: 'Tùy chỉnh Lớp Vui theo cách cô dạy. Mọi thay đổi được lưu tự động.',
  introGuest: 'Tùy chỉnh Lớp Vui theo cách bạn dạy. Chưa đăng nhập: cài đặt được lưu trên trình duyệt này.',
  /** {{reason}} is the error message. */
  saveFailed: 'Chưa lưu được cài đặt. {{reason}}',

  display: {
    title: 'Hiển thị & trình chiếu',
    reduceMotion: 'Giảm hiệu ứng chuyển động',
    reduceMotionHint: 'Tắt các hiệu ứng động trên mọi màn hình. Nên bật khi máy tính hoặc máy chiếu chạy chậm.',
    fullscreen: 'Toàn màn hình khi bắt đầu trò chơi',
    fullscreenHint: 'Bấm “Bắt đầu trò chơi” là màn chiếu mở toàn màn hình. Nhấn Esc để thoát.',
  },


  games: {
    title: 'Trò chơi mới',
    text: 'Áp dụng khi cô tạo trò chơi mới. Trò chơi đã có giữ nguyên; cô vẫn đổi được cho từng trò ở trang Bắt đầu trò chơi.',
    reset: 'Đặt lại theo từng trò',
    teams: 'Số đội',
    teamsHint: 'Cho các trò chia lớp thành đội ngẫu nhiên.',
    timeLimit: 'Thời gian mỗi câu',
    timeLimitHint: 'Trắc nghiệm, Rung chuông vàng, Đua thuyền.',
    allowSteal: 'Cho đội khác giành quyền',
    allowStealHint: 'Khi một đội trả lời sai.',
    shuffle: 'Xáo trộn thứ tự câu hỏi',
    shuffleHint: 'Mỗi lần chơi một thứ tự khác.',
    /** The choice that keeps each game's own default. */
    auto: 'Theo từng trò',
    noLimit: 'Không giới hạn',
    teamCount_one: '{{count}} đội',
    teamCount_other: '{{count}} đội',
    seconds_one: '{{count}} giây',
    seconds_other: '{{count}} giây',
  },

  sound: {
    title: 'Âm thanh',
    text: 'Âm thanh của các trò chơi trên màn chiếu. Trên màn chiếu, nút loa ở góc dưới (hoặc phím M) tắt và bật nhanh.',
    effects: 'Âm thanh trong trò chơi',
    effectsHint: 'Tiếng trả lời đúng, sai, đếm giờ, chuông, vỗ tay khi thắng…',
    volume: 'Âm lượng',
    volumeHint: 'Thả tay để nghe thử.',
    music: 'Nhạc nền',
    musicHint: 'Nhạc vui nhẹ khi chơi, dồn dập hơn ở những giây cuối.',
  },

  notifications: {
    title: 'Thông báo qua email',
    textGuest: 'Thông báo được gửi tới email của tài khoản, nên cần đăng nhập.',
    textNoEmail: 'Tài khoản chưa có email nên Lớp Vui chưa gửi được thông báo.',
    /** {{email}} is the account's address. */
    text: 'Gửi tới {{email}} để cô biết ngay khi tài khoản có thay đổi.',
    accountEmail: 'email của tài khoản',
    signInTitle: 'Đăng nhập để nhận thông báo',
    signInHint: 'Khi tài khoản đăng nhập trên thiết bị mới, hoặc khi mật khẩu được đổi.',
    signIn: 'Đăng nhập',
    newSignIn: 'Đăng nhập trên thiết bị mới',
    newSignInHint: 'Khi tài khoản đăng nhập trên trình duyệt hoặc máy chưa dùng bao giờ.',
    passwordChanged: 'Mật khẩu được thay đổi',
    passwordChangedHint: 'Khi mật khẩu được đổi trong Hồ sơ của tôi.',
  },
}
