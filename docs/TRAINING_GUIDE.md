# Hướng dẫn Training Mô hình (Training Guide)

## 1. Môi trường Training
Nên train mô hình trên GPU (VRAM >= 12GB để dùng batch size tối ưu với LoRA). Có thể dùng:
- Google Colab (T4 / L4 GPU)
- Kaggle Notebooks
- Local GPU (NVIDIA RTX 3060/4090...)

Để cài đặt môi trường cho training:
```bash
cd backend/ml/notebooks
pip install -r requirements.txt
# hoặc
pip install torch transformers peft datasets underthesea pandas scikit-learn
```

## 2. Dữ liệu (Datasets)
Dự án sử dụng dataset Tiếng Việt từ:
- **ViMedAQA**: Bộ dữ liệu hỏi đáp y tế tiếng Việt.
- **Dịch tễ / Bệnh án nội bộ**: Các mô tả bệnh án (đã ẩn danh).

Cơ chế nạp dữ liệu (data loading) được tự động hoá thông qua module `data_pipeline.py`. Bạn không cần down thủ công, hãy sử dụng:
```python
from backend.ml.data_pipeline import load_and_preprocess_dataset
dataset = load_and_preprocess_dataset("vimedaqa")
```

## 3. Kiến trúc Model: XLM-RoBERTa + PEFT (LoRA)
Thay vì Fine-tune toàn bộ trọng số (Full Fine-tuning), hệ thống áp dụng **LoRA (Low-Rank Adaptation)** nhằm:
- Giảm thiểu VRAM cần thiết (chỉ train 1-2% tham số).
- Cho phép Dynamic Switching (chỉ load LoRA adapter chuyên khoa lên theo ngữ cảnh).
- Tối ưu tốc độ hội tụ (convergence).

## 4. Quá trình Training (Step-by-step)

1. **Chuẩn bị Tokenizer và Model Base**
   Load `xlm-roberta-base` từ Hugging Face Hub.

2. **Cấu hình LoRA (PEFT)**
   ```python
   from peft import LoraConfig
   lora_config = LoraConfig(
       r=8,
       lora_alpha=16,
       target_modules=["query", "value"],
       lora_dropout=0.05,
       bias="none",
       task_type="SEQ_CLS"
   )
   ```

3. **Chạy script Training**
   Có thể tìm thấy script chính trong `backend/ml/notebooks/_build_notebook.py` hoặc sử dụng Kaggle.

4. **Lưu trọng số**
   Sau khi train xong, model sẽ lưu lại các file config và adapter `adapter_model.safetensors`.
   Move toàn bộ folder trọng số vào `backend/ml/models/weights/`.

## 5. Đánh giá (Evaluation)
Sử dụng F1-Score (Macro & Micro), Precision, Recall.
Tham khảo chi tiết tại `docs/training_results.md`.
