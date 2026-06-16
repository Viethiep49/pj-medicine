# Model Card: Drug-Pred AI (XLM-RoBERTa + LoRA)

## 1. Thông tin chung (Model Details)
*   **Mô hình nền tảng:** `xlm-roberta-base` (Facebook AI)
*   **Phương pháp Fine-tuning:** LoRA (Low-Rank Adaptation), Rank = 32, Alpha = 32.
*   **Kiến trúc:** Transformer Encoder + Classification Head.
*   **Nhiệm vụ:** Phân loại văn bản đa lớp (Multi-class Text Classification) - 13 nhóm thuốc.
*   **Ngôn ngữ:** Hỗ trợ đa ngôn ngữ, tối ưu cho Tiếng Việt.

## 2. Dữ liệu huấn luyện (Training Data)
Mô hình được huấn luyện trên tập dữ liệu tổng hợp ~50,000 mẫu, bao gồm:
1.  **Dữ liệu Tiếng Anh:** UCI Drug Review, OpenFDA Labeling, Medicine Recommendation Kaggle. (Được dịch tự động sang Tiếng Việt).
2.  **Dữ liệu Tiếng Việt:** HoangHa/medical-data, tmnam20/ViMedAQA.

## 3. Hiệu năng (Performance)
*   **Accuracy:** ~84.5% trên tập test.
*   **Macro-F1:** ~0.83.
*   (Xem chi tiết tại `training_results.md`)

## 4. Hạn chế và Rủi ro (Limitations & Biases)
> [!WARNING]
> MÔ HÌNH CHỈ MANG TÍNH CHẤT GỢI Ý VÀ HỖ TRỢ (CDSS). KHÔNG THAY THẾ CHẨN ĐOÁN CỦA BÁC SĨ.

*   **Rủi ro nhầm lẫn (False Positives):** Mô hình có thể nhầm lẫn giữa các nhóm thuốc có chung phổ chỉ định (ví dụ: Paracetamol và NSAID).
*   **Thiếu ngữ cảnh y khoa:** Mô hình chỉ dựa trên văn bản tự do, không có quyền truy cập vào kết quả xét nghiệm lâm sàng, tiền sử dị ứng, hay tương tác thuốc của người bệnh.
*   **Thiên kiến ngôn ngữ (Bias):** Do một phần lớn dữ liệu được dịch tự động, văn phong mô tả bệnh án có thể không hoàn toàn giống với văn phong thực tế của bác sĩ Việt Nam.

## 5. Ứng dụng dự kiến (Intended Use)
*   Tích hợp vào hệ thống HIS/EMR để gợi ý nhanh nhóm thuốc cho bác sĩ phòng khám.
*   Dùng để phân tích độ phổ biến của các nhóm bệnh dựa trên log tìm kiếm.
