import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const LENGTH = 6

interface CodeInputProps {
  value: string
  onChange: (code: string) => void
  /** Called once all 6 digits are in. */
  onComplete?: (code: string) => void
  invalid?: boolean
  disabled?: boolean
}

/**
 * Six boxes for the emailed code: typing moves to the next box, Backspace to the previous one, pasting "123456"
 * (or "123 456") fills them all. Phones offer the code from the mail ({@code autocomplete="one-time-code"}).
 */
export function CodeInput({ value, onChange, onComplete, invalid, disabled }: CodeInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')

  const update = (next: string) => {
    const code = next.replace(/\D/g, '').slice(0, LENGTH)
    onChange(code)
    if (code.length === LENGTH) onComplete?.(code)
    return code
  }

  const typeAt = (index: number, typed: string) => {
    const clean = typed.replace(/\D/g, '')
    if (!clean) return
    // Several digits at once: autofill or a fast typist; spread them from this box on.
    const code = update(value.slice(0, index) + clean + value.slice(index + clean.length))
    boxes.current[Math.min(index + clean.length, LENGTH - 1, code.length)]?.focus()
  }

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        update(value.slice(0, index) + value.slice(index + 1))
      } else if (index > 0) {
        update(value.slice(0, index - 1) + value.slice(index))
        boxes.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      boxes.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
      boxes.current[index + 1]?.focus()
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const code = update(e.clipboardData.getData('text'))
    boxes.current[Math.min(code.length, LENGTH - 1)]?.focus()
  }

  return (
    <div role="group" aria-label="Mã xác nhận 6 số" className="flex justify-between gap-[clamp(6px,1.2vw,12px)]">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el
          }}
          value={digit}
          // Typing into a filled box: keep what was typed, whichever side of the old digit it landed.
          onChange={(e) => typeAt(i, digit ? e.target.value.replace(digit, '') : e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={i === 0}
          maxLength={LENGTH}
          disabled={disabled}
          aria-label={`Số thứ ${i + 1}`}
          aria-invalid={invalid ? true : undefined}
          className="aspect-[5/6] w-full max-w-[64px] min-w-0 rounded-[12px] border-2 border-line bg-white text-center font-[inherit] text-[clamp(24px,2.2vw,30px)] font-extrabold text-ink outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_3px_rgba(53,99,233,0.12)] disabled:opacity-60 aria-invalid:border-danger"
        />
      ))}
    </div>
  )
}
