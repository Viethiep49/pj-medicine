/**
 * AdminDashboard — "Control Room" giao diện quản trị tối màu
 * Phong cách Grafana / Bloomberg terminal dành cho hệ thống Drug-Pred AI
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  BrainCircuit,
  FileText,
  Pill,
  Zap,
  RefreshCw,
  ArrowLeft,
  LogOut,
  Eye,
  EyeOff,
  Trash2,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { api } from "../services/api";

// ============================================================================
// TYPES
// ============================================================================

interface AdminDashboardProps {
  onBack: () => void;
  onLogout: () => void;
}

interface AdminStats {
  total_users: number;
}

interface AnalyticsOverview {
  total_predictions: number;
  total_records: number;
  total_drug_groups: number;
}

interface PredictionSummary {
  average_confidence: number;
}

interface DailyUsageItem {
  date: string;
  count: number;
}

interface DrugGroupDistItem {
  group: string;
  count: number;
}

interface SeverityItem {
  severity: string;
  count: number;
}

interface StatusItem {
  status: string;
  count: number;
}

interface SymptomItem {
  symptom: string;
  count: number;
}

interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface HealthStatus {
  online: boolean;
  latencyMs: number | null;
  mlModel: string;
  dbStatus: string;
}

interface NewUserForm {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  doctor: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
  nurse: "bg-green-500/20 text-green-400 border border-green-500/30",
  researcher: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "#22c55e",
  moderate: "#f59e0b",
  severe: "#f97316",
  critical: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  predicted: "#06b6d4",
  confirmed: "#22c55e",
  archived: "#64748b",
};

const RECHARTS_TOOLTIP_STYLE = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  borderRadius: "8px",
  fontSize: "12px",
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Chấm nhấp nháy trạng thái */
function PulseDot({ color = "green" }: { color?: "green" | "red" | "amber" }) {
  const colorMap = {
    green: "bg-green-500",
    red: "bg-rose-500",
    amber: "bg-amber-500",
  };
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap[color]} opacity-75`}
      />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colorMap[color]}`} />
    </span>
  );
}

/** Skeleton loading dành cho từng panel */
function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-700/50 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

/** KPI card */
function KpiCard({
  icon,
  value,
  label,
  sub,
  accentClass,
  loading,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  accentClass: string;
  loading: boolean;
}) {
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentClass}`}>
        {icon}
      </div>
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : (
        <>
          <span className="font-mono text-2xl font-bold text-slate-100">{value}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
          {sub && <span className="text-xs text-slate-500">{sub}</span>}
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminDashboard({ onBack, onLogout }: AdminDashboardProps) {
  // --- Clock ---
  const [clock, setClock] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("vi-VN", { hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // --- Data states ---
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [predSummary, setPredSummary] = useState<PredictionSummary | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageItem[]>([]);
  const [drugDist, setDrugDist] = useState<DrugGroupDistItem[]>([]);
  const [severityData, setSeverityData] = useState<SeverityItem[]>([]);
  const [statusData, setStatusData] = useState<StatusItem[]>([]);
  const [symptomsData, setSymptomsData] = useState<SymptomItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // --- Loading states per panel ---
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingDrug, setLoadingDrug] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSeverity, setLoadingSeverity] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingSymptoms, setLoadingSymptoms] = useState(true);

  // --- Health ---
  const [health, setHealth] = useState<HealthStatus>({
    online: false,
    latencyMs: null,
    mlModel: "—",
    dbStatus: "—",
  });

  // --- User management ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "doctor",
  });
  const [addingUser, setAddingUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  // --- Refresh counter ---
  const [refreshKey, setRefreshKey] = useState(0);
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Fetch helpers ----
  const fetchKpi = useCallback(async () => {
    setLoadingKpi(true);
    try {
      const [statsRes, ovRes, sumRes] = await Promise.allSettled([
        api.get<AdminStats>("/admin/stats"),
        api.get<AnalyticsOverview>("/analytics/overview"),
        api.get<PredictionSummary>("/analytics/predictions/summary"),
      ]);
      if (statsRes.status === "fulfilled") setAdminStats(statsRes.value.data);
      if (ovRes.status === "fulfilled") setOverview(ovRes.value.data);
      if (sumRes.status === "fulfilled") setPredSummary(sumRes.value.data);
    } catch (e) {
      console.error("fetchKpi error", e);
    } finally {
      setLoadingKpi(false);
    }
  }, []);

  const fetchDaily = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const res = await api.get<DailyUsageItem[]>("/analytics/search_logs/daily-usage", {
        params: { days: 30 },
      });
      setDailyUsage(res.data);
    } catch (e) {
      console.error("fetchDaily error", e);
    } finally {
      setLoadingDaily(false);
    }
  }, []);

  const fetchDrug = useCallback(async () => {
    setLoadingDrug(true);
    try {
      const res = await api.get<DrugGroupDistItem[]>("/analytics/search_logs/drug-group-distribution");
      setDrugDist(res.data);
    } catch (e) {
      console.error("fetchDrug error", e);
    } finally {
      setLoadingDrug(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get<AdminUser[]>("/admin/users");
      setUsers(res.data);
    } catch (e) {
      console.error("fetchUsers error", e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchSeverity = useCallback(async () => {
    setLoadingSeverity(true);
    try {
      const res = await api.get<SeverityItem[]>("/analytics/records/severity");
      setSeverityData(res.data);
    } catch (e) {
      console.error("fetchSeverity error", e);
    } finally {
      setLoadingSeverity(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get<StatusItem[]>("/analytics/records/status");
      setStatusData(res.data);
    } catch (e) {
      console.error("fetchStatus error", e);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const fetchSymptoms = useCallback(async () => {
    setLoadingSymptoms(true);
    try {
      const res = await api.get<SymptomItem[]>("/analytics/search_logs/popular-symptoms");
      setSymptomsData(res.data);
    } catch (e) {
      console.error("fetchSymptoms error", e);
    } finally {
      setLoadingSymptoms(false);
    }
  }, []);

  const pingHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await api.get<{ ml_model?: string; database?: string }>("/health");
      const ms = Math.round(performance.now() - start);
      setHealth({
        online: true,
        latencyMs: ms,
        mlModel: res.data?.ml_model ?? "ĐÃ TẢI",
        dbStatus: res.data?.database ?? "KẾT NỐI",
      });
    } catch {
      setHealth({ online: false, latencyMs: null, mlModel: "—", dbStatus: "—" });
    }
  }, []);

  // ---- Initial + Refresh ----
  const fetchAll = useCallback(() => {
    fetchKpi();
    fetchDaily();
    fetchDrug();
    fetchUsers();
    fetchSeverity();
    fetchStatus();
    fetchSymptoms();
    pingHealth();
  }, [fetchKpi, fetchDaily, fetchDrug, fetchUsers, fetchSeverity, fetchStatus, fetchSymptoms, pingHealth]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  // Health ping every 10s
  useEffect(() => {
    if (healthTimerRef.current) clearInterval(healthTimerRef.current);
    healthTimerRef.current = setInterval(pingHealth, 10000);
    return () => {
      if (healthTimerRef.current) clearInterval(healthTimerRef.current);
    };
  }, [pingHealth]);

  // ---- User management actions ----
  const handleToggleActive = useCallback(
    async (user: AdminUser) => {
      try {
        await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
        );
      } catch (e) {
        console.error("toggleActive error", e);
      }
    },
    []
  );

  const handleChangeRole = useCallback(async (userId: string, newRole: string) => {
    setRoleChanging(userId);
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      console.error("changeRole error", e);
    } finally {
      setRoleChanging(null);
    }
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (e) {
      console.error("deleteUser error", e);
    }
  }, []);

  const handleAddUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddingUser(true);
      try {
        const res = await api.post<AdminUser>("/admin/users", newUser);
        setUsers((prev) => [res.data, ...prev]);
        setNewUser({ username: "", email: "", password: "", full_name: "", role: "doctor" });
        setShowAddForm(false);
      } catch (e) {
        console.error("addUser error", e);
      } finally {
        setAddingUser(false);
      }
    },
    [newUser]
  );

  // ---- Derived values ----
  const totalStatusCount = statusData.reduce((s, d) => s + d.count, 0);

  const severityPieData = severityData.map((d) => ({
    name: d.severity,
    value: d.count,
    color: SEVERITY_COLORS[d.severity] ?? "#64748b",
  }));

  const drugBarData = drugDist.map((d) => ({ name: d.group, count: d.count }));

  const dailyLineData = dailyUsage.map((d) => ({
    date: d.date,
    "Dự đoán": d.count,
  }));

  const avgConf = predSummary?.average_confidence;
  const avgConfDisplay = avgConf != null ? `${(avgConf * 100).toFixed(1)}%` : "—";

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER BAR */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-slate-900 border-b border-slate-700/50 px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 text-sm transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Quay lại</span>
        </button>

        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-xs font-mono tracking-[0.3em] text-slate-400 uppercase">
            Admin Control Center
          </span>
          <span className="text-slate-600">●</span>
          <span className="text-xs font-semibold tracking-wider text-cyan-400">Drug-Pred AI</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Trạng thái hệ thống */}
          <div className="flex items-center gap-1.5 text-xs">
            <PulseDot color={health.online ? "green" : "red"} />
            <span className={health.online ? "text-green-400 font-mono" : "text-rose-400 font-mono"}>
              {health.online ? "HỆ THỐNG HOẠT ĐỘNG" : "MẤT KẾT NỐI"}
            </span>
          </div>

          {/* Đồng hồ */}
          <span className="font-mono text-sm text-slate-300 tabular-nums w-20 text-right">{clock}</span>

          {/* Nút refresh */}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-xs transition-colors border border-slate-700 rounded-lg px-2.5 py-1.5"
          >
            <RefreshCw size={13} />
            <span>Làm mới</span>
          </button>

          {/* Đăng xuất */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 text-xs transition-colors"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-[1800px] mx-auto">
        {/* ---------------------------------------------------------------- */}
        {/* KPI ROW */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            icon={<Users size={16} className="text-green-400" />}
            value={adminStats?.total_users ?? "—"}
            label="Người dùng"
            sub="Tổng tài khoản"
            accentClass="bg-green-500/10"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<BrainCircuit size={16} className="text-cyan-400" />}
            value={overview?.total_predictions ?? "—"}
            label="Dự đoán"
            sub="Từ hệ thống AI"
            accentClass="bg-cyan-500/10"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<FileText size={16} className="text-amber-400" />}
            value={overview?.total_records ?? "—"}
            label="Bệnh án"
            sub="Hồ sơ đã tạo"
            accentClass="bg-amber-500/10"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<Pill size={16} className="text-violet-400" />}
            value={overview?.total_drug_groups ?? "—"}
            label="Nhóm thuốc"
            sub="Được phân loại"
            accentClass="bg-violet-500/10"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<Zap size={16} className="text-rose-400" />}
            value={avgConfDisplay}
            label="Độ tin cậy TB"
            sub="Trung bình mô hình"
            accentClass="bg-rose-500/10"
            loading={loadingKpi}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* MAIN 2-COLUMN GRID */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Panel: Dự đoán 30 ngày */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                  Dự đoán / 30 ngày
                </h2>
                <span className="text-xs text-cyan-400 font-mono">REALTIME</span>
              </div>
              {loadingDaily ? (
                <div className="h-52 flex items-center justify-center">
                  <PanelSkeleton rows={6} />
                </div>
              ) : dailyLineData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-slate-600 text-sm">
                  Không có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyLineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={{ stroke: "#1e293b" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={RECHARTS_TOOLTIP_STYLE}
                      itemStyle={{ color: "#06b6d4" }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Dự đoán"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#06b6d4", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Panel: Drug Group Distribution */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                  Phân phối nhóm thuốc
                </h2>
              </div>
              {loadingDrug ? (
                <div className="h-52 flex items-center justify-center">
                  <PanelSkeleton rows={5} />
                </div>
              ) : drugBarData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-slate-600 text-sm">
                  Không có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={drugBarData}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                    />
                    <Tooltip
                      contentStyle={RECHARTS_TOOLTIP_STYLE}
                      itemStyle={{ color: "#8b5cf6" }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: User Management */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                Quản lý người dùng
              </h2>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-green-400 border border-green-500/30 rounded-lg px-2.5 py-1.5 hover:bg-green-500/10 transition-colors"
              >
                <UserPlus size={13} />
                <span>Thêm người dùng</span>
              </button>
            </div>

            {/* Add user form */}
            {showAddForm && (
              <form
                onSubmit={handleAddUser}
                className="mb-4 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Tên đăng nhập"
                    value={newUser.username}
                    onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Mật khẩu"
                    value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                  <input
                    placeholder="Họ và tên"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser((p) => ({ ...p, full_name: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                      className="w-full appearance-none bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="doctor">Bác sĩ</option>
                      <option value="nurse">Y tá</option>
                      <option value="researcher">Nghiên cứu viên</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="flex-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg px-3 py-1.5 text-xs hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                  >
                    {addingUser ? "Đang tạo..." : "Tạo tài khoản"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-600 hover:text-slate-400 text-xs px-2"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {/* User table */}
            {loadingUsers ? (
              <PanelSkeleton rows={6} />
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-slate-500 font-normal pb-2 pr-2">Tài khoản</th>
                      <th className="text-left text-slate-500 font-normal pb-2 pr-2">Vai trò</th>
                      <th className="text-left text-slate-500 font-normal pb-2 pr-2">Trạng thái</th>
                      <th className="text-left text-slate-500 font-normal pb-2 pr-2">Ngày tạo</th>
                      <th className="text-left text-slate-500 font-normal pb-2">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {users.map((user) => (
                      <tr key={user.id} className="group hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 pr-2">
                          <div className="font-mono text-slate-200">{user.username}</div>
                          <div className="text-slate-500 truncate max-w-[120px]">{user.full_name}</div>
                        </td>
                        <td className="py-2 pr-2">
                          {deleteConfirm !== user.id && (
                            <div className="relative">
                              <select
                                value={user.role}
                                disabled={roleChanging === user.id}
                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                className={`appearance-none text-xs rounded-full px-2 py-0.5 pr-5 font-medium border focus:outline-none cursor-pointer ${
                                  ROLE_COLORS[user.role] ?? "bg-slate-700 text-slate-300 border-slate-600"
                                } bg-transparent`}
                              >
                                <option value="doctor">Bác sĩ</option>
                                <option value="nurse">Y tá</option>
                                <option value="researcher">Nghiên cứu viên</option>
                                <option value="admin">Quản trị viên</option>
                              </select>
                              <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-mono ${
                              user.is_active ? "text-green-400" : "text-slate-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.is_active ? "bg-green-400" : "bg-slate-600"
                              }`}
                            />
                            {user.is_active ? "Hoạt động" : "Khóa"}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-slate-500 font-mono">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                        <td className="py-2">
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-rose-400 hover:text-rose-300 text-xs border border-rose-500/30 rounded px-1.5 py-0.5"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-slate-500 hover:text-slate-300 text-xs"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleToggleActive(user)}
                                title={user.is_active ? "Khóa tài khoản" : "Kích hoạt"}
                                className="text-slate-500 hover:text-amber-400 transition-colors"
                              >
                                {user.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(user.id)}
                                title="Xóa tài khoản"
                                className="text-slate-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-600">
                          Chưa có người dùng nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* BOTTOM 3-COLUMN GRID */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Panel 4: Severity Pie */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4">
            <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase mb-4">
              Phân bố mức độ
            </h2>
            {loadingSeverity ? (
              <PanelSkeleton rows={4} />
            ) : severityPieData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {severityPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={RECHARTS_TOOLTIP_STYLE}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {severityPieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ background: d.color }}
                        />
                        <span className="text-slate-400 capitalize">
                          {d.name === "mild"
                            ? "Nhẹ"
                            : d.name === "moderate"
                            ? "Vừa"
                            : d.name === "severe"
                            ? "Nặng"
                            : d.name === "critical"
                            ? "Nguy kịch"
                            : d.name}
                        </span>
                      </div>
                      <span className="font-mono text-slate-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Panel 5: Record Status */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4">
            <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase mb-4">
              Trạng thái bệnh án
            </h2>
            {loadingStatus ? (
              <PanelSkeleton rows={4} />
            ) : statusData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <div className="space-y-3">
                {statusData.map((d, i) => {
                  const color = STATUS_COLORS[d.status] ?? "#64748b";
                  const pct = totalStatusCount > 0 ? (d.count / totalStatusCount) * 100 : 0;
                  const label =
                    d.status === "pending"
                      ? "Chờ dự đoán"
                      : d.status === "predicted"
                      ? "Đã dự đoán"
                      : d.status === "confirmed"
                      ? "Đã xác nhận"
                      : d.status === "archived"
                      ? "Lưu trữ"
                      : d.status;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-mono text-slate-300">{d.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel 6: Popular Symptoms */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4">
            <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase mb-4">
              Triệu chứng phổ biến
            </h2>
            {loadingSymptoms ? (
              <PanelSkeleton rows={5} />
            ) : symptomsData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <div className="space-y-2">
                {symptomsData.slice(0, 8).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-mono text-slate-500 flex-shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-slate-300 truncate">{d.symptom}</span>
                    <span className="font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 flex-shrink-0">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* FOOTER: SYSTEM HEALTH */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl px-5 py-3 flex items-center gap-6 flex-wrap text-xs">
          <span className="font-mono tracking-widest text-slate-500 uppercase text-[10px]">
            Trạng thái hệ thống
          </span>

          <div className="flex items-center gap-1.5">
            <PulseDot color={health.online ? "green" : "red"} />
            <span className="text-slate-400">Backend API</span>
            <span className={`font-mono font-semibold ${health.online ? "text-green-400" : "text-rose-400"}`}>
              {health.online ? "ONLINE" : "LỖI"}
            </span>
            {health.latencyMs !== null && (
              <span className="text-slate-600 font-mono">{health.latencyMs}ms</span>
            )}
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
            <span className="text-slate-400">Redis Cache</span>
            <span className="font-mono text-slate-500">—</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <PulseDot color={health.online ? "green" : "amber"} />
            <span className="text-slate-400">ML Model</span>
            <span className={`font-mono font-semibold ${health.online ? "text-green-400" : "text-amber-400"}`}>
              {health.online ? health.mlModel : "—"}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <PulseDot color={health.online ? "green" : "amber"} />
            <span className="text-slate-400">Cơ sở dữ liệu</span>
            <span className={`font-mono font-semibold ${health.online ? "text-green-400" : "text-amber-400"}`}>
              {health.online ? health.dbStatus : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
