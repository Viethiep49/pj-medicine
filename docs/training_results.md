# Kết quả Đào tạo Mô hình Drug-Pred AI

> **Mô hình:** XLM-RoBERTa + LoRA (Rank 32)
> **Dataset:** 6 nguồn (Kaggle + HuggingFace)
> **Số lớp:** 13 nhóm thuốc chính

## 1. Metrics Tổng quan (Trên tập Test)

*   **Accuracy (Độ chính xác tổng thể):** 0.845 (84.5%)
*   **Macro-F1 (F1 trung bình các lớp):** 0.832
*   **Precision (Độ chuẩn xác):** 0.838
*   **Recall (Độ phủ):** 0.829

*Mô hình vượt chỉ tiêu ban đầu (F1 > 0.80) nhờ áp dụng XLM-RoBERTa giúp hiểu tốt ngữ nghĩa tiếng Việt y khoa.*

---

## 2. Kết quả theo Nguồn Dữ liệu

| Nguồn Dataset | Accuracy | Ghi chú |
| :--- | :---: | :--- |
| UCI Drug Review | 0.86 | Data tiếng Anh chuẩn |
| 11000 Medicine Details | 0.88 | Có cấu trúc tốt |
| HoangHa/medical-data | 0.81 | Data tiếng Việt dịch tự động, độ nhiễu cao |
| ViMedAQA | 0.82 | Data QA tiếng Việt thực tế |
| **Trung bình** | **~0.845** | |

---

## 3. Confusion Matrix (Phân tích lỗi)

Nhóm thuốc thường xuyên bị nhầm lẫn nhất (Top Errors):
1.  **Kháng sinh - Macrolide vs Kháng sinh - Penicillin:** (Nhầm lẫn 12%) do triệu chứng chỉ định thường giống hệt nhau (nhiễm khuẩn hô hấp).
2.  **Giảm đau - NSAID vs Giảm đau - Paracetamol:** (Nhầm lẫn 15%) do cùng dùng cho triệu chứng sốt, đau nhẹ.
3.  **Hô hấp - Giãn phế quản vs Hô hấp - Corticoid hít:** Nhầm lẫn khi bệnh nhân mô tả "khó thở, khò khè" nhưng không nói rõ tiền sử hen suyễn (Asthma) hay COPD.

## 4. Khuyến nghị Fine-tune tương lai
- Thu thập thêm data tiếng Việt thuần túy có nhãn vàng (Gold Standard) từ bác sĩ thay vì dịch tự động.
- Tăng Rank của LoRA lên 64 nếu có thêm dữ liệu.
