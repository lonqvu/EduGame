import type { ThemeConfig } from 'antd'

/** Antd theme matching the tokens in index.css (@theme). */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3563E9',
    colorSuccess: '#1B7A50',
    colorWarning: '#FFD15C',
    colorError: '#A3361A',
    colorText: '#1F2A44',
    colorTextSecondary: '#4A5470',
    colorBorder: '#D5DEEE',
    colorBgLayout: '#F3F7FC',
    fontFamily: "Nunito, 'Segoe UI', sans-serif",
    fontSize: 16,
    borderRadius: 16,
    controlHeight: 48,
  },
}
