import React, { useState, useEffect } from "react";
import { 
  User, ClipboardList, Filter, ChevronLeft, 
  ChevronRight, Activity, Eye, AlertCircle, Sparkles
} from "lucide-react";
import { getHistory, getDrugGroups, explainPrediction } from "../services/api";
import type { Prediction, MedicalRecord, Patient } from "../types";

export default function HistoryPage() {
  const [history, setHistory] = useState<Prediction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  // States for Detail Modal
  const [selectedPred, setSelectedPred] = useState<Prediction | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [xaiTokens, setXaiTokens] = useState<{ token: string; score: number }[]>([]);

  // Load unique specialties/categories
  useEffect(() => {
    getDrugGroups().then(groups => {
      const cats = Array.from(new Set(groups.map(g => g.category)));
      setSpecialties(cats);
    }).catch(console.error);
  }, []);

  // Fetch history when page, filter, or sort order changes
  const fetchHistory = () => {
    setIsLoading(true);
    getHistory(page, limit, specialtyFilter)
      .then(res => {
        let items = [...res.items];
        // Sort
        items.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        });
        setHistory(items);
        setTotal(res.total);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [page, specialtyFilter, sortOrder]);

  // Handle viewing prediction details
  const handleViewDetail = async (pred: Prediction) => {
    setSelectedPred(pred);
    setIsDetailLoading(true);
    setXaiTokens([]);
    
    try {
      // Load patient & record from local storage or APIs
      const mockRecords: MedicalRecord[] = JSON.parse(localStorage.getItem("mock_records") || "[]");
      const mockPatients: Patient[] = JSON.parse(localStorage.getItem("mock_patients") || "[]");
      
      const record = mockRecords.find(r => r.id === pred.recordId);
      if (record) {
        setSelectedRecord(record);
        const patient = mockPatients.find(p => p.id === record.patientId);
        if (patient) {
          setSelectedPatient(patient);
        }
        
        // Fetch XAI highlights
        const specialtyGroup = MOCK_DRUG_GROUPS().find(g => 
          pred.predictedGroups.some(pg => pg.drugGroupName === g.name)
        );
        const specId = specialtyGroup ? specialtyGroup.category : "Respiratory";
        const tokens = await explainPrediction(record.chiefComplaint + " " + (record.description || ""), specId);
        setXaiTokens(tokens);
      }
    } catch (error) {
      console.error("Error loading detail info:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Helper function to find specialty name from prediction
  const getSpecialtyLabel = (pred: Prediction) => {
    if (pred.predictedGroups.length === 0) return "N/A";
    const groupName = pred.predictedGroups[0].drugGroupName;
    const group = MOCK_DRUG_GROUPS().find(g => g.name === groupName);
    return group ? translateCategory(group.category) : "Đa khoa";
  };

  const translateCategory = (cat: string) => {
    const mapping: Record<string, string> = {
      "Respiratory": "Hô Hấp",
      "Cardiology": "Tim Mạch",
      "Neurology": "Thần Kinh",
      "Gastroenterology": "Tiêu Hóa",
      "Endocrinology": "Nội Tiết"
    };
    return mapping[cat] || cat;
  };

  // Trợ giúp lấy danh sách thuốc (mock)
  const MOCK_DRUG_GROUPS = () => [
    { name: "Kháng sinh - Beta-lactam/Macrolide", category: "Respiratory" },
    { name: "Thuốc giãn phế quản", category: "Respiratory" },
    { name: "Thuốc long đờm", category: "Respiratory" },
    { name: "Thuốc ức chế men chuyển (ACEi)", category: "Cardiology" },
    { name: "Thuốc chẹn kênh Canxi", category: "Cardiology" },
    { name: "Thuốc lợi tiểu Thiazide", category: "Cardiology" },
    { name: "Thuốc giảm đau đặc hiệu", category: "Neurology" },
    { name: "Thuốc chống viêm NSAID", category: "Neurology" },
    { name: "Thuốc an thần nhẹ", category: "Neurology" },
    { name: "Thuốc kháng acid & bọc dạ dày", category: "Gastroenterology" },
    { name: "Thuốc điều hòa nhu động ruột", category: "Gastroenterology" },
    { name: "Thuốc hạ đường huyết oral", category: "Endocrinology" },
    { name: "Hormone tuyến giáp tổng hợp", category: "Endocrinology" }
  ];

  // Render colored tokens for XAI Heatmap
  const renderXAITokens = () => {
    if (xaiTokens.length === 0) {
      return <p className="text-gray-400 italic text-sm">Không có dữ liệu giải thích XAI.</p>;
    }

    return (
      <div className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-sm leading-relaxed border border-slate-800 break-words whitespace-pre-wrap max-h-64 overflow-y-auto">
        {xaiTokens.map((t, idx) => {
          let style: React.CSSProperties = {};
          if (t.score > 0) {
            // Hotspot tích cực (Đỏ)
            const alpha = Math.min(0.85, 0.15 + t.score * 0.8);
            style = { backgroundColor: `rgba(239, 68, 68, ${alpha})`, color: "#fff", borderRadius: "2px", padding: "0 1px" };
          } else if (t.score < 0) {
            // Hotspot tiêu cực (Xanh dương)
            const alpha = Math.min(0.85, 0.15 + Math.abs(t.score) * 0.8);
            style = { backgroundColor: `rgba(59, 130, 246, ${alpha})`, color: "#fff", borderRadius: "2px", padding: "0 1px" };
          }
          return (
            <span key={idx} style={style}>
              {t.token}
            </span>
          );
        })}
      </div>
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <header className="mb-2">
        <h2 className="text-3xl font-bold font-heading text-text">Lịch sử Dự đoán</h2>
        <p className="text-text/70 text-sm mt-1">Tra cứu và phân tích các ca dự đoán bệnh án lâm sàng đã thực hiện</p>
      </header>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-text/75 font-semibold">
            <Filter className="w-4 h-4 text-primary" /> Lọc chuyên khoa:
          </div>
          <button
            onClick={() => { setSpecialtyFilter(""); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              specialtyFilter === "" 
                ? "bg-primary text-white" 
                : "bg-gray-50 hover:bg-gray-100 text-text/75"
            }`}
          >
            Tất cả
          </button>
          {specialties.map(spec => (
            <button
              key={spec}
              onClick={() => { setSpecialtyFilter(spec); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                specialtyFilter === spec 
                  ? "bg-primary text-white" 
                  : "bg-gray-50 hover:bg-gray-100 text-text/75"
              }`}
            >
              {translateCategory(spec)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-text/75 font-semibold">Sắp xếp:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
            className="px-3 py-2 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
          >
            <option value="desc">Mới nhất trước</option>
            <option value="asc">Cũ nhất trước</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center gap-3">
            <Activity className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-text/75">Đang tải lịch sử...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-16 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300" />
            <span className="text-lg font-bold text-text/75">Không tìm thấy bản ghi nào</span>
            <span className="text-sm text-text/50">Vui lòng thực hiện thêm dự đoán hoặc thay đổi bộ lọc.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-text/50 font-bold uppercase tracking-wider">
                  <th className="p-5">Mã bệnh án / Ca</th>
                  <th className="p-5">Chuyên khoa</th>
                  <th className="p-5">Dự đoán Top 1</th>
                  <th className="p-5">Độ tin cậy</th>
                  <th className="p-5">Thời gian chạy</th>
                  <th className="p-5">Ngày thực hiện</th>
                  <th className="p-5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {history.map((pred) => {
                  const topPred = pred.predictedGroups[0];
                  const percent = topPred ? Math.round(topPred.confidence * 100) : 0;
                  
                  return (
                    <tr key={pred.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-5">
                        <div className="font-bold text-text">#{pred.recordId.substring(0, 6)}</div>
                        <div className="text-xs text-text/50 mt-0.5 max-w-[200px] truncate">
                          Mô tả: {pred.predictedGroups.length > 0 ? "Phân tích thuốc..." : "Không rõ"}
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="px-2.5 py-1 bg-blue-50 text-primary rounded-md font-semibold text-xs border border-blue-100/50">
                          {getSpecialtyLabel(pred)}
                        </span>
                      </td>
                      <td className="p-5 font-semibold text-text">
                        {topPred ? topPred.drugGroupName : "N/A"}
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${percent >= 70 ? "text-cta" : percent >= 40 ? "text-primary" : "text-text/75"}`}>
                            {percent}%
                          </span>
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${percent >= 70 ? "bg-cta" : percent >= 40 ? "bg-primary" : "bg-gray-300"}`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-5 font-mono text-xs text-text/50">
                        {pred.processingTimeMs ? `${pred.processingTimeMs}ms` : "140ms"}
                      </td>
                      <td className="p-5 text-xs text-text/75 flex flex-col">
                        <span className="font-semibold">{new Date(pred.createdAt).toLocaleDateString("vi-VN")}</span>
                        <span className="text-[10px] text-text/50">{new Date(pred.createdAt).toLocaleTimeString("vi-VN")}</span>
                      </td>
                      <td className="p-5 text-right">
                        <button
                          onClick={() => handleViewDetail(pred)}
                          className="p-2 hover:bg-primary/10 rounded-lg text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-text/50">
              Hiển thị bản ghi { (page - 1) * limit + 1 } - { Math.min(page * limit, total) } trong tổng số { total }
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-text px-2">Trang {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal / Drawer */}
      {selectedPred && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold font-heading text-text">Chi tiết Dự đoán Lâm sàng</h3>
                <p className="text-xs text-text/50 mt-1">ID: {selectedPred.id}</p>
              </div>
              <button
                onClick={() => setSelectedPred(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-xl transition text-xs font-semibold text-text/75"
              >
                Đóng
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {isDetailLoading ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <Activity className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm text-text/75">Đang nạp thông tin...</span>
                </div>
              ) : (
                <>
                  {/* Patient Info Card */}
                  {selectedPatient && (
                    <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                        <User className="w-3.5 h-3.5" /> Thông tin bệnh nhân
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-1">
                        <div>
                          <span className="text-xs text-text/50 block">Họ và tên:</span>
                          <span className="font-bold text-text">{selectedPatient.fullName}</span>
                        </div>
                        <div>
                          <span className="text-xs text-text/50 block">Mã bệnh nhân:</span>
                          <span className="font-mono font-bold text-text">{selectedPatient.patientCode}</span>
                        </div>
                        <div>
                          <span className="text-xs text-text/50 block">Ngày sinh:</span>
                          <span className="font-bold text-text">{new Date(selectedPatient.dateOfBirth).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div>
                          <span className="text-xs text-text/50 block">Giới tính:</span>
                          <span className="font-bold text-text">{selectedPatient.gender === "male" ? "Nam" : selectedPatient.gender === "female" ? "Nữ" : "Khác"}</span>
                        </div>
                        {selectedPatient.bloodType && (
                          <div>
                            <span className="text-xs text-text/50 block">Nhóm máu:</span>
                            <span className="font-bold text-red-600">{selectedPatient.bloodType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Medical Symptoms and Description */}
                  {selectedRecord && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-text/50 uppercase tracking-wider">
                        <ClipboardList className="w-3.5 h-3.5" /> Bệnh lý & Triệu chứng
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-3">
                        <div>
                          <span className="text-xs text-text/50 block font-semibold">Lý do vào viện (Chief Complaint):</span>
                          <p className="text-sm text-text font-medium mt-1 leading-relaxed">{selectedRecord.chiefComplaint}</p>
                        </div>
                        {selectedRecord.description && (
                          <div>
                            <span className="text-xs text-text/50 block font-semibold">Mô tả lâm sàng:</span>
                            <p className="text-sm text-text/75 mt-1 leading-relaxed">{selectedRecord.description}</p>
                          </div>
                        )}
                        {/* Vital Signs */}
                        {selectedRecord.vitalSigns && (
                          <div className="pt-2 border-t border-gray-100">
                            <span className="text-xs text-text/50 block font-semibold mb-2">Chỉ số sinh hiệu:</span>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs text-center">
                              {selectedRecord.vitalSigns.temperature && (
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <span className="text-text/50 block">Nhiệt độ</span>
                                  <span className="font-bold text-text">{selectedRecord.vitalSigns.temperature}°C</span>
                                </div>
                              )}
                              {selectedRecord.vitalSigns.bloodPressure && (
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <span className="text-text/50 block">Huyết áp</span>
                                  <span className="font-bold text-text">{selectedRecord.vitalSigns.bloodPressure}</span>
                                </div>
                              )}
                              {selectedRecord.vitalSigns.heartRate && (
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <span className="text-text/50 block">Mạch</span>
                                  <span className="font-bold text-text">{selectedRecord.vitalSigns.heartRate} l/p</span>
                                </div>
                              )}
                              {selectedRecord.vitalSigns.respiratoryRate && (
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <span className="text-text/50 block">Nhịp thở</span>
                                  <span className="font-bold text-text">{selectedRecord.vitalSigns.respiratoryRate} l/p</span>
                                </div>
                              )}
                              {selectedRecord.vitalSigns.spo2 && (
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                  <span className="text-text/50 block">SpO2</span>
                                  <span className="font-bold text-primary">{selectedRecord.vitalSigns.spo2}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Predictions Results in Details */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-text/50 uppercase tracking-wider">
                      <Activity className="w-3.5 h-3.5" /> Kết quả phân tích thuốc
                    </div>
                    <div className="flex flex-col gap-4">
                      {selectedPred.predictedGroups.map((pg, idx) => {
                        const pct = Math.round(pg.confidence * 100);
                        return (
                          <div key={idx} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-text">{pg.drugGroupName}</span>
                              <span className={`font-extrabold ${pct >= 70 ? "text-cta" : pct >= 40 ? "text-primary" : "text-text/50"}`}>{pct}%</span>
                            </div>
                            <div className="h-3 w-full bg-gray-50 border border-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${pct >= 70 ? "bg-cta" : pct >= 40 ? "bg-primary" : "bg-gray-300"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* XAI Heatmap Panel */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-text/50 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Bản đồ giải thích XAI (Hotspot)
                    </div>
                    {renderXAITokens()}
                    <div className="flex items-center gap-4 text-xs text-text/50">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 bg-red-400 rounded" />
                        <span>Ảnh hưởng tích cực đến dự đoán</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 bg-blue-400 rounded" />
                        <span>Ảnh hưởng tiêu cực đến dự đoán</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
