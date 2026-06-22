/**
 * Axios API client instance.
 * Tự động attach JWT token, handle errors và hỗ trợ chế độ Demo Mock.
 */

import axios from "axios";
import type { 
  PredictionResult, 
  XAIToken, 
  DrugGroup, 
  Patient, 
  CreatePatientRequest, 
  MedicalRecord, 
  CreateRecordRequest, 
  Prediction, 
  PaginatedResponse,
  DashboardStats
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void) => { onUnauthorized = handler; };

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Tăng timeout lên 30s để hỗ trợ chạy inference trên CPU không bị quá hạn
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Request Interceptor: Attach JWT Token ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor: Handle Auth Errors ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// CHẾ ĐỘ DEMO MOCK STATE (Hỗ trợ chạy thử không cần backend)
// ============================================================================

export const isDemoMode = (): boolean => {
  const mode = localStorage.getItem("app_mode");
  return mode === null || mode === "demo"; // mặc định là demo mode
};

export const setDemoMode = (enabled: boolean) => {
  localStorage.setItem("app_mode", enabled ? "demo" : "real");
};

// Khởi tạo mock data trong LocalStorage nếu chưa có
const initMockDB = () => {
  if (!localStorage.getItem("mock_patients")) {
    const patients: Patient[] = [
      {
        id: "p1",
        patientCode: "BN001",
        fullName: "Nguyễn Văn A",
        dateOfBirth: "1980-05-12",
        gender: "male",
        phone: "0901234567",
        address: "123 Lê Lợi, Quận 1, TP. HCM",
        bloodType: "O+",
        allergies: ["Penicillin"],
        chronicDiseases: ["Tăng huyết áp"],
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: "p2",
        patientCode: "BN002",
        fullName: "Trần Thị B",
        dateOfBirth: "1992-09-24",
        gender: "female",
        phone: "0918765432",
        address: "456 Nguyễn Huệ, Quận 1, TP. HCM",
        bloodType: "A+",
        allergies: [],
        chronicDiseases: ["Suyễn"],
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: "p3",
        patientCode: "BN003",
        fullName: "Lê Hoàng C",
        dateOfBirth: "1965-11-03",
        gender: "male",
        phone: "0933445566",
        address: "789 Điện Biên Phủ, Bình Thạnh, TP. HCM",
        bloodType: "AB-",
        allergies: ["Aspirin"],
        chronicDiseases: ["Đái tháo đường Type 2"],
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      }
    ];
    localStorage.setItem("mock_patients", JSON.stringify(patients));
  }

  if (!localStorage.getItem("mock_records")) {
    const records: MedicalRecord[] = [
      {
        id: "r1",
        recordCode: "BA001",
        patientId: "p1",
        createdBy: "doctor_1",
        chiefComplaint: "Sốt cao 39 độ liên tục 3 ngày nay, ho có đờm xanh ngả vàng",
        description: "Bệnh nhân nam 45 tuổi, đau tức ngực phải khi ho. Phổi phải ralp nổ đáy.",
        symptomsDuration: "3 ngày",
        vitalSigns: { temperature: 39, bloodPressure: "120/80", heartRate: 88, respiratoryRate: 25, spo2: 94 },
        severity: "moderate",
        status: "predicted",
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: "r2",
        recordCode: "BA002",
        patientId: "p2",
        createdBy: "doctor_1",
        chiefComplaint: "Đau nửa đầu phải theo nhịp mạch đập, buồn nôn",
        description: "Bệnh nhân nữ 28 tuổi, đau kéo dài 4-6 tiếng, sợ ánh sáng và tiếng ồn.",
        symptomsDuration: "2 ngày",
        vitalSigns: { temperature: 36.8, bloodPressure: "110/70", heartRate: 72, respiratoryRate: 16, spo2: 99 },
        severity: "mild",
        status: "predicted",
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      }
    ];
    localStorage.setItem("mock_records", JSON.stringify(records));
  }

  if (!localStorage.getItem("mock_predictions")) {
    const predictions: Prediction[] = [
      {
        id: "pred1",
        recordId: "r1",
        modelConfigId: "m1",
        predictedGroups: [
          { drugGroupId: "dg1", drugGroupName: "Kháng sinh - Beta-lactam/Macrolide", confidence: 0.89, rank: 1 },
          { drugGroupId: "dg3", drugGroupName: "Thuốc long đờm", confidence: 0.65, rank: 2 },
          { drugGroupId: "dg2", drugGroupName: "Thuốc giãn phế quản", confidence: 0.45, rank: 3 }
        ],
        top1GroupId: "dg1",
        top1Confidence: 0.89,
        processingTimeMs: 140,
        isConfirmed: true,
        confirmedGroupId: "dg1",
        confirmedBy: "doctor_1",
        confirmedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: "pred2",
        recordId: "r2",
        modelConfigId: "m1",
        predictedGroups: [
          { drugGroupId: "dg7", drugGroupName: "Thuốc giảm đau đặc hiệu", confidence: 0.85, rank: 1 },
          { drugGroupId: "dg8", drugGroupName: "Thuốc chống viêm NSAID", confidence: 0.55, rank: 2 },
          { drugGroupId: "dg9", drugGroupName: "Thuốc an thần nhẹ", confidence: 0.20, rank: 3 }
        ],
        top1GroupId: "dg7",
        top1Confidence: 0.85,
        processingTimeMs: 120,
        isConfirmed: false,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      }
    ];
    localStorage.setItem("mock_predictions", JSON.stringify(predictions));
  }
};

initMockDB();

// Helper lấy dữ liệu từ localStorage
const getMockData = <T>(key: string): T[] => {
  return JSON.parse(localStorage.getItem(key) || "[]") as T[];
};

const saveMockData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Mock Drug Groups
const MOCK_DRUG_GROUPS: DrugGroup[] = [
  { id: "dg1", name: "Kháng sinh - Beta-lactam/Macrolide", code: "KS01", category: "Respiratory", common_drugs: ["Amoxicillin", "Azithromycin", "Clarithromycin"] },
  { id: "dg2", name: "Thuốc giãn phế quản", code: "GPQ01", category: "Respiratory", common_drugs: ["Salbutamol", "Ipratropium", "Theophylline"] },
  { id: "dg3", name: "Thuốc long đờm", code: "LD01", category: "Respiratory", common_drugs: ["Acetylcysteine", "Ambroxol", "Bromhexine"] },
  { id: "dg4", name: "Thuốc ức chế men chuyển (ACEi)", code: "ACEI01", category: "Cardiology", common_drugs: ["Enalapril", "Lisinopril", "Captopril"] },
  { id: "dg5", name: "Thuốc chẹn kênh Canxi", code: "CCB01", category: "Cardiology", common_drugs: ["Amlodipine", "Nifedipine", "Verapamil"] },
  { id: "dg6", name: "Thuốc lợi tiểu Thiazide", code: "LT01", category: "Cardiology", common_drugs: ["Hydrochlorothiazide", "Indapamide"] },
  { id: "dg7", name: "Thuốc giảm đau đặc hiệu", code: "GD01", category: "Neurology", common_drugs: ["Sumatriptan", "Zolmitriptan", "Ergotamine"] },
  { id: "dg8", name: "Thuốc chống viêm NSAID", code: "NSAID01", category: "Neurology", common_drugs: ["Ibuprofen", "Meloxicam", "Celecoxib"] },
  { id: "dg9", name: "Thuốc an thần nhẹ", code: "AT01", category: "Neurology", common_drugs: ["Diazepam", "Rotundin", "Phenobarbital"] },
  // Thêm 3 chuyên khoa còn thiếu: Thần Kinh (đã có), Tiêu Hóa, Nội Tiết
  { id: "dg10", name: "Thuốc kháng acid & bọc dạ dày", code: "TH01", category: "Gastroenterology", common_drugs: ["Esomeprazole", "Omeprazole", "Aluminum Hydroxide"] },
  { id: "dg11", name: "Thuốc điều hòa nhu động ruột", code: "TH02", category: "Gastroenterology", common_drugs: ["Domperidone", "Trimebutine"] },
  { id: "dg12", name: "Thuốc hạ đường huyết oral", code: "NT01", category: "Endocrinology", common_drugs: ["Metformin", "Gliclazide", "Sitagliptin"] },
  { id: "dg13", name: "Hormone tuyến giáp tổng hợp", code: "NT02", category: "Endocrinology", common_drugs: ["Levothyroxine"] }
];

// ============================================================================
// MAPPERS: chuyển đổi snake_case (backend) ↔ camelCase (frontend)
// Giúp chế độ API Thật khớp hợp đồng dữ liệu mà không phải sửa các component.
// ============================================================================

const mapPatientFromApi = (p: any): Patient => ({
  id: p.id,
  patientCode: p.patient_code,
  fullName: p.full_name,
  dateOfBirth: p.date_of_birth,
  gender: p.gender,
  phone: p.phone ?? undefined,
  address: p.address ?? undefined,
  bloodType: p.blood_type ?? undefined,
  allergies: p.allergies ?? [],
  chronicDiseases: p.chronic_diseases ?? [],
  createdBy: p.created_by ?? undefined,
  createdAt: p.created_at,
});

const mapPatientToApi = (d: CreatePatientRequest) => ({
  full_name: d.fullName,
  date_of_birth: d.dateOfBirth,
  gender: d.gender,
  phone: d.phone,
  address: d.address,
  blood_type: d.bloodType,
  allergies: d.allergies ?? [],
  chronic_diseases: d.chronicDiseases ?? [],
});

const mapRecordFromApi = (r: any): MedicalRecord => ({
  id: r.id,
  recordCode: r.record_code,
  patientId: r.patient_id,
  createdBy: r.created_by,
  chiefComplaint: r.chief_complaint,
  description: r.description ?? undefined,
  symptomsDuration: r.symptoms_duration ?? undefined,
  vitalSigns: r.vital_signs ?? undefined,
  diagnosis: r.diagnosis ?? undefined,
  diagnosisIcd: r.diagnosis_icd ?? undefined,
  severity: r.severity,
  status: r.status,
  createdAt: r.created_at,
});

const mapRecordToApi = (d: CreateRecordRequest) => ({
  patient_id: d.patientId,
  chief_complaint: d.chiefComplaint,
  description: d.description,
  symptoms_duration: d.symptomsDuration,
  vital_signs: d.vitalSigns,
  severity: d.severity ?? "mild",
});

const mapPredictionFromApi = (p: any): Prediction => ({
  id: p.id,
  recordId: p.record_id,
  modelConfigId: p.model_config_id ?? "",
  predictedGroups: (p.predicted_groups ?? []).map((g: any) => ({
    drugGroupId: g.drug_group_id,
    drugGroupName: g.drug_group_name ?? "",
    confidence: g.confidence ?? 0,
    rank: g.rank ?? 0,
  })),
  top1GroupId: p.top1_group_id ?? undefined,
  top1Confidence: p.top1_confidence ?? undefined,
  processingTimeMs: p.processing_time_ms ?? undefined,
  isConfirmed: p.is_confirmed ?? false,
  confirmedGroupId: p.confirmed_group_id ?? undefined,
  createdAt: p.created_at,
});

// ============================================================================
// API ENDPOINTS IMPLEMENTATION
// ============================================================================

// 1. Lấy danh sách nhóm thuốc (Drug Groups)
export const getDrugGroups = async (): Promise<DrugGroup[]> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_DRUG_GROUPS), 300);
    });
  }
  const response = await api.get<DrugGroup[]>("/v1/drug-groups");
  return response.data;
};

// 2. Dự đoán nhóm thuốc (Predict Drug Groups)
export const predictDrugGroups = async (
  text: string, 
  specialtyId: string
): Promise<{ results: PredictionResult[]; latency_ms: number }> => {
  // Edge case: text < 10 ký tự
  if (text.trim().length < 10) {
    throw new Error("Mô tả bệnh án phải tối thiểu 10 ký tự để thực hiện dự đoán.");
  }

  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let results: PredictionResult[] = [];
        if (specialtyId === "Respiratory") {
          results = [
            { drug_group_name: "Kháng sinh - Beta-lactam/Macrolide", confidence: 0.89, rank: 1 },
            { drug_group_name: "Thuốc long đờm", confidence: 0.65, rank: 2 },
            { drug_group_name: "Thuốc giãn phế quản", confidence: 0.45, rank: 3 }
          ];
        } else if (specialtyId === "Cardiology") {
          results = [
            { drug_group_name: "Thuốc ức chế men chuyển (ACEi)", confidence: 0.92, rank: 1 },
            { drug_group_name: "Thuốc chẹn kênh Canxi", confidence: 0.75, rank: 2 },
            { drug_group_name: "Thuốc lợi tiểu Thiazide", confidence: 0.35, rank: 3 }
          ];
        } else if (specialtyId === "Gastroenterology") {
          results = [
            { drug_group_name: "Thuốc kháng acid & bọc dạ dày", confidence: 0.88, rank: 1 },
            { drug_group_name: "Thuốc điều hòa nhu động ruột", confidence: 0.62, rank: 2 },
            { drug_group_name: "Thuốc long đờm", confidence: 0.12, rank: 3 }
          ];
        } else if (specialtyId === "Endocrinology") {
          results = [
            { drug_group_name: "Thuốc hạ đường huyết oral", confidence: 0.94, rank: 1 },
            { drug_group_name: "Hormone tuyến giáp tổng hợp", confidence: 0.48, rank: 2 },
            { drug_group_name: "Thuốc chẹn kênh Canxi", confidence: 0.22, rank: 3 }
          ];
        } else {
          results = [
            { drug_group_name: "Thuốc giảm đau đặc hiệu", confidence: 0.85, rank: 1 },
            { drug_group_name: "Thuốc chống viêm NSAID", confidence: 0.55, rank: 2 },
            { drug_group_name: "Thuốc an thần nhẹ", confidence: 0.20, rank: 3 }
          ];
        }
        resolve({ results, latency_ms: 120 + Math.round(Math.random() * 50) });
      }, 1000);
    });
  }

  const start = performance.now();
  const response = await api.post<{ results: PredictionResult[]; source: string }>("/v1/predictions/predict", {
    text,
    top_k: 3
  });
  return { results: response.data.results, latency_ms: Math.round(performance.now() - start) };
};

// 3. Giải thích dự đoán (XAI Explain)
export const explainPrediction = async (
  text: string,
  _specialtyId: string
): Promise<XAIToken[]> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Tách text thành các từ để gán score heatmap
        const words = text.split(/(\s+)/);
        const highlights: { [key: string]: number } = {
          "sốt": 0.85, "sốt cao": 0.9, "nhiệt độ": 0.7, "39 độ": 0.8,
          "đờm": 0.65, "đờm xanh": 0.75, "ho": 0.4,
          "đau tức": 0.55, "ngực": 0.5, "ngực phải": 0.6,
          "phế quản": 0.7, "khó thở": 0.8, "thở rít": 0.75,
          "đau đầu": 0.8, "migraine": 0.95, "nửa đầu": 0.85, "chóng mặt": 0.4,
          "huyết áp": 0.75, "150/90": 0.85, "160/95": 0.9,
          "dạ dày": 0.85, "chua": 0.6, "đầy hơi": 0.65, "tiêu hóa": 0.5,
          "đường huyết": 0.9, "đái tháo đường": 0.85, "insulin": 0.75
        };

        const tokens: XAIToken[] = words.map(word => {
          const cleanWord = word.trim().toLowerCase();
          let score = 0;
          
          // Kiểm tra xem từ/cụm từ có điểm hotspot không
          for (const key in highlights) {
            if (cleanWord.includes(key) || key.includes(cleanWord) && cleanWord.length > 2) {
              score = highlights[key] * (0.7 + Math.random() * 0.3);
              break;
            }
          }
          // Thêm chút ngẫu nhiên nhỏ cho các từ khác
          if (score === 0 && cleanWord.length > 2) {
            score = (Math.random() - 0.5) * 0.15;
          }
          return { token: word, score };
        });
        resolve(tokens);
      }, 500);
    });
  }

  const response = await api.post<{ predictions: unknown[]; tokens: XAIToken[] }>("/v1/predictions/predict/explain", {
    text,
    top_k: 3
  });
  return response.data.tokens;
};

// 4. Lấy lịch sử dự đoán (Prediction History)
export const getHistory = async (
  page: number, 
  limit: number,
  specialtyId?: string
): Promise<PaginatedResponse<Prediction>> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let predictions = getMockData<Prediction>("mock_predictions");
        
        if (specialtyId) {
          predictions = predictions.filter(p => 
            p.predictedGroups.some(pg => {
              const group = MOCK_DRUG_GROUPS.find(g => g.name === pg.drugGroupName);
              return group && group.category === specialtyId;
            })
          );
        }

        // Sắp xếp giảm dần theo ngày tạo
        predictions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Phân trang
        const total = predictions.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const items = predictions.slice(startIndex, startIndex + limit);

        resolve({
          items,
          total,
          page,
          pageSize: limit,
          totalPages
        });
      }, 400);
    });
  }

  const response = await api.get<{ items: unknown[]; total: number; page: number; limit: number }>(
    "/v1/predictions/history",
    { params: { page, limit, specialty_id: specialtyId } }
  );
  const data = response.data;
  return {
    items: data.items.map(mapPredictionFromApi),
    total: data.total,
    page: data.page,
    pageSize: data.limit,
    totalPages: Math.ceil(data.total / data.limit) || 1,
  };
};

// 5. Lấy danh sách bệnh nhân
export const getPatients = async (search?: string): Promise<Patient[]> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const patients = getMockData<Patient>("mock_patients");
        if (search) {
          const query = search.toLowerCase();
          resolve(
            patients.filter(
              p => p.fullName.toLowerCase().includes(query) || p.patientCode.toLowerCase().includes(query)
            )
          );
        } else {
          resolve(patients);
        }
      }, 300);
    });
  }

  const response = await api.get<any[]>("/v1/patients", {
    params: { search }
  });
  return response.data.map(mapPatientFromApi);
};

// 6. Tạo mới bệnh nhân
export const createPatient = async (patientData: CreatePatientRequest): Promise<Patient> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const patients = getMockData<Patient>("mock_patients");
        const newPatient: Patient = {
          ...patientData,
          id: "p_" + Math.random().toString(36).substr(2, 9),
          patientCode: "BN" + String(patients.length + 1).padStart(3, "0"),
          bloodType: patientData.bloodType as any || "O+",
          gender: patientData.gender as any || "other",
          createdAt: new Date().toISOString()
        };
        patients.push(newPatient);
        saveMockData("mock_patients", patients);
        resolve(newPatient);
      }, 500);
    });
  }

  const response = await api.post<any>("/v1/patients", mapPatientToApi(patientData));
  return mapPatientFromApi(response.data);
};

// 7. Lấy lịch sử bệnh án của 1 bệnh nhân
export const getPatientRecords = async (patientId: string): Promise<MedicalRecord[]> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const records = getMockData<MedicalRecord>("mock_records");
        resolve(records.filter(r => r.patientId === patientId));
      }, 300);
    });
  }

  const response = await api.get<any[]>("/v1/records", {
    params: { patient_id: patientId }
  });
  return response.data.map(mapRecordFromApi);
};

// 8. Tạo bệnh án mới kèm kết quả dự đoán
export const createRecord = async (recordData: CreateRecordRequest): Promise<MedicalRecord> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const records = getMockData<MedicalRecord>("mock_records");
        const newRecord: MedicalRecord = {
          id: "r_" + Math.random().toString(36).substr(2, 9),
          recordCode: "BA" + String(records.length + 1).padStart(3, "0"),
          patientId: recordData.patientId,
          createdBy: "doctor_1",
          chiefComplaint: recordData.chiefComplaint,
          description: recordData.description || "",
          symptomsDuration: recordData.symptomsDuration || "",
          vitalSigns: recordData.vitalSigns || {},
          severity: recordData.severity || "moderate",
          status: "pending",
          createdAt: new Date().toISOString()
        };
        records.push(newRecord);
        saveMockData("mock_records", records);
        resolve(newRecord);
      }, 400);
    });
  }

  const response = await api.post<any>("/v1/records", mapRecordToApi(recordData));
  return mapRecordFromApi(response.data);
};

// Lưu kết quả dự đoán mới vào lịch sử (chỉ dùng ở chế độ Demo)
export const saveDemoPrediction = (prediction: Omit<Prediction, "id" | "createdAt">): Prediction => {
  const predictions = getMockData<Prediction>("mock_predictions");
  const newPrediction: Prediction = {
    ...prediction,
    id: "pred_" + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString()
  };
  
  // Cập nhật lại status của record tương ứng
  const records = getMockData<MedicalRecord>("mock_records");
  const recordIndex = records.findIndex(r => r.id === prediction.recordId);
  if (recordIndex !== -1) {
    records[recordIndex].status = "predicted";
    saveMockData("mock_records", records);
  }

  predictions.push(newPrediction);
  saveMockData("mock_predictions", predictions);
  return newPrediction;
};

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

export const getAnalyticsOverview = async (): Promise<DashboardStats> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const patients = getMockData<Patient>("mock_patients");
        const records = getMockData<MedicalRecord>("mock_records");
        const predictions = getMockData<Prediction>("mock_predictions");
        const confirmed = predictions.filter(p => p.isConfirmed).length;

        resolve({
          totalPatients: patients.length,
          totalRecords: records.length,
          totalPredictions: predictions.length,
          confirmedPredictions: confirmed,
          averageAccuracy: 0.845,
          modelVersion: "xlm-roberta-lora-v1.2"
        });
      }, 400);
    });
  }
  
  const response = await api.get<{
    total_patients: number;
    total_records: number;
    total_predictions: number;
    total_drug_groups: number;
  }>("/analytics/overview");
  const d = response.data;
  return {
    totalPatients: d.total_patients ?? 0,
    totalRecords: d.total_records ?? 0,
    totalPredictions: d.total_predictions ?? 0,
    confirmedPredictions: 0,
    averageAccuracy: 0,
    modelVersion: "xlm-roberta-lora",
  };
};

export const getAnalyticsDailyUsage = async (): Promise<{ date: string; predictions: number }[]> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 3600 * 1000);
          const dateStr = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
          // Tạo một số lượng ngẫu nhiên quanh 5-15 predictions một ngày
          const dayOfWeek = date.getDay();
          const base = dayOfWeek === 0 || dayOfWeek === 6 ? 3 : 12; // ít hơn vào cuối tuần
          data.push({
            date: dateStr,
            predictions: base + Math.floor(Math.random() * 6) - 3
          });
        }
        resolve(data);
      }, 400);
    });
  }

  const response = await api.get<{ date: string; count: number }[]>(
    "/analytics/search_logs/daily-usage",
    { params: { days: 30 } }
  );
  return response.data.map((d) => ({ date: d.date, predictions: d.count }));
};

export const getAnalyticsDrugDistribution = async (): Promise<{ name: string; count: number }[]> => {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { name: "Kháng sinh (Beta-lactam/Macrolide)", count: 48 },
          { name: "Thuốc giãn phế quản", count: 32 },
          { name: "Thuốc ức chế men chuyển (ACEi)", count: 28 },
          { name: "Thuốc giảm đau đặc hiệu", count: 25 },
          { name: "Thuốc kháng acid dạ dày", count: 21 },
          { name: "Thuốc hạ đường huyết", count: 18 }
        ]);
      }, 400);
    });
  }

  const response = await api.get<{ group: string; count: number }[]>(
    "/analytics/search_logs/drug-group-distribution"
  );
  return response.data.map((d) => ({ name: d.group, count: d.count }));
};
