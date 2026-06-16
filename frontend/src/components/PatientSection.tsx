import React, { useState, useEffect, useCallback } from "react";
import { 
  UserPlus, Search, User, Phone, MapPin, Heart, 
  AlertTriangle, Clipboard, Calendar, FileText, Plus, ChevronRight
} from "lucide-react";
import { getPatients, createPatient, getPatientRecords } from "../services/api";
import type { Patient, MedicalRecord, CreatePatientRequest } from "../types";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface PatientSectionProps {
  onSelectPatientForPrediction: (patient: Patient) => void;
}

export default function PatientSection({ onSelectPatientForPrediction }: PatientSectionProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Patient Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newGender, setNewGender] = useState<"male" | "female" | "other">("male");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newBloodType, setNewBloodType] = useState("O+");
  const [newAllergies, setNewAllergies] = useState("");
  const [newDiseases, setNewDiseases] = useState("");
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);

  // Fetch patients
  const fetchPatients = useCallback((query?: string) => {
    setIsLoadingPatients(true);
    getPatients(query)
      .then(setPatients)
      .catch(console.error)
      .finally(() => setIsLoadingPatients(false));
  }, []);

  useEffect(() => {
    fetchPatients(debouncedSearch);
  }, [debouncedSearch, fetchPatients]);

  // Load records for selected patient
  useEffect(() => {
    if (selectedPatient) {
      setIsLoadingRecords(true);
      getPatientRecords(selectedPatient.id)
        .then(setRecords)
        .catch(console.error)
        .finally(() => setIsLoadingRecords(false));
    } else {
      setRecords([]);
    }
  }, [selectedPatient]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDob) return;
    setIsSubmittingPatient(true);

    const data: CreatePatientRequest = {
      fullName: newName,
      dateOfBirth: newDob,
      gender: newGender,
      phone: newPhone || undefined,
      address: newAddress || undefined,
      bloodType: newBloodType,
      allergies: newAllergies ? newAllergies.split(",").map(x => x.trim()) : [],
      chronicDiseases: newDiseases ? newDiseases.split(",").map(x => x.trim()) : []
    };

    try {
      const added = await createPatient(data);
      setSelectedPatient(added);
      setIsModalOpen(false);
      // Reset form
      setNewName("");
      setNewDob("");
      setNewPhone("");
      setNewAddress("");
      setNewAllergies("");
      setNewDiseases("");
      fetchPatients();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6 min-h-[70vh]">
      {/* Left Pane: Patient search and selection */}
      <div className="w-full md:w-80 bg-white rounded-3xl border border-gray-100 shadow-md p-5 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-text">Bệnh nhân</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition"
            title="Thêm bệnh nhân mới"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên hoặc mã BN..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
          />
        </div>

        {/* Patients List */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] md:max-h-[60vh] flex flex-col gap-2 pr-1">
          {isLoadingPatients ? (
            <div className="py-8 flex items-center justify-center text-xs text-text/50">
              Đang tải danh sách...
            </div>
          ) : patients.length === 0 ? (
            <div className="py-8 text-center text-xs text-text/50">
              Không tìm thấy bệnh nhân nào
            </div>
          ) : (
            patients.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between ${
                  selectedPatient?.id === p.id 
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/15" 
                    : "bg-white hover:bg-gray-50 border-gray-100"
                }`}
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm leading-tight">{p.fullName}</div>
                  <div className={`text-[10px] ${selectedPatient?.id === p.id ? "text-white/80" : "text-text/50"}`}>
                    Mã BN: {p.patientCode} · {new Date(p.dateOfBirth).getFullYear()}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${selectedPatient?.id === p.id ? "opacity-100" : "opacity-30"}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Patient Details & Records History */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-md p-6 flex flex-col gap-6">
        {selectedPatient ? (
          <>
            {/* Header Details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-primary to-blue-500 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-heading text-text">{selectedPatient.fullName}</h3>
                  <p className="text-xs text-text/50 mt-1 font-semibold">Mã bệnh nhân: <span className="font-mono">{selectedPatient.patientCode}</span></p>
                </div>
              </div>
              
              <button
                onClick={() => onSelectPatientForPrediction(selectedPatient)}
                className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                <Plus className="w-4 h-4" /> Khởi chạy dự đoán mới
              </button>
            </div>

            {/* Profile Information Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-text/50 shrink-0" />
                <div>
                  <span className="text-[10px] text-text/50 block">Ngày sinh</span>
                  <span className="font-semibold">{new Date(selectedPatient.dateOfBirth).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-text/50 shrink-0" />
                <div>
                  <span className="text-[10px] text-text/50 block">Số điện thoại</span>
                  <span className="font-semibold">{selectedPatient.phone || "Không cung cấp"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-text/50 shrink-0" />
                <div>
                  <span className="text-[10px] text-text/50 block">Địa chỉ</span>
                  <span className="font-semibold truncate max-w-[150px] inline-block">{selectedPatient.address || "Không cung cấp"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-text/50 block">Nhóm máu</span>
                  <span className="font-bold text-red-600">{selectedPatient.bloodType || "Chưa lưu"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-text/50 block">Dị ứng thuốc</span>
                  <span className="font-semibold text-amber-700">
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 
                      ? selectedPatient.allergies.join(", ") 
                      : "Không có tiền sử dị ứng thuốc"}
                  </span>
                </div>
              </div>
            </div>

            {/* Chronic diseases warning if any */}
            {selectedPatient.chronicDiseases && selectedPatient.chronicDiseases.length > 0 && (
              <div className="px-4 py-3 bg-red-50/50 text-red-800 rounded-xl text-xs border border-red-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span><strong>Tiền sử bệnh lý mãn tính:</strong> {selectedPatient.chronicDiseases.join(", ")}</span>
              </div>
            )}

            {/* Records List (Lịch sử bệnh án) */}
            <div className="flex-1 flex flex-col gap-4">
              <h4 className="font-bold text-base text-text flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-primary" /> Lịch sử bệnh án ({records.length})
              </h4>
              
              {isLoadingRecords ? (
                <div className="py-8 text-center text-sm text-text/50">Đang tải lịch sử bệnh án...</div>
              ) : records.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-center text-text/50">
                  <FileText className="w-8 h-8 opacity-40 text-text" />
                  <span className="text-sm">Chưa có hồ sơ bệnh án nào cho bệnh nhân này</span>
                  <button 
                    onClick={() => onSelectPatientForPrediction(selectedPatient)}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    Khởi tạo bệnh án đầu tiên
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[35vh] flex flex-col gap-3 pr-1">
                  {records.map(record => (
                    <div 
                      key={record.id} 
                      className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-text/50">Mã bệnh án: {record.recordCode}</span>
                        <span className="text-[10px] text-text/50 font-semibold">{new Date(record.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text/50 block font-semibold">Lý do khám bệnh:</span>
                        <p className="text-sm text-text font-semibold">{record.chiefComplaint}</p>
                      </div>
                      {record.description && (
                        <div>
                          <span className="text-[10px] text-text/50 block font-semibold">Chẩn đoán sơ bộ / Mô tả:</span>
                          <p className="text-xs text-text/75 line-clamp-2">{record.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-gray-100 text-text/30">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-text/75">Chưa có bệnh nhân nào được chọn</h3>
            <p className="text-sm text-text/50 max-w-sm">Chọn bệnh nhân từ danh sách bên trái hoặc nhấn nút "+" để thêm mới bệnh nhân.</p>
          </div>
        )}
      </div>

      {/* Patient Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold font-heading text-text">Thêm bệnh nhân mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold text-text/50 hover:text-text"
              >
                Hủy
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreatePatient} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Họ và tên bệnh nhân *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Ngày sinh *</label>
                  <input
                    type="date"
                    required
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Giới tính *</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as "male" | "female" | "other")}
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Số điện thoại</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Nhóm máu</label>
                  <select
                    value={newBloodType}
                    onChange={(e) => setNewBloodType(e.target.value)}
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Địa chỉ</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Nhập địa chỉ bệnh nhân..."
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Tiền sử dị ứng (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={newAllergies}
                    onChange={(e) => setNewAllergies(e.target.value)}
                    placeholder="Ví dụ: Penicillin, Aspirin..."
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text/75 mb-1.5">Bệnh lý mãn tính (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={newDiseases}
                    onChange={(e) => setNewDiseases(e.target.value)}
                    placeholder="Ví dụ: Tăng huyết áp, Đái tháo đường..."
                    className="w-full p-2.5 border-2 border-gray-100 bg-gray-50/50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 hover:bg-gray-100 text-text/75 font-semibold rounded-xl text-sm transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPatient}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl text-sm transition flex items-center gap-1.5"
                >
                  {isSubmittingPatient ? "Đang tạo..." : "Lưu bệnh nhân"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
