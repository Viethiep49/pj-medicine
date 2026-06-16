# Luồng Dữ liệu & Tiền Xử Lý — Drug-Pred AI

> Tài liệu này mô tả (1) cách hệ thống xử lý input từ người dùng để ra kết quả dự đoán,
> và (2) cách các dataset khác nhau được tiền xử lý trước khi train model.

---

## 1. Luồng dữ liệu khi người dùng nhập mô tả bệnh

```
Người dùng nhập text
"Bệnh nhân sốt cao 39°C, ho có đờm vàng, đau ngực"
        │
        ▼
┌─────────────────────────────────────────────┐
│  Bước 1: TOKENIZER (xlm-roberta-base)       │
│                                             │
│  Text → chuỗi token ID                     │
│  "sốt" → [12045]                           │
│  "cao" → [876]                             │
│  "đờm" → [34521]                           │
│                                             │
│  + Padding đến MAX_LEN = 256               │
│  + Attention mask (1=real token, 0=padding) │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Bước 2: XLM-ROBERTA ENCODER               │
│                                             │
│  [token_ids] → [256 vectors × 768 chiều]   │
│                                             │
│  Mỗi token được "hiểu" trong ngữ cảnh      │
│  của toàn bộ câu (self-attention mechanism) │
│                                             │
│  Lấy vector [CLS] đầu tiên làm đại diện    │
│  cho toàn bộ câu → output shape: [768]     │
└──────────────────┬──────────────────────────┘
                   │  vector [768]
                   ▼
┌─────────────────────────────────────────────┐
│  Bước 3: CLASSIFICATION HEAD               │
│                                             │
│  Linear(768 → 256) → GELU → LayerNorm      │
│  → Dropout → Linear(256 → N_classes)       │
│                                             │
│  Output: logits [N_classes]                │
│  ví dụ N=13 categories:                    │
│  [-2.1, 4.8, 0.3, -1.2, 1.5, ...]         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Bước 4: SOFTMAX → XÁC SUẤT               │
│                                             │
│  logits → xác suất, tổng = 1.0            │
│                                             │
│  Kháng sinh:    0.87  ← cao nhất           │
│  Hô hấp:        0.45                       │
│  Giảm đau:      0.23                       │
│  Tim mạch:      0.03                       │
│  ...                                        │
└──────────────────┬──────────────────────────┘
                   │ Top-K kết quả
                   ▼
        Trả về cho người dùng
        [Kháng sinh 87%, Hô hấp 45%, Giảm đau 23%]
```

### Tại sao XLM-RoBERTa hiểu được tiếng Việt?

Model được pre-train trên **100 ngôn ngữ** bao gồm tiếng Việt. Nó đã học được rằng
*"sốt cao"* và *"high fever"* mang ý nghĩa tương đương — do đó dù dữ liệu train chủ
yếu là tiếng Anh, khi inference bằng tiếng Việt vẫn cho kết quả chính xác mà
**không cần bước dịch thuật**.

---

## 2. Tiền xử lý dữ liệu (Data Preprocessing)

### 2.1 Tổng quan vấn đề

Dự án sử dụng 4 dataset từ nhiều nguồn khác nhau, mỗi dataset có cấu trúc (schema) hoàn toàn khác nhau:

| Dataset | Cấu trúc |
|---------|----------|
| Medicine Recommendation | `symptom_1, symptom_2, ..., prognosis` |
| UCI Drug Review | `drugName, condition, review, rating` |
| 11000 Medicine Details | `Medicine Name, Composition, Uses` |
| OpenFDA Drug Labeling | JSON lồng nhau: `{openfda: {...}, indications_and_usage: [...]}` |
| HoangHa/medical-data (VI) | `messages (JSON list), target_disease` |

### 2.2 Hai tầng preprocessing

#### Tầng 1 — Preprocessing trước khi train (chạy 1 lần trên Kaggle)

| Bước | Tên kỹ thuật | Mô tả |
|------|-------------|-------|
| 1 | Schema Detection | Tự dò tìm đúng cột trong mỗi dataset dựa vào tên cột |
| 2 | Text Cleaning | Xóa HTML tags, URL, ký tự thừa, chuẩn hóa khoảng trắng |
| 3 | Label Mapping | Map tên thuốc → nhóm thuốc qua bảng `DRUG_TO_GROUP` (120 thuốc) |
| 4 | Filtering | Loại bỏ text quá ngắn (< 12 ký tự), review rating thấp (< 7/10) |
| 5 | Deduplication | Xóa các dòng text trùng nhau |
| 6 | Class Balancing | Giới hạn tối đa 1500 mẫu/nhóm để tránh mất cân bằng |
| 7 | Train/Val/Test Split | Chia 70/15/15 theo phương pháp stratified sampling |

#### Tầng 2 — Preprocessing lúc inference (chạy mỗi lần user nhập)

```
Text đầu vào
    → Tokenizer XLM-RoBERTa
    → Token IDs + Padding (MAX_LEN=256)
    → Attention Mask
    → Đưa vào model
```

### 2.3 Giải pháp xử lý schema khác nhau

Thay vì viết 4 parser riêng cho 4 dataset, notebook sử dụng **một hàm duy nhất**
`extract_from_df()` thử lần lượt 4 pattern theo thứ tự ưu tiên:

```
Pattern 1: có cột review + tên thuốc?
    → UCI Drug Review (lọc rating ≥ 7)

Pattern 2: có cột uses/indication + tên thuốc/thành phần?
    → 11000 Medicine Details

Pattern 3: có cột symptom* + thuốc?
    → Medicine Recommendation System

Pattern 4: có cột disease/condition + medication?
    → Dạng bảng bệnh → thuốc tổng quát
```

Pattern nào khớp trước thì dùng, trả về danh sách `{text, drug_group, source, lang}`.

### 2.4 Xử lý dữ liệu tiếng Việt (HoangHa)

Dataset tiếng Việt không có tên thuốc, chỉ có **tên bệnh** → không thể dùng
`DRUG_TO_GROUP`. Thay vào đó dùng **keyword matching** tiếng Việt:

```python
VI_KEYWORD_TO_CATEGORY = {
    "Tiêu hóa": ["đau dạ dày", "ợ chua", "trào ngược", "tiêu chảy", ...],
    "Tim mạch":  ["tăng huyết áp", "đau thắt ngực", "suy tim", ...],
    "Kháng sinh": ["nhiễm khuẩn", "viêm họng", "viêm phổi", ...],
    ...
}
```

Câu tiếng Việt nào khớp **nhiều keyword nhất** trong một category → gán category đó.
Mẫu tiếng Việt chỉ dùng được ở mức **category** (không tới subgroup).

### 2.5 Kết quả sau khi gộp

```
UCI Drug Review      → text = review bệnh nhân      → drug_group (từ tên thuốc)
11000 Medicine       → text = công dụng thuốc       → drug_group (từ tên/thành phần)
Medicine Recommend   → text = danh sách triệu chứng → drug_group (từ tên thuốc)
OpenFDA Labeling     → text = indications_and_usage → drug_group (từ tên thuốc)
HoangHa (VI)         → text = hội thoại bệnh nhân   → category   (từ keyword VI)
                                    ↓
                        Gộp lại → Dedup → Class Balancing
                                    ↓
                           Train / Val / Test Split
                           (70%  / 15% / 15%)
```

---

## 3. Sơ đồ tổng thể hệ thống

```
[Kaggle — chạy 1 lần]                     [Backend Server — chạy liên tục]
                                                          │
Raw Datasets (4 nguồn)                     User nhập mô tả bệnh
        │                                                 │
        ▼                                                 ▼
Data Preprocessing                         Tokenizer XLM-RoBERTa
        │                                                 │
        ▼                                                 ▼
Training (XLM-RoBERTa + LoRA)             Encoder → [CLS] vector [768]
        │                                                 │
        ▼                                                 ▼
best_model.pt ─────────────────────────▶  Classification Head
label_map.json                                            │
tokenizer/                                                ▼
                                           Softmax → Top-K drug groups
                                                          │
                                                          ▼
                                           Trả kết quả cho người dùng
```

---

*Dùng cho Chương 3 (Thiết kế hệ thống) và Chương 4 (Kết quả thực nghiệm) của báo cáo.*
