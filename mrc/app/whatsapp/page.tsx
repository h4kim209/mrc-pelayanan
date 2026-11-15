"use client";

import { toast } from "sonner";

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Send, Wifi, WifiOff, QrCode, LogOut, RefreshCw, Search, ArrowLeft, Loader2 } from "lucide-react"
import { auth } from "@/lib/auth"
import { cn } from "@/lib/utils"

type WaMessage = {
  id: string
  from: string
  pushName: string
  text: string
  timestamp: number
  fromMe: boolean
}

type ChatContact = {
  jid: string
  pushName: string
  lastMessage: string
  lastTimestamp: number
  unread: number
}

export default function WhatsAppPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting" | "qr">("disconnected")
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const prevMsgCount = useRef(0)

  // Auth check
  useEffect(() => {
    const user = auth.getCurrentUser()
    if (!user) {
      router.push("/login")
      return
    }
    if (auth.isOperator()) {
      toast.error("Akses ditolak: Menu ini hanya untuk Administrator")
      router.push("/")
      return
    }
  }, [router])

  // Poll status & messages
  const fetchData = useCallback(async () => {
    try {
      const [statusRes, msgRes] = await Promise.all([
        fetch("/wa/status"),
        fetch("/wa/messages"),
      ])
      const statusData = await statusRes.json()
      const msgData = await msgRes.json()

      setStatus(statusData.status)
      setQrDataUrl(statusData.qrDataUrl || null)

      // Merge messages
      const allMessages: WaMessage[] = msgData.messages || []
      setMessages(allMessages)

      // Build contact list from messages
      const contactMap = new Map<string, ChatContact>()
      for (const msg of allMessages) {
        if (!msg.from || !msg.from.endsWith("@s.whatsapp.net")) continue
        const existing = contactMap.get(msg.from)
        const ts = typeof msg.timestamp === "number" ? msg.timestamp : 0
        if (!existing) {
          contactMap.set(msg.from, {
            jid: msg.from,
            pushName: msg.pushName || msg.from.replace("@s.whatsapp.net", ""),
            lastMessage: msg.text,
            lastTimestamp: ts,
            unread: msg.fromMe ? 0 : 1,
          })
        } else {
          if (ts >= existing.lastTimestamp) {
            existing.lastMessage = msg.text
            existing.lastTimestamp = ts
            if (msg.pushName && msg.pushName !== "") {
              existing.pushName = msg.pushName
            }
          }
          if (!msg.fromMe) {
            existing.unread += 1
          }
        }
      }
      const sortedContacts = Array.from(contactMap.values()).sort(
        (a, b) => b.lastTimestamp - a.lastTimestamp
      )
      setContacts(sortedContacts)
    } catch (err) {
      console.error("Fetch WA data error:", err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Auto-scroll chat
  useEffect(() => {
    if (messages.length !== prevMsgCount.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
      prevMsgCount.current = messages.length
    }
  }, [messages])

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat || sending) return
    setSending(true)
    try {
      await fetch("/wa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jid: selectedChat, text: inputText.trim() }),
      })
      setInputText("")
      // Immediately fetch to show sent message
      await fetchData()
    } catch (err) {
      console.error("Send error:", err)
    }
    setSending(false)
  }

  // Logout
  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch("/wa/logout", { method: "POST" })
      setStatus("disconnected")
      setQrDataUrl(null)
    } catch (err) {
      console.error("Logout error:", err)
    }
    setLoggingOut(false)
  }

  // Filter contacts by search
  const filteredContacts = contacts.filter(
    (c) =>
      c.pushName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.jid.includes(searchQuery)
  )

  // Messages for selected chat
  const chatMessages = messages.filter((m) => m.from === selectedChat)

  // Format phone number
  const formatPhone = (jid: string) => {
    const num = jid.replace("@s.whatsapp.net", "")
    if (num.startsWith("62")) return "+62 " + num.slice(2)
    return num
  }

  // Format timestamp
  const formatTime = (ts: number) => {
    if (!ts) return ""
    const d = new Date(ts * 1000)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
  }

  const formatDate = (ts: number) => {
    if (!ts) return ""
    const d = new Date(ts * 1000)
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
  }

  // Status badge
  const StatusBadge = () => {
    const colors = {
      connected: "bg-green-500",
      disconnected: "bg-red-500",
      connecting: "bg-yellow-500",
      qr: "bg-blue-500",
    }
    const labels = {
      connected: "Terhubung",
      disconnected: "Terputus",
      connecting: "Menghubungkan...",
      qr: "Scan QR Code",
    }
    return (
      <div className="flex items-center gap-2">
        <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", colors[status])} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{labels[status]}</span>
      </div>
    )
  }

  // QR Screen
  if (status === "qr" || (status === "disconnected" && !qrDataUrl) || status === "connecting") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {status === "qr"
                ? "Scan QR Code dari WhatsApp di HP Anda"
                : status === "connecting"
                ? "Menghubungkan ke WhatsApp..."
                : "Menunggu QR Code..."}
            </p>
          </div>

          {/* QR Code */}
          {qrDataUrl ? (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 inline-block">
              <img
                src={qrDataUrl}
                alt="WhatsApp QR Code"
                className="w-64 h-64 mx-auto"
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 inline-block">
              <div className="w-64 h-64 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>1. Buka WhatsApp di HP</p>
            <p>2. Ketuk Menu / Titik tiga &gt; Perangkat tertaut</p>
            <p>3. Ketuk &quot;Tautkan Perangkat&quot;</p>
            <p>4. Arahkan kamera ke QR Code di atas</p>
          </div>

          <StatusBadge />
        </div>
      </div>
    )
  }

  // Main Chat Dashboard
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-1rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">WhatsApp</h1>
            <StatusBadge />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Logout WA
          </button>
        </div>
      </div>

      {/* Chat layout */}
      <div className="flex flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-b-xl overflow-hidden">
        {/* Contact list */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col",
            selectedChat ? "hidden md:flex" : "flex"
          )}
        >
          {/* Search */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kontak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8">
                <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Belum ada percakapan</p>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.jid}
                  onClick={() => setSelectedChat(contact.jid)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left border-b border-gray-50 dark:border-gray-800/50",
                    selectedChat === contact.jid && "bg-green-50 dark:bg-green-900/10 border-l-2 border-l-green-500"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {(contact.pushName || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {contact.pushName || formatPhone(contact.jid)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(contact.lastTimestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {contact.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        <div
          className={cn(
            "flex-1 flex flex-col",
            !selectedChat ? "hidden md:flex" : "flex"
          )}
        >
          {selectedChat ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {(contacts.find((c) => c.jid === selectedChat)?.pushName || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {contacts.find((c) => c.jid === selectedChat)?.pushName || formatPhone(selectedChat)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPhone(selectedChat)}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] dark:bg-gray-950/50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <p className="text-sm">Belum ada pesan</p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg, idx) => {
                      // Show date separator
                      const showDate =
                        idx === 0 ||
                        formatDate(msg.timestamp) !== formatDate(chatMessages[idx - 1]?.timestamp)
                      return (
                        <React.Fragment key={msg.id + "-" + idx}>
                          {showDate && msg.timestamp > 0 && (
                            <div className="flex justify-center my-2">
                              <span className="px-3 py-1 rounded-lg bg-white/80 dark:bg-gray-800/80 text-xs text-gray-500 dark:text-gray-400 shadow-sm">
                                {formatDate(msg.timestamp)}
                              </span>
                            </div>
                          )}
                          <div className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}>
                            <div
                              className={cn(
                                "max-w-[75%] px-3 py-2 rounded-xl shadow-sm text-sm whitespace-pre-wrap break-words",
                                msg.fromMe
                                  ? "bg-[#d9fdd3] dark:bg-green-900/60 text-gray-900 dark:text-green-100 rounded-tr-none"
                                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none"
                              )}
                            >
                              {!msg.fromMe && msg.pushName && (
                                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-0.5">
                                  {msg.pushName}
                                </div>
                              )}
                              <div>{msg.text}</div>
                              <div className={cn("text-[10px] mt-1 text-right", msg.fromMe ? "text-gray-500 dark:text-green-300/60" : "text-gray-400 dark:text-gray-500")}>
                                {formatTime(msg.timestamp)}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ketik pesan..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition"
                    disabled={status !== "connected"}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending || status !== "connected"}
                    className="p-2.5 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white transition-colors shadow-md"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* No chat selected */
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/20 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-green-500/50" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-400">WhatsApp MRC</h2>
                <p className="text-sm mt-1">Pilih percakapan untuk mulai membalas pesan</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
