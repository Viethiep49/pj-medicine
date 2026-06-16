"""
Drug-Pred AI — Taxonomy Module
Định nghĩa danh mục các nhóm thuốc và hàm helper.
"""

# ============================================================
# DRUG → DRUG GROUP MAPPING
# ============================================================
DRUG_TO_GROUP = {
    # === KHÁNG SINH ===
    "Amoxicillin": "Kháng sinh - Penicillin",
    "Ampicillin": "Kháng sinh - Penicillin",
    "Penicillin": "Kháng sinh - Penicillin",
    "Augmentin": "Kháng sinh - Penicillin",
    "Azithromycin": "Kháng sinh - Macrolide",
    "Erythromycin": "Kháng sinh - Macrolide",
    "Clarithromycin": "Kháng sinh - Macrolide",
    "Cephalexin": "Kháng sinh - Cephalosporin",
    "Ceftriaxone": "Kháng sinh - Cephalosporin",
    "Cefuroxime": "Kháng sinh - Cephalosporin",
    "Ciprofloxacin": "Kháng sinh - Fluoroquinolone",
    "Levofloxacin": "Kháng sinh - Fluoroquinolone",
    "Moxifloxacin": "Kháng sinh - Fluoroquinolone",
    "Doxycycline": "Kháng sinh - Tetracycline",
    "Tetracycline": "Kháng sinh - Tetracycline",
    "Metronidazole": "Kháng sinh - Nitroimidazole",
    "Trimethoprim": "Kháng sinh - Sulfonamide",

    # === GIẢM ĐAU ===
    "Ibuprofen": "Giảm đau - NSAID",
    "Naproxen": "Giảm đau - NSAID",
    "Diclofenac": "Giảm đau - NSAID",
    "Celecoxib": "Giảm đau - NSAID",
    "Meloxicam": "Giảm đau - NSAID",
    "Aspirin": "Giảm đau - NSAID",
    "Acetaminophen": "Giảm đau - Paracetamol",
    "Paracetamol": "Giảm đau - Paracetamol",
    "Tramadol": "Giảm đau - Opioid nhẹ",
    "Codeine": "Giảm đau - Opioid nhẹ",

    # === TIM MẠCH ===
    "Lisinopril": "Tim mạch - ACE inhibitor",
    "Enalapril": "Tim mạch - ACE inhibitor",
    "Ramipril": "Tim mạch - ACE inhibitor",
    "Captopril": "Tim mạch - ACE inhibitor",
    "Losartan": "Tim mạch - ARB",
    "Valsartan": "Tim mạch - ARB",
    "Irbesartan": "Tim mạch - ARB",
    "Amlodipine": "Tim mạch - Chẹn kênh Canxi",
    "Nifedipine": "Tim mạch - Chẹn kênh Canxi",
    "Diltiazem": "Tim mạch - Chẹn kênh Canxi",
    "Metoprolol": "Tim mạch - Beta blocker",
    "Atenolol": "Tim mạch - Beta blocker",
    "Propranolol": "Tim mạch - Beta blocker",
    "Bisoprolol": "Tim mạch - Beta blocker",
    "Hydrochlorothiazide": "Tim mạch - Lợi tiểu",
    "Furosemide": "Tim mạch - Lợi tiểu",
    "Spironolactone": "Tim mạch - Lợi tiểu",

    # === TIÊU HÓA ===
    "Omeprazole": "Tiêu hóa - PPI",
    "Esomeprazole": "Tiêu hóa - PPI",
    "Pantoprazole": "Tiêu hóa - PPI",
    "Lansoprazole": "Tiêu hóa - PPI",
    "Ranitidine": "Tiêu hóa - H2 blocker",
    "Famotidine": "Tiêu hóa - H2 blocker",
    "Loperamide": "Tiêu hóa - Chống tiêu chảy",
    "Domperidone": "Tiêu hóa - Chống nôn",
    "Ondansetron": "Tiêu hóa - Chống nôn",

    # === NỘI TIẾT ===
    "Metformin": "Nội tiết - Biguanide",
    "Glipizide": "Nội tiết - Sulfonylurea",
    "Gliclazide": "Nội tiết - Sulfonylurea",
    "Insulin": "Nội tiết - Insulin",
    "Levothyroxine": "Nội tiết - Hormone tuyến giáp",

    # === HÔ HẤP ===
    "Salbutamol": "Hô hấp - Giãn phế quản",
    "Albuterol": "Hô hấp - Giãn phế quản",
    "Ipratropium": "Hô hấp - Kháng cholinergic",
    "Montelukast": "Hô hấp - Kháng leukotriene",
    "Dextromethorphan": "Hô hấp - Giảm ho",
    "Guaifenesin": "Hô hấp - Long đờm",
    "Bromhexine": "Hô hấp - Long đờm",

    # === THẦN KINH ===
    "Sertraline": "Thần kinh - SSRI",
    "Fluoxetine": "Thần kinh - SSRI",
    "Escitalopram": "Thần kinh - SSRI",
    "Amitriptyline": "Thần kinh - TCA",
    "Gabapentin": "Thần kinh - Chống động kinh",
    "Pregabalin": "Thần kinh - Chống động kinh",
    "Carbamazepine": "Thần kinh - Chống động kinh",
    "Diazepam": "Thần kinh - Benzodiazepine",
    "Lorazepam": "Thần kinh - Benzodiazepine",
    "Alprazolam": "Thần kinh - Benzodiazepine",
    "Sumatriptan": "Thần kinh - Triptan (Migraine)",

    # === DỊ ỨNG ===
    "Cetirizine": "Dị ứng - Kháng histamine",
    "Loratadine": "Dị ứng - Kháng histamine",
    "Fexofenadine": "Dị ứng - Kháng histamine",
    "Diphenhydramine": "Dị ứng - Kháng histamine",
    "Chlorpheniramine": "Dị ứng - Kháng histamine",

    # === CORTICOSTEROID ===
    "Prednisolone": "Chống viêm - Corticosteroid",
    "Prednisone": "Chống viêm - Corticosteroid",
    "Dexamethasone": "Chống viêm - Corticosteroid",
    "Hydrocortisone": "Chống viêm - Corticosteroid",
    "Methylprednisolone": "Chống viêm - Corticosteroid",

    # === DA LIỄU ===
    "Clotrimazole": "Da liễu - Kháng nấm",
    "Fluconazole": "Da liễu - Kháng nấm",
    "Ketoconazole": "Da liễu - Kháng nấm",
    "Acyclovir": "Da liễu - Kháng virus",

    # === CƠ XƯƠNG KHỚP ===
    "Allopurinol": "Cơ xương khớp - Chống gout",
    "Colchicine": "Cơ xương khớp - Chống gout",
    "Methotrexate": "Cơ xương khớp - DMARD",

    # === KHÁC ===
    "Warfarin": "Huyết học - Chống đông",
    "Heparin": "Huyết học - Chống đông",
    "Atorvastatin": "Chuyển hóa - Statin",
    "Simvastatin": "Chuyển hóa - Statin",
    "Rosuvastatin": "Chuyển hóa - Statin",
}

# Danh sách drug groups
DRUG_GROUPS = sorted(set(DRUG_TO_GROUP.values()))

def get_drug_group(drug_name: str) -> str | None:
    """Map tên thuốc → nhóm thuốc. Fuzzy match."""
    if not drug_name:
        return None

    name = drug_name.strip()

    # Exact match
    if name in DRUG_TO_GROUP:
        return DRUG_TO_GROUP[name]

    # Case-insensitive match
    name_lower = name.lower()
    for drug, group in DRUG_TO_GROUP.items():
        if drug.lower() == name_lower:
            return group

    # Partial match (drug name contains known drug)
    for drug, group in DRUG_TO_GROUP.items():
        if drug.lower() in name_lower or name_lower in drug.lower():
            return group

    return None
