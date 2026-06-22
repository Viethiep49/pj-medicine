# Drug-Pred AI — Frontend

React 19 + TypeScript + Vite frontend cho hệ thống hỗ trợ quyết định lâm sàng (CDSS) dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt.

---

## Tech Stack

| Thư viện | Mục đích |
|---------|----------|
| React 19 + TypeScript | UI framework |
| Vite 8 | Build tool / dev server |
| Tailwind CSS v3 | Styling |
| Recharts | Data visualization (charts) |
| Axios | HTTP client |
| lucide-react | Icons |
| react-hot-toast | Toast notifications |

---

## Cấu trúc thư mục

```
src/
├── components/
│   ├── AdminDashboard.tsx    # Admin Control Center (multi-monitor UI)
│   ├── HistoryPage.tsx       # Lịch sử dự đoán
│   ├── PatientSection.tsx    # Quản lý bệnh nhân
│   └── LoginPage.tsx         # Trang đăng nhập
├── context/
│   └── AuthContext.tsx       # JWT auth state (login/logout/user info)
├── services/
│   └── api.ts                # Axios client + tất cả API calls
├── types/
│   └── index.ts              # TypeScript interfaces
├── App.tsx                   # Root component + view routing
└── main.tsx                  # Entry point
```

---

## Khởi động development

```bash
cd frontend
npm install
npm run dev
```

Server chạy tại `http://localhost:5173`.

Backend phải đang chạy tại `http://localhost:8000` (hoặc cấu hình qua `.env`).

---

## Biến môi trường

Tạo file `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

Nếu không có file `.env`, mặc định dùng `http://localhost:8000/api`.

---

## Luồng người dùng

```
Landing Page
    ↓ click "Mở Clinical Demo"
Login Page  ←─── token hết hạn / chưa đăng nhập
    ↓ đăng nhập thành công
  role = admin  →  Admin Control Center
  role = doctor/nurse/researcher  →  Clinical Dashboard (CDSS)
```

**Tài khoản mặc định:**
- Username: `admin`
- Password: `admin123`

---

## Views & Navigation

Navigation không dùng react-router — quản lý qua state `view` trong `App.tsx`:

| View | Mô tả |
|------|-------|
| `landing` | Landing page (giới thiệu hệ thống) |
| `login` | Form đăng nhập |
| `dashboard` | Clinical CDSS dashboard (bác sĩ/y tá) |
| `admin` | Admin Control Center |
| `404` | Trang không tìm thấy |
| `error` | Trang lỗi kết nối |

---

## Clinical Dashboard (role: doctor/nurse/researcher)

Sidebar có 4 tab:

| Tab | Mô tả |
|-----|-------|
| Dự đoán Lâm sàng | Nhập bệnh án → AI dự đoán nhóm thuốc + XAI heatmap |
| Bệnh nhân | Danh sách + tạo bệnh nhân mới |
| Lịch sử | Lịch sử các lần dự đoán |
| Thống kê | Charts phân tích tổng quan |

Nút **Logout** và (nếu là admin) **Admin Panel** ở cuối sidebar.

---

## Admin Control Center (role: admin)

Dashboard dạng "control room" tối màu với:

- **5 KPI cards**: Tổng users, predictions, records, drug groups, avg confidence
- **LineChart**: Predictions 30 ngày qua
- **BarChart**: Phân bố nhóm thuốc
- **User Management**: Bảng CRUD users — tạo, đổi role, bật/tắt, xóa
- **PieChart**: Phân bố mức độ bệnh (mild/moderate/severe/critical)
- **Status pipeline**: Số hồ sơ theo trạng thái
- **Popular symptoms**: Top triệu chứng tìm kiếm nhiều nhất
- **System Health**: Ping `/api/health` mỗi 10 giây, hiển thị latency

---

## Chế độ Demo Mock

Toggle "Chế độ Demo Mock / API Thật" trong dashboard. Khi bật Demo:
- Tất cả data lấy từ `localStorage` (không gọi backend)
- Hữu ích khi test UI mà không cần backend chạy

---

## Auth

- JWT lưu tại `localStorage["access_token"]`
- Token decode client-side (base64) để lấy `{ id, username, role }`
- Khi token hết hạn hoặc gặp lỗi 401, tự động redirect về Login
- Context: `useAuth()` hook từ `context/AuthContext.tsx`

---

## Build production

```bash
npm run build
```

Output tại `frontend/dist/`. Serve bằng Nginx hoặc bất kỳ static server nào.

---

## Lint

```bash
npm run lint
```
