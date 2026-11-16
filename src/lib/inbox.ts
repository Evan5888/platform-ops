import type { InboxFile } from './types'

export async function fetchInbox(): Promise<{ folder: string; files: InboxFile[] }> {
  const response = await fetch('/api/inbox', { cache: 'no-store' })
  if (!response.ok) throw new Error('收件夹暂时读不到')
  const body = (await response.json()) as { folder?: unknown; files?: unknown }
  if (typeof body.folder !== 'string' || !Array.isArray(body.files)) throw new Error('收件夹暂时读不到')
  const files = body.files.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const file = item as InboxFile
    if (typeof file.name !== 'string' || typeof file.bytes !== 'number' || typeof file.modifiedAt !== 'string') return []
    return [file]
  })
  return { folder: body.folder, files }
}

export async function fetchInboxFile(name: string): Promise<ArrayBuffer> {
  const response = await fetch(`/api/inbox/file?name=${encodeURIComponent(name)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`读不到文件 ${name}`)
  return response.arrayBuffer()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
