import type { CSSProperties } from 'react'

export const lighten = (color: string, amount: number) => `color-mix(in oklab, ${color}, white ${amount}%)`
export const darken = (color: string, amount: number) => `color-mix(in oklab, ${color}, black ${amount}%)`

/** A glossy ball of `color`: lit from the top-left, shaded at the bottom. */
export function orbStyle(color: string): CSSProperties {
  return {
    background: `radial-gradient(circle at 34% 28%, ${lighten(color, 70)} 0%, ${lighten(color, 18)} 22%, ${color} 50%, ${darken(color, 28)} 100%)`,
    boxShadow: `inset 0 -3px 6px ${darken(color, 35)}, 0 4px 8px -2px ${darken(color, 40)}`,
  }
}

/** A solid block of `color` (podium, badge) with light from above and a darker base. */
export function blockStyle(color: string): CSSProperties {
  return {
    background: `linear-gradient(180deg, ${lighten(color, 22)} 0%, ${color} 38%, ${darken(color, 18)} 100%)`,
    boxShadow: `inset 0 3px 0 ${lighten(color, 45)}, inset 0 -6px 0 ${darken(color, 22)}`,
  }
}
