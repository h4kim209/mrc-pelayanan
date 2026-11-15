export interface User {
  id: string
  username: string
  name: string
  role: "admin" | "operator"
}

class AuthService {
  private readonly STORAGE_KEY = "school_borrowing_user"

  async login(username: string, password: string): Promise<User> {
    // Fetch admin & operator credentials from /api/settings
    const res = await fetch("/api/settings")
    if (!res.ok) throw new Error("Gagal mengambil data akun")
    const settings = await res.json()
    const admin = settings.admin || { username: "admin", password: "nesas1965!" }
    const operator = settings.operator || { username: "operator", password: "operator123" }

    if (username === admin.username && password === admin.password) {
      const user: User = {
        id: "admin-1",
        username: admin.username,
        name: settings.siteName || "Administrator",
        role: "admin",
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      }
      return user
    } else if (username === operator.username && password === operator.password) {
      const user: User = {
        id: "operator-1",
        username: operator.username,
        name: "Operator MRC",
        role: "operator",
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      }
      return user
    } else {
      throw new Error("Username atau password salah")
    }
  }

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem(this.STORAGE_KEY)
      if (!userData) return null
      try {
        const u = JSON.parse(userData)
        if (!u.role) u.role = "admin"
        return u
      } catch {
        return null
      }
    }
    return null
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  getRole(): "admin" | "operator" | null {
    const user = this.getCurrentUser()
    return user ? user.role || "admin" : null
  }

  isAdmin(): boolean {
    return this.getRole() === "admin"
  }

  isOperator(): boolean {
    return this.getRole() === "operator"
  }

  canAccess(path: string): boolean {
    const role = this.getRole()
    if (!role) return false
    if (role === "admin") return true
    // Operator hanya bisa akses: Dashboard (/), Peminjaman (/peminjaman), Pengembalian (/pengembalian), dan print BAST (/print/bast)
    const allowed = ["/", "/peminjaman", "/pengembalian"]
    return allowed.includes(path) || path.startsWith("/print")
  }
}

export const auth = new AuthService()
