import os
import sys
import json
import torch
import torch.nn as nn
from transformers import AutoModel, AutoTokenizer

# Reconfigure stdout to use UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Cấu hình đường dẫn
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "models", "drugpred-model", "model", "best_model.pt")
TOKENIZER_DIR = os.path.join(MODEL_DIR, "models", "drugpred-model", "model", "tokenizer")
LABEL_MAP_PATH = os.path.join(MODEL_DIR, "models", "drugpred-model", "model", "label_map.json")

# Định nghĩa lại class mô hình khớp với checkpoints đã train
class DrugGroupClassifier(nn.Module):
    def __init__(self, model_name="xlm-roberta-base", num_classes=13, dropout=0.3):
        super().__init__()
        # Load config từ model_name
        self.encoder = AutoModel.from_pretrained(model_name)
        hidden_size = self.encoder.config.hidden_size  # 768

        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_size, 256),
            nn.GELU(),
            nn.LayerNorm(256),
            nn.Dropout(dropout / 2),
            nn.Linear(256, num_classes),
        )

    def forward(self, input_ids, attention_mask):
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        cls_output = outputs.last_hidden_state[:, 0, :]
        logits = self.head(cls_output)
        return logits


def test_inference():
    print("=== ĐANG KHỞI TẠO TEST INFERENCE ===")
    
    # 1. Load label map
    print(f"Loading label map from: {LABEL_MAP_PATH}")
    with open(LABEL_MAP_PATH, "r", encoding="utf-8") as f:
        label_data = json.load(f)
    label2id = label_data["label2id"]
    id2label = label_data["id2label"]
    num_classes = len(label2id)
    print(f"Tìm thấy {num_classes} nhóm thuốc: {list(label2id.keys())}")

    # 2. Load tokenizer
    print(f"Loading tokenizer from: {TOKENIZER_DIR}")
    tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_DIR)

    # 3. Khởi tạo mô hình và load weights
    print(f"Loading model weights from: {MODEL_PATH}")
    # Sử dụng xlm-roberta-base (nó sẽ load từ local cache nếu đã có, hoặc download nếu chưa có)
    # Lưu ý: Vì XLM-RoBERTa dùng Hugging Face, nó có thể cần tải config/vocab nếu local chưa có.
    # Nhưng tokenizer đã được lưu đầy đủ ở TOKENIZER_DIR.
    model = DrugGroupClassifier(model_name="xlm-roberta-base", num_classes=num_classes)
    
    # Load state dict lên CPU
    state_dict = torch.load(MODEL_PATH, map_location=torch.device('cpu'))
    model.load_state_dict(state_dict)
    model.eval()
    print("Mô hình đã được load thành công!")

    # 4. Chạy test cases
    test_cases = [
        "Bệnh nhân bị ho kéo dài, có đờm đặc màu vàng, sốt nhẹ về chiều.",
        "Đau đầu dữ dội vùng thái dương, buồn nôn, sợ ánh sáng.",
        "Đo huyết áp tại nhà thấy 150/90 mmHg kèm theo hoa mắt, chóng mặt.",
        "Bị trầy xước da ở chân, vết thương đỏ, sưng tấy và chảy mủ nhẹ.",
        "Bệnh nhân bị đau khớp gối hai bên, cứng khớp vào buổi sáng kéo dài khoảng 30 phút."
    ]

    print("\n=== KẾT QUẢ DỰ ĐOÁN THỬ NGHIỆM ===")
    for text in test_cases:
        print(f"\nTriệu chứng: \"{text}\"")
        encoding = tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=256,
            return_tensors="pt",
        )
        input_ids = encoding["input_ids"]
        attention_mask = encoding["attention_mask"]

        with torch.no_grad():
            logits = model(input_ids, attention_mask)
            probs = torch.softmax(logits, dim=1).squeeze()

        top_probs, top_indices = torch.topk(probs, k=3)
        for rank, (prob, idx) in enumerate(zip(top_probs, top_indices), 1):
            class_name = id2label[str(idx.item())]
            percentage = prob.item() * 100
            bar = "█" * int(prob.item() * 20)
            print(f"  [{rank}] {class_name:<15}: {percentage:.2f}% {bar}")

if __name__ == "__main__":
    test_inference()
