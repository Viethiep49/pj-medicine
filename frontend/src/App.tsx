import React, { useState, useEffect } from 'react';
import { 
  Activity, Stethoscope, CheckCircle2, Users, User,
  AlertCircle, BrainCircuit, FileText, Wind, HeartPulse, 
  Brain, Microscope, ChevronLeft, 
  ArrowRight, Server, Layers, Cpu, Code2, LineChart, ShieldCheck,
  Zap, GitBranch, Menu, X, ClipboardList, Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'react-hot-toast';

// API Imports
import { 
  predictDrugGroups, 
  explainPrediction, 
  getDrugGroups, 
  isDemoMode, 
  setDemoMode,
  createRecord,
  saveDemoPrediction
} from './services/api';
import type { Patient, PredictionResult, XAIToken } from './types';

// Lazy Loaded Components
const HistoryPage = React.lazy(() => import('./components/HistoryPage'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const PatientSection = React.lazy(() => import('./components/PatientSection'));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fallback STATIC SPECIALTIES MAP with premium Icons & Cases
const STATIC_SPECIALTIES_MAP = [
  {
    id: 'Respiratory',
    name: 'Khoa Hô Hấp',
    icon: <Wind className="w-5 h-5" />,
    cases: [
      {
        title: 'Viêm phổi cộng đồng',
        text: 'Bệnh nhân nam 45 tuổi, sốt cao 39 độ liên tục 3 ngày nay, ho có đờm xanh ngả vàng, đau tức ngực phải khi ho. Tiền sử hút thuốc lá 10 năm. Nhịp thở 25 l/p, SpO2 94%. Phổi phải có ralp nổ đáy.'
      },
      {
        title: 'Đợt cấp COPD',
        text: 'Bệnh nhân nam 65 tuổi, tiền sử COPD 5 năm. Vào viện vì khó thở tăng dần, ho đờm đục nhiều, thở rít. Không sốt. Mạch 110 l/p, HA 130/80.'
      }
    ]
  },
  {
    id: 'Cardiology',
    name: 'Khoa Tim Mạch',
    icon: <HeartPulse className="w-5 h-5" />,
    cases: [
      {
        title: 'Tăng huyết áp vô căn',
        text: 'Bệnh nhân nữ 55 tuổi, thỉnh thoảng đau đầu vùng chẩm, chóng mặt nhẹ. Huyết áp đo tại nhà dao động 150/90 - 160/95 mmHg. Nhịp tim đều 80 l/p. ECG không có dấu hiệu thiếu máu cơ tim.'
      }
    ]
  },
  {
    id: 'Neurology',
    name: 'Khoa Thần Kinh',
    icon: <Brain className="w-5 h-5" />,
    cases: [
      {
        title: 'Đau nửa đầu Migraine',
        text: 'Bệnh nhân nữ 28 tuổi, đau nửa đầu phải theo nhịp mạch đập, buồn nôn, sợ ánh sáng và tiếng ồn. Cơn đau kéo dài 4-6 tiếng, xuất hiện 2 lần/tháng. Không có dấu hiệu thần kinh khu trú.'
      }
    ]
  },
  {
    id: 'Gastroenterology',
    name: 'Khoa Tiêu Hóa',
    icon: <Activity className="w-5 h-5" />,
    cases: [
      {
        title: 'Viêm loét dạ dày tá tràng',
        text: 'Bệnh nhân nam 35 tuổi, đau thượng vị đói nhiều, ợ hơi ợ chua liên tục 1 tháng nay. Tiền sử uống rượu bia nhiều. Không sốt. Bụng mềm, ấn đau vùng thượng vị.'
      },
      {
        title: 'Trào ngược dạ dày thực quản (GERD)',
        text: 'Bệnh nhân nữ 24 tuổi, cảm giác nóng rát sau xương ức tăng sau ăn, đắng miệng vào buổi sáng, ho khan kéo dài. Họng đỏ nhẹ.'
      }
    ]
  },
  {
    id: 'Endocrinology',
    name: 'Khoa Nội Tiết',
    icon: <Microscope className="w-5 h-5" />,
    cases: [
      {
        title: 'Đái tháo đường Typ 2',
        text: 'Bệnh nhân nam 50 tuổi, mệt mỏi, sụt 4kg trong 1 tháng, uống nhiều tiểu nhiều. Xét nghiệm Glucose máu đói 8.2 mmol/L, HbA1c 7.5%. Mạch 78 l/p, HA 120/80.'
      },
      {
        title: 'Suy giáp lâm sàng',
        text: 'Bệnh nhân nữ 42 tuổi, sợ lạnh, táo bón, da khô, rụng tóc nhiều, mệt mỏi vô cớ. Mạch chậm 58 l/p. Tuyến giáp không to.'
      }
    ]
  }
];

function ShimmerSkeleton() {
  return (
    <div className="mt-6 p-8 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-4 w-full">
          <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-24 h-6 bg-slate-200 rounded" />
          <div className="w-24 h-6 bg-slate-200 rounded" />
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div className="h-5 bg-slate-200 rounded w-1/4" />
              <div className="h-6 bg-slate-200 rounded w-12" />
            </div>
            <div className="h-4 w-full bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | '404' | 'error'>('landing');
  const [subView, setSubView] = useState<'predict' | 'patients' | 'history' | 'analytics'>('predict');
  
  // Dynamic specialties loaded from API
  const [specialties, setSpecialties] = useState<any[]>(STATIC_SPECIALTIES_MAP);
  const [activeSpecialty, setActiveSpecialty] = useState(STATIC_SPECIALTIES_MAP[0]);
  
  // App mode: Demo Mock vs Real API connection
  const [appDemoMode, setAppDemoMode] = useState(isDemoMode());
  
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PredictionResult[] | null>(null);
  const [xaiTokens, setXaiTokens] = useState<XAIToken[]>([]);
  const [inputMode, setInputMode] = useState<'edit' | 'xai'>('edit');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Selected Patient for prediction flow
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Fetch specialties (drug groups categories) at mount or mode change
  useEffect(() => {
    getDrugGroups()
      .then(groups => {
        const categories = Array.from(new Set(groups.map(g => g.category)));
        const dynamicSpecialties = categories.map(cat => {
          const matched = STATIC_SPECIALTIES_MAP.find(s => s.id === cat) || {
            name: `Khoa ${cat}`,
            icon: <Activity className="w-5 h-5" />,
            cases: []
          };
          return {
            id: cat,
            ...matched
          };
        });
        if (dynamicSpecialties.length > 0) {
          setSpecialties(dynamicSpecialties);
          setActiveSpecialty(dynamicSpecialties[0]);
        }
      })
      .catch(err => {
        console.error("Error loading specialties:", err);
      });
  }, [appDemoMode]);

  const handleToggleDemoMode = () => {
    const nextMode = !appDemoMode;
    setDemoMode(nextMode);
    setAppDemoMode(nextMode);
    toast.success(`Đã chuyển sang chế độ ${nextMode ? "Demo Mock" : "Kết nối API Thật"}`);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    // Edge case validation
    if (text.trim().length < 10) {
      toast.error("Mô tả bệnh án phải tối thiểu 10 ký tự!");
      return;
    }

    setIsLoading(true);
    setResults(null);
    setXaiTokens([]);
    setInputMode('edit');

    try {
      // 1. Predict
      const data = await predictDrugGroups(text, activeSpecialty.id);
      setResults(data.results);

      // 2. Explain (XAI)
      const explainData = await explainPrediction(text, activeSpecialty.id);
      setXaiTokens(explainData);

      // 3. Link Patient Record if selected
      if (selectedPatient) {
        const record = await createRecord({
          patientId: selectedPatient.id,
          chiefComplaint: text.substring(0, 100),
          description: text,
          severity: "moderate",
          vitalSigns: { temperature: 37 }
        });

        if (appDemoMode) {
          saveDemoPrediction({
            recordId: record.id,
            modelConfigId: "mamba-3",
            predictedGroups: data.results.map((r) => ({
              drugGroupId: "dg_" + r.rank,
              drugGroupName: r.drug_group_name,
              confidence: r.confidence,
              rank: r.rank
            })),
            isConfirmed: false
          });
        }
        toast.success("Đã phân tích và lưu hồ sơ bệnh án thành công!");
      } else {
        toast.success("Phân tích kết quả thành công!");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Đã xảy ra lỗi khi kết nối dịch vụ API!");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCase = (caseText: string) => {
    setText(caseText);
    setResults(null);
    setXaiTokens([]);
    setInputMode('edit');
  };

  const selectPatientForPrediction = (patient: Patient) => {
    setSelectedPatient(patient);
    setResults(null);
    setXaiTokens([]);
    setInputMode('edit');
    setSubView('predict');
    toast.success(`Đã chọn bệnh nhân ${patient.fullName}`);
  };

  // Render colored tokens for input area heatmap
  const renderInputHeatmap = () => {
    if (xaiTokens.length === 0) return null;
    return (
      <div className="w-full h-56 p-5 rounded-2xl border-2 border-slate-900 bg-slate-950 text-slate-100 font-mono text-base leading-relaxed overflow-y-auto break-words whitespace-pre-wrap">
        {xaiTokens.map((t, idx) => {
          let style: React.CSSProperties = {};
          if (t.score > 0) {
            const alpha = Math.min(0.85, 0.15 + t.score * 0.8);
            style = { backgroundColor: `rgba(239, 68, 68, ${alpha})`, color: "#fff", borderRadius: "3px", padding: "1px 2px" };
          } else if (t.score < 0) {
            const alpha = Math.min(0.85, 0.15 + Math.abs(t.score) * 0.8);
            style = { backgroundColor: `rgba(59, 130, 246, ${alpha})`, color: "#fff", borderRadius: "3px", padding: "1px 2px" };
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

  // --- 404 VIEW ---
  if (view === '404') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Toaster position="top-right" />
        <div className="p-4 bg-white rounded-full shadow-lg mb-6 border border-gray-100">
          <AlertCircle className="w-16 h-16 text-primary animate-bounce" />
        </div>
        <h1 className="text-4xl font-extrabold font-heading text-text mb-4">404 - Không tìm thấy trang</h1>
        <p className="text-text/75 mb-8 max-w-md">Trang bạn đang truy cập không tồn tại hoặc đã được di chuyển sang một địa chỉ khác.</p>
        <button 
          onClick={() => setView('landing')}
          className="px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20"
        >
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  // --- ERROR VIEW ---
  if (view === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Toaster position="top-right" />
        <div className="p-4 bg-white rounded-full shadow-lg mb-6 border border-gray-100">
          <Activity className="w-16 h-16 text-red-500 animate-pulse" />
        </div>
        <h1 className="text-4xl font-extrabold font-heading text-text mb-4">Đã xảy ra sự cố</h1>
        <p className="text-text/75 mb-8 max-w-md">Hệ thống hỗ trợ quyết định lâm sàng (CDSS) gặp lỗi kết nối server hoặc lỗi tải mô hình XLM-RoBERTa.</p>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="px-6 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20"
          >
            Thử lại Dashboard
          </button>
          <button 
            onClick={() => setView('landing')}
            className="px-6 py-3.5 bg-gray-200 text-text font-semibold rounded-xl hover:bg-gray-300 transition"
          >
            Về Trang chủ
          </button>
        </div>
      </div>
    );
  }

  // --- LANDING PAGE VIEW ---
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        <Toaster position="top-right" />
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div 
              role="button"
              tabIndex={0}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              aria-label="Drug-Pred AI logo"
            >
              <div className="p-1.5 bg-primary rounded-md text-white shadow-sm shadow-primary/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-heading text-primary tracking-tight">Drug-Pred AI</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#overview" className="text-text/70 hover:text-primary transition-colors">Tổng quan</a>
              <a href="#architecture" className="text-text/70 hover:text-primary transition-colors">Dynamic Expert Switching</a>
              <a href="#techstack" className="text-text/70 hover:text-primary transition-colors">Công nghệ</a>
              <button 
                onClick={() => setView('dashboard')}
                className="px-6 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 hover:scale-105 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
              >
                Mở Clinical Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Menu Icon */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-text hover:text-primary transition-colors rounded-lg"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation Drawer */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-b border-gray-100 bg-white/95 backdrop-blur-md px-6 py-4 flex flex-col gap-4">
              <a href="#overview" onClick={() => setIsMobileMenuOpen(false)} className="text-text/75 hover:text-primary font-medium transition py-1">Tổng quan</a>
              <a href="#architecture" onClick={() => setIsMobileMenuOpen(false)} className="text-text/75 hover:text-primary font-medium transition py-1">Dynamic Expert Switching</a>
              <a href="#techstack" onClick={() => setIsMobileMenuOpen(false)} className="text-text/75 hover:text-primary font-medium transition py-1">Công nghệ</a>
              <button 
                onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                className="w-full text-center px-6 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                Mở Clinical Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <main className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center" id="overview">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-primary text-sm font-semibold mb-8 border border-blue-100/50">
            <Zap className="w-4 h-4 animate-bounce" /> 
            Cross-lingual NLP · Dynamic LoRA Switching · XAI Ready
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold font-heading text-text leading-[1.1] mb-6 max-w-4xl tracking-tight">
            Dự đoán Nhóm thuốc với <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              XLM-RoBERTa & Multi-LoRA
            </span>
          </h1>
          <p className="text-xl text-text/75 mb-12 max-w-2xl leading-relaxed">
            Hệ thống hỗ trợ quyết định lâm sàng thế hệ mới. Áp dụng kiến trúc Dynamic Expert Switching với XLM-RoBERTa đa ngữ giúp phân loại bệnh án tiếng Việt chính xác, độ trễ tính bằng mili-giây, tích hợp bản đồ nhiệt giải thích XAI.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button 
              onClick={() => setView('dashboard')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary/90 hover:scale-105 transition-all shadow-xl shadow-primary/30"
            >
              <Activity className="w-6 h-6" />
              Trải nghiệm Dashboard
            </button>
            <a 
              href="#architecture" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-text bg-gray-50 font-semibold rounded-xl hover:bg-gray-100 hover:scale-105 transition-all border border-gray-200"
            >
              Tìm hiểu Kiến trúc
            </a>
          </div>
        </main>

        {/* Architecture Section */}
        <section id="architecture" className="bg-gray-50/50 py-24 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-text mb-4">Kiến trúc Dynamic Expert Switching</h2>
              <p className="text-text/75 max-w-2xl text-lg">Tận dụng sức mạnh đa ngữ của XLM-RoBERTa và tính chuyên biệt của nhiều LoRA Adapters khác nhau cho từng chuyên khoa.</p>
            </div>
            
            {/* Visual Workflow */}
            <div className="relative">
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-100 via-primary/30 to-green-100 -translate-y-1/2 z-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 text-text/70">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">1. Keyword Router</h3>
                  <p className="text-sm text-text/75">Sử dụng định tuyến chuyên khoa (Hô hấp, Tim mạch...) siêu tốc.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-lg shadow-primary/5 flex flex-col items-center text-center transform lg:-translate-y-4 hover:shadow-xl hover:scale-102 transition-all duration-300">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-4 text-white shadow-inner">
                    <Layers className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-primary">2. Multi-LoRA Loading</h3>
                  <p className="text-sm text-text/75">Nạp động (Dynamic Loading) Adapter .safetensors tương ứng vào XLM-RoBERTa Base Model đang chạy trên RAM.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 text-text/70">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">3. AI Inference</h3>
                  <p className="text-sm text-text/75">XLM-RoBERTa + LoRA thực hiện dự đoán phân loại đa nhãn với cơ chế attention đa ngữ, hỗ trợ tiếng Việt tự nhiên với độ trễ tối thiểu.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border-2 border-cta/20 shadow-lg shadow-cta/5 flex flex-col items-center text-center transform lg:-translate-y-4 hover:shadow-xl hover:scale-102 transition-all duration-300">
                  <div className="w-14 h-14 bg-cta rounded-full flex items-center justify-center mb-4 text-white shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-cta">4. XAI Explainability</h3>
                  <p className="text-sm text-text/75">Module giải thích phân tích hotspots đảm bảo tính minh bạch y khoa.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section id="techstack" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-text mb-4">Tech Stack Dự Án</h2>
              <p className="text-text/75 max-w-2xl text-lg">Thiết kế tối ưu hiệu năng và khả năng mở rộng.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition duration-300">
                <Cpu className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold font-heading mb-4">Core AI & ML</h3>
                <ul className="space-y-3 text-text/75">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> XLM-RoBERTa (Multilingual) + LoRA</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Hugging Face PEFT (LoRA)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> PyTorch Framework</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> LIME/SHAP explainability</li>
                </ul>
              </div>

              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition duration-300">
                <Server className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold font-heading mb-4">Backend Services</h3>
                <ul className="space-y-3 text-text/75">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> FastAPI (Async Python)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> PostgreSQL & SQLAlchemy</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Redis Caching</li>
                </ul>
              </div>

              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition duration-300">
                <Code2 className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold font-heading mb-4">Frontend UI</h3>
                <ul className="space-y-3 text-text/75">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> React.js + TypeScript</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Recharts (Data Viz)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Tailwind CSS v3</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="bg-text text-white py-12">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Stethoscope className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold font-heading">Drug-Pred AI</span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <p className="text-white/50 text-sm">© 2026 PJ-Medicine. Phục vụ mục đích Nghiên cứu.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // --- DASHBOARD LAYOUT ---
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Toaster position="top-right" />

      {/* Sidebar navigation */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col md:h-screen sticky top-0 shadow-lg shadow-gray-200/20 z-20">
        {/* Top brand */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('landing')}
              className="p-1.5 hover:bg-white border hover:border-gray-200 rounded-md transition text-text/75"
              title="Về Landing Page"
              aria-label="Về Landing Page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-bold font-heading text-primary text-lg flex items-center gap-2">
              <Microscope className="w-5 h-5" />
              Clinical CDSS
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-row md:flex-col gap-1 overflow-x-auto shrink-0">
          <button
            onClick={() => setSubView('predict')}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition font-semibold text-xs whitespace-nowrap shrink-0 w-auto md:w-full",
              subView === 'predict' ? "bg-primary/10 text-primary" : "text-text/60 hover:bg-gray-50 hover:text-text"
            )}
          >
            <Activity className="w-4 h-4" />
            Dự đoán Lâm sàng
          </button>
          
          <button
            onClick={() => setSubView('patients')}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition font-semibold text-xs whitespace-nowrap shrink-0 w-auto md:w-full",
              subView === 'patients' ? "bg-primary/10 text-primary" : "text-text/60 hover:bg-gray-50 hover:text-text"
            )}
          >
            <Users className="w-4 h-4" />
            Bệnh nhân
          </button>

          <button
            onClick={() => setSubView('history')}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition font-semibold text-xs whitespace-nowrap shrink-0 w-auto md:w-full",
              subView === 'history' ? "bg-primary/10 text-primary" : "text-text/60 hover:bg-gray-50 hover:text-text"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Lịch sử
          </button>

          <button
            onClick={() => setSubView('analytics')}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition font-semibold text-xs whitespace-nowrap shrink-0 w-auto md:w-full",
              subView === 'analytics' ? "bg-primary/10 text-primary" : "text-text/60 hover:bg-gray-50 hover:text-text"
            )}
          >
            <LineChart className="w-4 h-4" />
            Thống kê
          </button>
        </div>

        {/* Context-aware Sidebar Panel (Only for Predict view) */}
        {subView === 'predict' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 hidden md:flex">
            <div>
              <h3 className="text-xs font-bold text-text/75 uppercase tracking-wider mb-3">1. Routing Chuyên khoa</h3>
              <div className="flex flex-col gap-2">
                {specialties.map(spec => (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setActiveSpecialty(spec);
                      setText('');
                      setResults(null);
                      setXaiTokens([]);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all font-medium text-xs border border-transparent",
                      activeSpecialty.id === spec.id 
                        ? "bg-primary text-white shadow-md shadow-primary/20" 
                        : "text-text/75 hover:bg-gray-50 hover:text-text"
                    )}
                  >
                    {spec.icon}
                    {spec.name}
                    {activeSpecialty.id === spec.id && (
                      <span title="Đã nạp LoRA Adapter" className="ml-auto">
                        <GitBranch className="w-4 h-4 opacity-70" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            <div>
              <h3 className="text-xs font-bold text-text/75 uppercase tracking-wider mb-3">2. Bệnh án mẫu</h3>
              <div className="flex flex-col gap-3">
                {activeSpecialty.cases.map((c: { title: string; text: string; }, i: number) => (
                  <div 
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadCase(c.text)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadCase(c.text); }}
                    className="p-3 border border-gray-200 bg-white hover:border-primary hover:shadow-sm rounded-xl cursor-pointer transition"
                  >
                    <h4 className="text-xs font-bold text-text mb-1">{c.title}</h4>
                    <p className="text-[11px] text-text/70 line-clamp-3 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50 flex justify-center min-h-screen">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          
          {/* Header Bar with Mode Toggle & Patient Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <span className="text-xs text-text/50 font-bold uppercase tracking-wider">Hệ thống quyết định y khoa</span>
              <h2 className="text-2xl font-bold font-heading text-text">
                {subView === 'predict' && "Dự đoán Lâm sàng"}
                {subView === 'patients' && "Quản lý Bệnh nhân"}
                {subView === 'history' && "Lịch sử Phân tích"}
                {subView === 'analytics' && "Phân tích & Báo cáo"}
              </h2>
            </div>

            {/* Config & Toggles */}
            <div className="flex items-center gap-3">
              {/* Patient Badge in Predict View */}
              {subView === 'predict' && selectedPatient && (
                <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-xs font-bold text-primary rounded-xl flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  <span>BN: {selectedPatient.fullName}</span>
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="hover:text-red-500 font-bold ml-1"
                    title="Hủy chọn bệnh nhân"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Demo Mode Toggle */}
              <button 
                onClick={handleToggleDemoMode}
                className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
              >
                <span>Chế độ:</span>
                {appDemoMode ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Demo Mock
                  </span>
                ) : (
                  <span className="text-primary flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 animate-pulse" /> API Thật
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Render views dynamically */}
          {subView === 'predict' && (
            <div className="flex flex-col gap-6">
              {/* Alert prompt if no patient selected */}
              {!selectedPatient && (
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-xs text-amber-800 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Mẹo y khoa:</strong> Bạn chưa chọn bệnh nhân nào. Hãy sang tab <button onClick={() => setSubView('patients')} className="font-bold underline text-primary">Bệnh nhân</button> để chọn bệnh nhân hoặc tạo bệnh án lâm sàng trực tiếp để lưu trữ vào cơ sở dữ liệu.
                  </div>
                </div>
              )}

              {/* Clinical input container */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text">Dữ liệu Lâm sàng</span>
                  
                  {/* Edit vs Heatmap Toggle */}
                  {xaiTokens.length > 0 && (
                    <div className="flex border border-gray-200 rounded-xl overflow-hidden text-xs">
                      <button
                        onClick={() => setInputMode('edit')}
                        className={cn("px-3 py-1.5 font-bold transition", inputMode === 'edit' ? "bg-primary text-white" : "bg-white hover:bg-gray-50 text-text/75")}
                      >
                        Sửa bệnh án
                      </button>
                      <button
                        onClick={() => setInputMode('xai')}
                        className={cn("px-3 py-1.5 font-bold transition", inputMode === 'xai' ? "bg-slate-900 text-slate-100" : "bg-white hover:bg-gray-50 text-text/75")}
                      >
                        Hotspots XAI
                      </button>
                    </div>
                  )}
                </div>

                {inputMode === 'edit' ? (
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Nhập mô tả bệnh án, triệu chứng lâm sàng, sinh hiệu, hoặc kết quả cận lâm sàng (tối thiểu 10 ký tự)..."
                    aria-label="Mô tả bệnh án"
                    className="w-full h-56 p-5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 shadow-inner focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none text-base leading-relaxed"
                  />
                ) : (
                  renderInputHeatmap()
                )}

                {/* Submit Action */}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !text.trim()}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-text text-white font-bold rounded-2xl hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg min-w-[220px]"
                  >
                    {isLoading ? (
                      <>
                        <Activity className="w-5 h-5 animate-spin text-primary" />
                        Inference...
                      </>
                    ) : (
                      <>
                        Khởi chạy dự đoán
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Results Area */}
              {isLoading && <ShimmerSkeleton />}

              {results && !isLoading && (
                <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 animate-in fade-in slide-in-from-bottom-6 duration-500 flex flex-col gap-6">
                  {/* Results Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-cta flex items-center justify-center border border-emerald-100">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold font-heading text-text">Dự đoán Nhóm thuốc</h3>
                        <p className="text-xs text-text/50 mt-0.5">Top 3 nhóm thuốc có xác suất phù hợp cao nhất</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono font-bold text-text/60">
                        Active Model: XLM-RoBERTa
                      </div>
                    </div>
                  </div>

                  {/* List Results */}
                  <div className="flex flex-col gap-5">
                    {results.map((item, idx) => {
                      const percent = Math.round(item.confidence * 100);
                      const isHigh = percent >= 70;
                      const isMed = percent >= 40 && percent < 70;

                      return (
                        <div key={idx} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-text text-base">{item.drug_group_name}</span>
                            <span className={cn(
                              "font-extrabold text-lg",
                              isHigh ? "text-cta" : isMed ? "text-primary" : "text-text/50"
                            )}>{percent}%</span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-3.5 w-full bg-gray-50 border border-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                isHigh ? "bg-cta" : isMed ? "bg-primary" : "bg-gray-300"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Explainability Hotspot disclaimer */}
                  {xaiTokens.length > 0 && (
                    <div className="mt-4 p-4 bg-slate-900 rounded-2xl text-slate-100 text-xs flex flex-col gap-2 border border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Chỉ số giải thích Hotspots (LIME/SHAP):</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        Bạn có thể chuyển chế độ hiển thị <strong>Hotspots XAI</strong> trong khung nhập liệu ở trên để tô màu các từ có trọng số quyết định cao trong chẩn đoán.
                      </p>
                    </div>
                  )}

                  {/* Medical Disclaimer */}
                  <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-text/70 leading-relaxed">
                      <strong className="block text-text font-bold mb-0.5">Khước từ trách nhiệm lâm sàng:</strong>
                      Kết quả từ hệ thống hỗ trợ quyết định (CDSS) này chỉ đóng vai trò tham khảo trong nghiên cứu khoa học. Người hành nghề y phải tự kiểm chứng và chịu hoàn toàn trách nhiệm đối với quyết định điều trị lâm sàng.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {subView === 'patients' && (
            <React.Suspense fallback={<ShimmerSkeleton />}>
              <PatientSection onSelectPatientForPrediction={selectPatientForPrediction} />
            </React.Suspense>
          )}

          {subView === 'history' && (
            <React.Suspense fallback={<ShimmerSkeleton />}>
              <HistoryPage />
            </React.Suspense>
          )}

          {subView === 'analytics' && (
            <React.Suspense fallback={<ShimmerSkeleton />}>
              <AnalyticsDashboard />
            </React.Suspense>
          )}

        </div>
      </main>
    </div>
  );
}
