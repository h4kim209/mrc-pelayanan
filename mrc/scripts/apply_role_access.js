const fs = require('fs');
const path = require('path');

// 1. Update mrc/app/login/page.tsx placeholder & hint
const loginPath = path.join(__dirname, '..', 'app', 'login', 'page.tsx');
let login = fs.readFileSync(loginPath, 'utf-8');
login = login.replace('placeholder="admin"', 'placeholder="admin / operator"');
login = login.replace(
  '<p className="mt-2 text-gray-600 dark:text-gray-400">Masuk ke akun untuk melanjutkan</p>',
  '<p className="mt-2 text-gray-600 dark:text-gray-400">Masuk sebagai Administrator atau Operator</p>'
);
fs.writeFileSync(loginPath, login, 'utf-8');
console.log('login/page.tsx updated');

// 2. Protect barang/page.tsx
const barangPath = path.join(__dirname, '..', 'app', 'barang', 'page.tsx');
let barang = fs.readFileSync(barangPath, 'utf-8');
if (!barang.includes('auth.isOperator()')) {
  barang = barang.replace(
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login")
      return
    }
    loadItems()
  }, [router])`,
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login")
      return
    }
    if (auth.isOperator()) {
      toast.error("Akses ditolak: Menu ini hanya untuk Administrator")
      router.push("/")
      return
    }
    loadItems()
  }, [router])`
  );
  barang = barang.replace(
    'if (!auth.isAuthenticated()) return null',
    'if (!auth.isAuthenticated() || auth.isOperator()) return null'
  );
  fs.writeFileSync(barangPath, barang, 'utf-8');
  console.log('barang/page.tsx protected');
}

// 3. Protect peminjam/page.tsx
const peminjamPath = path.join(__dirname, '..', 'app', 'peminjam', 'page.tsx');
let peminjam = fs.readFileSync(peminjamPath, 'utf-8');
if (!peminjam.includes('auth.isOperator()')) {
  peminjam = peminjam.replace(
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login")
      return
    }
    loadBorrowers()
  }, [router])`,
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login")
      return
    }
    if (auth.isOperator()) {
      toast.error("Akses ditolak: Menu ini hanya untuk Administrator")
      router.push("/")
      return
    }
    loadBorrowers()
  }, [router])`
  );
  peminjam = peminjam.replace(
    'if (!auth.isAuthenticated()) return null',
    'if (!auth.isAuthenticated() || auth.isOperator()) return null'
  );
  fs.writeFileSync(peminjamPath, peminjam, 'utf-8');
  console.log('peminjam/page.tsx protected');
}

// 4. Protect booking/page.tsx
const bookingPath = path.join(__dirname, '..', 'app', 'booking', 'page.tsx');
let booking = fs.readFileSync(bookingPath, 'utf-8');
if (!booking.includes('auth.isOperator()')) {
  // Add auth import if not present
  if (!booking.includes('import { auth }')) {
    booking = `import { auth } from "@/lib/auth";\nimport { useRouter } from "next/navigation";\nimport { toast } from "sonner";\n` + booking;
  }
  // Add router inside BookingAdminPage
  booking = booking.replace(
    'export default function BookingAdminPage() {',
    `export default function BookingAdminPage() {\n    const router = useRouter();`
  );
  booking = booking.replace(
    `    useEffect(() => {
        setIsLoading(true);`,
    `    useEffect(() => {
        if (!auth.isAuthenticated()) {
            router.push("/login");
            return;
        }
        if (auth.isOperator()) {
            toast.error("Akses ditolak: Menu ini hanya untuk Administrator");
            router.push("/");
            return;
        }
        setIsLoading(true);`
  );
  booking = booking.replace(
    'return (\n        <div className="min-h-screen gradient-bg">',
    'if (!auth.isAuthenticated() || auth.isOperator()) return null;\n    return (\n        <div className="min-h-screen gradient-bg">'
  );
  fs.writeFileSync(bookingPath, booking, 'utf-8');
  console.log('booking/page.tsx protected');
}

// 5. Protect riwayat/page.tsx
const riwayatPath = path.join(__dirname, '..', 'app', 'riwayat', 'page.tsx');
let riwayat = fs.readFileSync(riwayatPath, 'utf-8');
if (!riwayat.includes('auth.isOperator()')) {
  riwayat = riwayat.replace(
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadLoans();
  }, [router]);`,
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (auth.isOperator()) {
      toast.error("Akses ditolak: Menu ini hanya untuk Administrator");
      router.push("/");
      return;
    }
    loadLoans();
  }, [router]);`
  );
  riwayat = riwayat.replace(
    'if (!auth.isAuthenticated()) return null;',
    'if (!auth.isAuthenticated() || auth.isOperator()) return null;'
  );
  fs.writeFileSync(riwayatPath, riwayat, 'utf-8');
  console.log('riwayat/page.tsx protected');
}

// 6. Protect whatsapp/page.tsx
const whatsappPath = path.join(__dirname, '..', 'app', 'whatsapp', 'page.tsx');
let whatsapp = fs.readFileSync(whatsappPath, 'utf-8');
if (!whatsapp.includes('auth.isOperator()')) {
  if (!whatsapp.includes('toast')) {
    whatsapp = `import { toast } from "sonner";\n` + whatsapp;
  }
  whatsapp = whatsapp.replace(
    `    if (!user) {
      router.push("/login")
    }`,
    `    if (!user) {
      router.push("/login")
      return
    }
    if (auth.isOperator()) {
      toast.error("Akses ditolak: Menu ini hanya untuk Administrator")
      router.push("/")
      return
    }`
  );
  whatsapp = whatsapp.replace(
    'if (!user) return null',
    'if (!user || auth.isOperator()) return null'
  );
  fs.writeFileSync(whatsappPath, whatsapp, 'utf-8');
  console.log('whatsapp/page.tsx protected');
}

// 7. Protect stats/page.tsx
const statsPath = path.join(__dirname, '..', 'app', 'stats', 'page.tsx');
if (fs.existsSync(statsPath)) {
  let stats = fs.readFileSync(statsPath, 'utf-8');
  if (!stats.includes('auth.isOperator()')) {
    stats = stats.replace(
      `        if (!auth.isAuthenticated()) {
            router.push("/login");
        }`,
      `        if (!auth.isAuthenticated()) {
            router.push("/login");
            return;
        }
        if (auth.isOperator()) {
            router.push("/");
            return;
        }`
    );
    stats = stats.replace(
      'if (!auth.isAuthenticated()) return null;',
      'if (!auth.isAuthenticated() || auth.isOperator()) return null;'
    );
    fs.writeFileSync(statsPath, stats, 'utf-8');
    console.log('stats/page.tsx protected');
  }
}

// 8. Protect analisis/AnalisisCharts.tsx
const analisisPath = path.join(__dirname, '..', 'app', 'analisis', 'AnalisisCharts.tsx');
if (fs.existsSync(analisisPath)) {
  let analisis = fs.readFileSync(analisisPath, 'utf-8');
  if (!analisis.includes('auth.isOperator()')) {
    analisis = `import { auth } from "@/lib/auth";\nimport { useRouter } from "next/navigation";\nimport { toast } from "sonner";\n` + analisis;
    analisis = analisis.replace(
      'export default function AnalisisCharts({',
      `export default function AnalisisCharts({`
    );
    // insert useEffect hook
    const hookCheck = `    const router = useRouter();
    useEffect(() => {
        if (!auth.isAuthenticated()) {
            router.push("/login");
            return;
        }
        if (auth.isOperator()) {
            toast.error("Akses ditolak: Menu ini hanya untuk Administrator");
            router.push("/");
            return;
        }
    }, [router]);
    if (!auth.isAuthenticated() || auth.isOperator()) return null;
`;
    analisis = analisis.replace(
      'const activeItemsDB = itemsList || itemsDB;',
      hookCheck + '    const activeItemsDB = itemsList || itemsDB;'
    );
    fs.writeFileSync(analisisPath, analisis, 'utf-8');
    console.log('analisis/AnalisisCharts.tsx protected');
  }
}

// 9. Update pengaturan/page.tsx (protect + add Operator settings form)
const pengaturanPath = path.join(__dirname, '..', 'app', 'pengaturan', 'page.tsx');
let pengaturan = fs.readFileSync(pengaturanPath, 'utf-8');

if (!pengaturan.includes('auth.isOperator()')) {
  pengaturan = pengaturan.replace(
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login")
      return
    }
    fetch("/api/settings")`,
    `  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login")
      return
    }
    if (auth.isOperator()) {
      toast.error("Akses ditolak: Menu ini hanya untuk Administrator")
      router.push("/")
      return
    }
    fetch("/api/settings")`
  );

  pengaturan = pengaturan.replace(
    'if (!auth.isAuthenticated()) return null',
    'if (!auth.isAuthenticated() || auth.isOperator()) return null'
  );

  // Add operatorData state
  pengaturan = pengaturan.replace(
    `  const [profileData, setProfileData] = useState({
    name: "",
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })`,
    `  const [profileData, setProfileData] = useState({
    name: "",
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [operatorData, setOperatorData] = useState({
    username: "operator",
    password: "",
  })`
  );

  // Load operatorData in useEffect
  pengaturan = pengaturan.replace(
    `        setProfileData((prev) => ({
          ...prev,
          name: data.siteName || "",
          username: data.admin?.username || "",
        }))`,
    `        setProfileData((prev) => ({
          ...prev,
          name: data.siteName || "",
          username: data.admin?.username || "",
        }))
        setOperatorData({
          username: data.operator?.username || "operator",
          password: data.operator?.password || "operator123",
        })`
  );

  // Add handleOperatorSubmit
  const opSubmitCode = `
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
`;
  pengaturan = pengaturan.replace('const handleProfileSubmit', opSubmitCode + '\n  const handleProfileSubmit');

  // Add operator section UI after admin form in profile tab
  const opUI = `
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
`;
  pengaturan = pengaturan.replace('</form>\n                </div>\n              )}', '</form>\n' + opUI + '\n                </div>\n              )}');

  fs.writeFileSync(pengaturanPath, pengaturan, 'utf-8');
  console.log('pengaturan/page.tsx updated with operator management');
}
