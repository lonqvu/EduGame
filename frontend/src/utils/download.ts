/** Saves text (a CSV) or a file from the server in the browser's downloads. */
export function download(fileName: string, content: string | Blob) {
  const url = URL.createObjectURL(typeof content === 'string' ? new Blob([content], { type: 'text/csv;charset=utf-8' }) : content)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
