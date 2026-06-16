"""
Drug-Pred AI — Hướng dẫn tải Model Weights
Vì kích thước model khá lớn (~1.1GB), weights không được commit lên git.
File này cung cấp script và hướng dẫn để tải model weights từ Kaggle Output.
"""

import sys
import os
from pathlib import Path

# Paths
ML_DIR = Path(__file__).parent
MODELS_DIR = ML_DIR / "models"
WEIGHTS_DIR = MODELS_DIR / "drugpred-model" / "model"


def print_instructions():
    print("=" * 60)
    print("💊 HƯỚNG DẪN TẢI MODEL WEIGHTS CHO DRUG-PRED AI")
    print("=" * 60)
    print("Mô hình XLM-RoBERTa + LoRA đã được train và lưu trên Kaggle.")
    print("Vui lòng thực hiện các bước sau để tải và cài đặt model:\n")
    
    print("BƯỚC 1: Truy cập Kaggle Notebook")
    print("  🔗 Link: (Nhập link Kaggle notebook của bạn ở đây)")
    print("  Hoặc chạy notebook `backend/ml/notebooks/drugpred_kaggle_train.ipynb` trên Kaggle.\n")
    
    print("BƯỚC 2: Tải file `drugpred-model.zip`")
    print("  Trong tab 'Output' của notebook, tải về file `drugpred-model.zip` (~650MB).\n")
    
    print("BƯỚC 3: Giải nén vào thư mục dự án")
    print(f"  Giải nén file zip vào thư mục: {MODELS_DIR}")
    print("  Cấu trúc thư mục sau khi giải nén phải như sau:")
    print("  backend/ml/models/")
    print("  └── drugpred-model/")
    print("      └── model/")
    print("          ├── best_model.pt")
    print("          ├── label_map.json")
    print("          └── tokenizer/")
    print("              ├── tokenizer_config.json")
    print("              ├── sentencepiece.bpe.model")
    print("              └── ...\n")
    
    print("BƯỚC 4: Kiểm tra lại")
    print("  Chạy script `python backend/ml/test_inference.py` để đảm bảo")
    print("  mô hình load thành công và dự đoán chính xác.")
    print("=" * 60)


def check_status():
    print("\n🔍 Kiểm tra trạng thái hiện tại:")
    
    if WEIGHTS_DIR.exists():
        files = list(WEIGHTS_DIR.glob("*"))
        if len(files) >= 2:
            print(f"✅ Đã tìm thấy thư mục model tại: {WEIGHTS_DIR}")
            print(f"   Số lượng files: {len(files)}")
            
            # Check specific files
            best_model = WEIGHTS_DIR / "best_model.pt"
            label_map = WEIGHTS_DIR / "label_map.json"
            tokenizer = WEIGHTS_DIR / "tokenizer"
            
            if best_model.exists():
                size_mb = best_model.stat().st_size / (1024 * 1024)
                print(f"   ✅ best_model.pt ({size_mb:.1f} MB)")
            else:
                print("   ❌ Thiếu best_model.pt")
                
            if label_map.exists():
                print("   ✅ label_map.json")
            else:
                print("   ❌ Thiếu label_map.json")
                
            if tokenizer.exists() and tokenizer.is_dir():
                print("   ✅ tokenizer/")
            else:
                print("   ❌ Thiếu tokenizer/")
                
            return
            
    print(f"❌ CHƯA CÓ MODEL WEIGHTS TẠI: {WEIGHTS_DIR}")
    print("   Hãy làm theo hướng dẫn ở trên để tải model về.")


if __name__ == "__main__":
    print_instructions()
    check_status()
