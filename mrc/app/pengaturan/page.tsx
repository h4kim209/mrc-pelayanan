
"use client"
import { useRef } from "react"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, Bell, Shield, MessageSquare, Database, Download, Upload, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { auth } from "@/lib/auth"
import api from "@/lib/api"
import { RotateCcw } from "lucide-react"

const DEFAULT_LOAN_TEMPLATE = `📢 Yth. *{name}*,
Anda telah melakukan peminjaman barang dari *MRC*

🗓 Tanggal Pinjam: *{startDate}*
📋 Barang yang Dipinjam:
{items}

📅 Jatuh Tempo: *{dueDate}*
📌 Keperluan: *{purpose}*
{notes}
⚠️ Mohon untuk mengembalikan barang tepat waktu dalam keadaan *lengkap* dan *baik* sesuai saat dipinjam.

_Maintenance Repair Calibration_ 🛠️`;

const DEFAULT_RETURN_TEMPLATE = `Horeeee🎉

✅ Yth. *{name}*,
Terima kasih sudah mengembalikan barang ke *MRC*!

📋 Barang yang dikembalikan:
{items}

🗓 Tanggal Pinjam: *{startDate}*
📌 Keperluan: *{purpose}*
{notes}
⏳ Durasi peminjaman: *{duration}*

Barang sudah diterima dalam keadaan baik dan lengkap yaa. Kalau butuh bantuan atau mau pinjam lagi, silakan hubungi MRC kapan ajaa 😁✨

_Maintenance Repair Calibration_ 🛠️`;

const DEFAULT_REMINDER_TEMPLATE = `📢 Yth. *{name}*,
Anda *belum mengembalikan* barang yang dipinjam dari *MRC*

🗓 Tanggal Pinjam: *{startDate}*
📋 Barang yang Dipinjam:
{items}

📅 Jatuh Tempo: *{dueDate}*
📌 Keperluan: *{purpose}*
{notes}
⚠️ Mohon untuk mengembalikan barang tepat waktu dalam keadaan *lengkap* dan *baik* sesuai saat dipinjam.

_Maintenance Repair Calibration_ 🛠️

> _Abaikan pesan ini jika sudah mengembalikan_`;


export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  // All settings from settings.json
  const [settings, setSettings] = useState<any>(null)
  const [profileData, setProfileData] = useState({
    name: "",
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [operatorData, setOperatorData] = useState({
    username: "operator",
    password: "",
  })

  // Load settings from API on mount
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login")
      return
    }
    if (auth.isOperator()) {
      toast.error("Akses ditolak: Menu ini hanya untuk Administrator")
      router.push("/")
      return
    }
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        setProfileData((prev) => ({
          ...prev,
          name: data.siteName || "",
          username: data.admin?.username || "",
        }))
        setOperatorData({
          username: data.operator?.username || "operator",
          password: data.operator?.password || "operator123",
        })
      })
  }, [router])

  
  const handleOperatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = {
        ...settings,
        operator: {
          username: operatorData.username || "operator",
          password: operatorData.password || "operator123",
        }
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error("Gagal menyimpan akun operator");
      setSettings(updated);
      toast.success("Akun operator berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan akun operator");
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!profileData.currentPassword) {
      setError("Password saat ini wajib diisi untuk mengubah profil atau password admin.")
      return
    }

    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      setError("Password baru tidak cocok")
      return
    }

    // Validate current password (client-side, for better UX, but real check must be server-side)
    if (profileData.currentPassword !== settings?.admin?.password) {
      setError("Password saat ini salah")
      return
    }

    try {
      // Update settings via API
      const updated = {
        ...settings,
        siteName: profileData.name,
        admin: {
          ...settings.admin,
          username: profileData.username,
          password: profileData.newPassword ? profileData.newPassword : settings.admin?.password || "admin123"
        }
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      })
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan profil")
      setSuccess("Profil berhasil diperbarui")
      setProfileData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
      // Refresh settings from API
      const newSettings = await fetch("/api/settings").then((r) => r.json())
      setSettings(newSettings)
    } catch (err) {
      setError("Gagal memperbarui profil")
    }
  }

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      })
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan notifikasi")
      setSuccess("Pengaturan notifikasi berhasil disimpan")
      // Refresh settings from API
      const newSettings = await fetch("/api/settings").then((r) => r.json())
      setSettings(newSettings)
    } catch (err) {
      setError("Gagal menyimpan pengaturan notifikasi")
    }
  }

  const handleSystemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      })
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan sistem")
      setSuccess("Pengaturan sistem berhasil disimpan")
      // Refresh settings from API
      const newSettings = await fetch("/api/settings").then((r) => r.json())
      setSettings(newSettings)
    } catch (err) {
      setError("Gagal menyimpan pengaturan sistem")
    }
  }

  const handleExportData = async () => {
    try {
      const [items, borrowers, loans] = await Promise.all([api.getItems(), api.getBorrowers(), api.getLoans()])

      const data = {
        items,
        borrowers,
        loans,
        exportDate: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mrc-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess("Data berhasil diekspor")
    } catch (err) {
      setError("Gagal mengekspor data")
    }
  }

  // Handle import file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.items || !data.borrowers || !data.loans) {
        setError("Format file tidak valid. Pastikan file backup dari aplikasi ini.");
        return;
      }
      // Overwrite each database using new API endpoints
      await Promise.all([
        fetch("/api/import/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.items),
        }),
        fetch("/api/import/borrowers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.borrowers),
        }),
        fetch("/api/import/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.loans),
        }),
      ]);
      setSuccess("Data berhasil diimpor dan database ditimpa.");
      // Optionally reload settings or data
      // window.location.reload();
    } catch (err) {
      setError("Gagal mengimpor data. Format file tidak valid atau terjadi kesalahan.");
    }
  }

  const tabs = [
    { id: "profile", name: "Profil", icon: User },
    { id: "notifications", name: "Notifikasi", icon: Bell },
    { id: "system", name: "Sistem", icon: Shield },
    { id: "messages", name: "Pesan", icon: MessageSquare },
    { id: "data", name: "Data", icon: Database },
  ]
  const handleMessagesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      // Save settings to local API
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan pesan");

      // Post aiReply status to external AI endpoint
      await fetch("/external/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !!settings?.messages?.aiReply })
      });

      setSuccess("Pengaturan pesan berhasil disimpan");
      const newSettings = await fetch("/api/settings").then((r) => r.json());
      setSettings(newSettings);
    } catch (err) {
      setError("Gagal menyimpan pengaturan pesan");
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error, { duration: 6000, className: "toast-error" })
    }
  }, [error])

  useEffect(() => {
    if (success) {
      toast.success(success, { duration: 6000, className: "toast-success" })
    }
  }, [success])

  // Poll notifications every 30s, show Sonner toast for new unread
  const lastNotifIdRef = useRef<number | null>(null);
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (data.length > 0 && data[0].id !== lastNotifIdRef.current && !data[0].read) {
          toast.info(data[0].message, { duration: 8000 });
          lastNotifIdRef.current = data[0].id;
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!auth.isAuthenticated() || auth.isOperator()) return null

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-[90rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in duration-200">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Kelola pengaturan aplikasi dan profil Anda</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="card p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-medium"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {tab.name}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="card p-8">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Pengaturan Profil</h2>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nama Lengkap
                        </label>
                        <Input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                        <Input
                          type="text"
                          value={profileData.username}
                          onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ubah Password Admin</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Password Saat Ini
                            </label>
                            <Input
                              type="password"
                              value={profileData.currentPassword}
                              onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                              className="input-field"
                              autoComplete="current-password"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Password Baru
                            </label>
                            <Input
                              type="password"
                              value={profileData.newPassword}
                              onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                              className="input-field"
                              autoComplete="new-password"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Konfirmasi Password Baru
                            </label>
                            <Input
                              type="password"
                              value={profileData.confirmPassword}
                              onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                              className="input-field"
                              autoComplete="new-password"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn-primary">
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Akun Operator (Hak Akses Terbatas)</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Operator hanya memiliki izin untuk mengakses menu <strong>Dashboard</strong>, <strong>Peminjaman</strong>, dan <strong>Pengembalian</strong>.
                        </p>
                      </div>
                      <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Role: Operator
                      </span>
                    </div>
                    <form onSubmit={handleOperatorSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username Operator</label>
                          <Input
                            type="text"
                            value={operatorData.username}
                            onChange={(e) => setOperatorData({ ...operatorData, username: e.target.value })}
                            className="input-field"
                            placeholder="operator"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Operator</label>
                          <Input
                            type="text"
                            value={operatorData.password}
                            onChange={(e) => setOperatorData({ ...operatorData, password: e.target.value })}
                            className="input-field"
                            placeholder="operator123"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white flex items-center">
                          <Save className="w-4 h-4 mr-2" />
                          Simpan Akun Operator
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Pengaturan Notifikasi</h2>
                  <form onSubmit={handleNotificationSubmit} className="space-y-6">
                    <div className="space-y-4">
                       {([
                         {
                           key: "overdueReminders",
                           label: "Pengingat Terlambat",
                           desc: "Pengingat untuk peminjaman yang terlambat",
                         },
                         {
                           key: "returnReminders",
                           label: "Pengingat Pengembalian",
                           desc: "Pengingat sebelum jatuh tempo",
                         },
                       ]).map((item) => (
                         <div
                           key={item.key}
                           className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                         >
                           <div>
                             <h3 className="font-medium text-gray-900 dark:text-white">{item.label}</h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <Input
                               type="checkbox"
                               checked={Boolean(settings?.notifications?.[item.key])}
                               onChange={(e) =>
                                 setSettings((prev: any) => ({
                                   ...prev,
                                   notifications: {
                                     ...(prev?.notifications || {}),
                                     [item.key]: e.target.checked,
                                   },
                                 }))
                               }
                               className="sr-only peer"
                             />
                             <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-600 transition-all"></div>
                           </label>
                         </div>
                       ))}
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn-primary">
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Pengaturan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* System Tab */}
              {activeTab === "system" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Pengaturan Sistem</h2>
                  <form onSubmit={handleSystemSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Durasi Peminjaman Default (hari)
                        </label>
                       <Input
                         type="number"
                         min="0"
                         max="30"
                         value={settings?.system?.defaultLoanDays ?? ""}
                         onChange={(e) =>
                           setSettings((prev: any) => ({
                             ...prev,
                             system: {
                               ...prev.system,
                               defaultLoanDays: Number.parseInt(e.target.value) || 0,
                             },
                           }))
                         }
                         className="input-field"
                       />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Maksimal Item per Peminjaman
                        </label>
                       <Input
                         type="number"
                         min="1"
                         max="50"
                         value={settings?.system?.maxLoanItems ?? ""}
                         onChange={(e) =>
                           setSettings((prev: any) => ({
                             ...prev,
                             system: {
                               ...prev.system,
                               maxLoanItems: Number.parseInt(e.target.value) || 0,
                             },
                           }))
                         }
                         className="input-field"
                       />
                      </div>
                    </div>

                    <div className="space-y-4">
                       {[
                         {
                           key: "borrowConfirmation",
                           label: "Konfirmasi Peminjaman",
                           desc: "Peminjaman memerlukan konfirmasi terlebih dahulu",
                         },
                         {
                           key: "returnConfirmation",
                           label: "Konfirmasi Pengembalian",
                           desc: "Pengembalian memerlukan konfirmasi terlebih dahulu",
                         },
                       ].map((item) => (
                         <div
                           key={item.key}
                           className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                         >
                           <div>
                             <h3 className="font-medium text-gray-900 dark:text-white">{item.label}</h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <Input
                               type="checkbox"
                               checked={!!settings?.system?.[item.key]}
                               onChange={(e) =>
                                 setSettings((prev: any) => ({
                                   ...prev,
                                   system: {
                                     ...prev.system,
                                     [item.key]: e.target.checked,
                                   },
                                 }))
                               }
                               className="sr-only peer"
                             />
                             <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-600 transition-all"></div>
                           </label>
                         </div>
                       ))}
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn-primary">
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Pengaturan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Messages Tab */}
              {activeTab === "messages" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pengaturan & Template Pesan WhatsApp</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola fitur dan sesuaikan format teks pesan WhatsApp yang dikirim ke peminjam.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Kembalikan seluruh template pesan WA ke teks default bawaan?")) {
                          setSettings((prev: any) => ({
                            ...prev,
                            messages: {
                              ...(prev?.messages || {}),
                              loanTemplate: DEFAULT_LOAN_TEMPLATE,
                              returnTemplate: DEFAULT_RETURN_TEMPLATE,
                              reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
                            }
                          }));
                          toast.info("Template pesan di-reset ke default. Jangan lupa klik Simpan.");
                        }
                      }}
                      className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reset Template Bawaan
                    </button>
                  </div>

                  <form onSubmit={handleMessagesSubmit} className="space-y-6">
                    {/* Switch Toggles */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Aktifkan Notifikasi WhatsApp</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: "aiReply", label: "Balasan AI Otomatis", desc: "Aktifkan balasan otomatis dari AI saat pesan masuk." },
                          { key: "loanMessage", label: "Pesan Peminjaman", desc: "Kirim WhatsApp otomatis saat peminjaman dicatat." },
                          { key: "returnMessage", label: "Pesan Pengembalian", desc: "Kirim WhatsApp otomatis saat barang dikembalikan." },
                          { key: "reminderMessage", label: "Pesan Pengingat", desc: "Aktifkan fitur tombol kirim pengingat jatuh tempo." },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200/60 dark:border-gray-700">
                            <div>
                              <h4 className="font-medium text-sm text-gray-900 dark:text-white">{item.label}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-3 flex-shrink-0">
                              <Input
                                type="checkbox"
                                checked={!!settings?.messages?.[item.key]}
                                onChange={e => setSettings((prev: any) => ({
                                  ...prev,
                                  messages: {
                                    ...(prev?.messages || {}),
                                    [item.key]: e.target.checked,
                                  },
                                }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-600 transition-all"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Placeholder Info Box */}
                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2">
                        💡 Tag / Variabel yang Dapat Digunakan Dalam Pesan:
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700">
                          <code className="text-blue-600 dark:text-blue-400 font-bold">&#123;name&#125;</code>
                          <p className="text-gray-500 text-[11px] mt-0.5">Nama Peminjam/Guru</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700">
                          <code className="text-blue-600 dark:text-blue-400 font-bold">&#123;items&#125;</code>
                          <p className="text-gray-500 text-[11px] mt-0.5">Daftar Barang & Qty</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700">
                          <code className="text-blue-600 dark:text-blue-400 font-bold">&#123;startDate&#125;</code>
                          <p className="text-gray-500 text-[11px] mt-0.5">Waktu Pinjam (WIB)</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700">
                          <code className="text-blue-600 dark:text-blue-400 font-bold">&#123;dueDate&#125;</code>
                          <p className="text-gray-500 text-[11px] mt-0.5">Tanggal Jatuh Tempo</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700">
                          <code className="text-blue-600 dark:text-blue-400 font-bold">&#123;purpose&#125;</code>
                          <p className="text-gray-500 text-[11px] mt-0.5">Keperluan Peminjaman</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700">
                          <code className="text-blue-600 dark:text-blue-400 font-bold">&#123;notes&#125;</code>
                          <p className="text-gray-500 text-[11px] mt-0.5">Catatan Tambahan</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700 col-span-2">
                          <code className="text-blue-600 dark:text-blue-400 font-bold">&#123;duration&#125;</code>
                          <p className="text-gray-500 text-[11px] mt-0.5">Lama Waktu Pinjam (Khusus Pesan Pengembalian)</p>
                        </div>
                      </div>
                    </div>

                    {/* Template 1: Peminjaman */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">
                          Format Pesan WhatsApp: Peminjaman Barang
                        </label>
                        <span className="text-xs text-gray-500">Terkirim otomatis saat peminjaman dibuat</span>
                      </div>
                      <textarea
                        rows={7}
                        value={settings?.messages?.loanTemplate ?? DEFAULT_LOAN_TEMPLATE}
                        onChange={(e) =>
                          setSettings((prev: any) => ({
                            ...prev,
                            messages: {
                              ...(prev?.messages || {}),
                              loanTemplate: e.target.value,
                            },
                          }))
                        }
                        className="w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 outline-none leading-relaxed"
                        placeholder="Ketik format template pesan peminjaman..."
                      />
                    </div>

                    {/* Template 2: Pengembalian */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">
                          Format Pesan WhatsApp: Pengembalian Barang
                        </label>
                        <span className="text-xs text-gray-500">Terkirim otomatis saat barang ditandai kembali</span>
                      </div>
                      <textarea
                        rows={7}
                        value={settings?.messages?.returnTemplate ?? DEFAULT_RETURN_TEMPLATE}
                        onChange={(e) =>
                          setSettings((prev: any) => ({
                            ...prev,
                            messages: {
                              ...(prev?.messages || {}),
                              returnTemplate: e.target.value,
                            },
                          }))
                        }
                        className="w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 outline-none leading-relaxed"
                        placeholder="Ketik format template pesan pengembalian..."
                      />
                    </div>

                    {/* Template 3: Pengingat */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">
                          Format Pesan WhatsApp: Pengingat / Jatuh Tempo
                        </label>
                        <span className="text-xs text-gray-500">Terkirim saat tombol Ingatkan diklik di tabel</span>
                      </div>
                      <textarea
                        rows={7}
                        value={settings?.messages?.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE}
                        onChange={(e) =>
                          setSettings((prev: any) => ({
                            ...prev,
                            messages: {
                              ...(prev?.messages || {}),
                              reminderTemplate: e.target.value,
                            },
                          }))
                        }
                        className="w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 outline-none leading-relaxed"
                        placeholder="Ketik format template pesan pengingat..."
                      />
                    </div>

                    <div className="flex justify-end pt-3">
                      <button type="submit" className="btn-primary">
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Seluruh Pengaturan Pesan
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {/* Data Tab */}
              {activeTab === "data" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Manajemen Data</h2>
                  <div className="space-y-6">
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Ekspor Data</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                        Unduh semua data aplikasi dalam format JSON untuk backup atau migrasi.
                      </p>
                      <button onClick={handleExportData} className="flex items-center px-5 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition-colors shadow-sm">
                        <Download className="w-4 h-4 mr-2" />
                        Ekspor Data
                      </button>
                    </div>

                    <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <h3 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Impor Data</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
                        Impor data dari file backup. Pastikan format file sesuai dengan ekspor aplikasi.
                      </p>
                      <Input type="file" accept=".json" className="hidden" id="import-file" onChange={handleImportFile} />
                      <label htmlFor="import-file" className="flex w-max items-center px-5 py-2 rounded-lg font-medium bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-400 transition-colors shadow-sm cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Pilih File
                      </label>
                    </div>

                    <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <h3 className="font-medium text-red-900 dark:text-red-300 mb-2">Reset Data</h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                        Hapus semua data aplikasi. Tindakan ini tidak dapat dibatalkan!
                      </p>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan!",
                            )
                          ) {
                            localStorage.clear()
                            setSuccess("Data berhasil direset")
                          }
                        }}
                        className={`flex items-center px-5 py-2 rounded-lg font-medium bg-red-600 text-white focus:ring-2 focus:ring-red-400 transition-colors shadow-sm disabled:opacity-50 ${
                          !true ? "hover:bg-red-700" : ""
                        }`}
                        disabled={true}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset Semua Data
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
