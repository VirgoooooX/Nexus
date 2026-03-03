import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateInTimeZone(timeZone: string, date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

export function formatTimeInTimeZone(timeZone: string, date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ""
  return `${get("hour")}:${get("minute")}`
}

export function stripHtmlToText(html: string) {
  if (!html) return ""
  let s = String(html)
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
  s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
  s = s.replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)\b[^>]*>/gi, "\n")
  s = s.replace(/<[^>]+>/g, " ")
  s = s.replace(/&nbsp;/gi, " ")
  s = s.replace(/&amp;/gi, "&")
  s = s.replace(/&lt;/gi, "<")
  s = s.replace(/&gt;/gi, ">")
  s = s.replace(/&quot;/gi, '"')
  s = s.replace(/&#39;/gi, "'")
  s = s.replace(/\r\n/g, "\n")
  s = s.replace(/[ \t\f\v]+/g, " ")
  s = s.replace(/ *\n */g, "\n")
  s = s.replace(/\n{3,}/g, "\n\n")
  return s.trim()
}

export function truncateText(text: string, maxLen: number) {
  const s = String(text || "")
  if (maxLen <= 0) return ""
  return s.length > maxLen ? s.slice(0, maxLen) : s
}
