# Figma Designs — Drug-Pred AI

2 frame được dựng bám sát frontend (`frontend/src/App.tsx`), xuất dạng SVG để **kéo thẳng vào Figma → tự thành Frame + layer vector chỉnh sửa được** (không cần plugin).

| File | Màn hình | Khổ |
|------|----------|-----|
| `01-landing.svg` | Landing Page (Navbar · Hero · Kiến trúc 4 bước · Tech Stack · Footer) | 1440 × 2120 |
| `02-dashboard.svg` | Clinical Dashboard / CDSS (Sidebar · Textarea · Kết quả Top-3 · XAI · Disclaimer) | 1440 × 1080 |

## Cách import vào Figma
1. Mở file Figma → **kéo-thả** file `.svg` vào canvas (hoặc menu **File → Place image…**).
2. Mỗi SVG vào thành 1 group; chuột phải → **Frame selection** nếu muốn biến thành Frame chuẩn.
3. Cài font **Figtree** (heading) và **Noto Sans** (body) để text hiển thị đúng — Figma sẽ báo thiếu font nếu chưa có.

## Design tokens (khớp `tailwind.config.js`)
| Token | Hex | Dùng cho |
|-------|-----|----------|
| primary | `#0891B2` | Logo, nút chính, accent |
| secondary | `#22D3EE` | Gradient brand |
| cta | `#059669` | Confidence cao, nút xác nhận |
| background | `#ECFEFF` | Nền Dashboard |
| text | `#164E63` | Chữ chính, nền footer/nút tối |

**Typography:** Figtree (400–900) cho heading · Noto Sans (400–700) cho body.

> Lưu ý: SVG được vẽ từ mock UI tĩnh — màu/spacing/typography khớp code thật, riêng icon là bản line-art tối giản (lucide gốc dùng trong app). Có thể thay bằng plugin Lucide trong Figma nếu cần độ chính xác tuyệt đối.
