import i18n, { type ParseKeys } from 'i18next'

/**
 * A map of labels (`{ ACTIVE: 'Đang hoạt động', PAUSED: 'Tạm ngưng' }`) whose values are read in the current
 * language each time: one getter per key, so modules can keep exporting plain objects.
 */
export function translatedLabels<K extends string>(keys: readonly K[], keyOf: (key: K) => ParseKeys): Record<K, string> {
  const labels = {} as Record<K, string>
  for (const key of keys) {
    Object.defineProperty(labels, key, { enumerable: true, get: () => i18n.t(keyOf(key)) })
  }
  return labels
}
