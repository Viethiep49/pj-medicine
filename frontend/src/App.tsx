import { useState } from 'react';
import { 
  Activity, Stethoscope, ChevronRight, CheckCircle2, 
  AlertCircle, BrainCircuit, FileText, Wind, HeartPulse, 
  Brain, Microscope, ChevronLeft, Database,
  ArrowRight, Server, Layers, Cpu, Code2, LineChart, ShieldCheck,
  Zap, GitBranch
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock Data
const SPECIALTIES = [
  {
    id: 'respiratory',
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
    id: 'cardiology',
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
    id: 'neurology',
    name: 'Khoa Thần Kinh',
    icon: <Brain className="w-5 h-5" />,
    cases: [
      {
        title: 'Đau nửa đầu Migraine',
        text: 'Bệnh nhân nữ 28 tuổi, đau nửa đầu phải theo nhịp mạch đập, buồn nôn, sợ ánh sáng và tiếng ồn. Cơn đau kéo dài 4-6 tiếng, xuất hiện 2 lần/tháng. Không có dấu hiệu thần kinh khu trú.'
      }
    ]
  }
];

// Mock API Call
const analyzeText = async (text: string, specialtyId: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (specialtyId === 'respiratory') {
        resolve([
          { group: "Kháng sinh - Beta-lactam/Macrolide", confidence: 0.89 },
          { group: "Thuốc giãn phế quản", confidence: 0.45 },
          { group: "Thuốc long đờm", confidence: 0.65 }
        ]);
      } else if (specialtyId === 'cardiology') {
        resolve([
          { group: "Thuốc ức chế men chuyển (ACEi)", confidence: 0.92 },
          { group: "Thuốc chẹn kênh Canxi", confidence: 0.75 },
          { group: "Thuốc lợi tiểu Thiazide", confidence: 0.35 }
        ]);
      } else {
        resolve([
          { group: "Thuốc giảm đau đặc hiệu", confidence: 0.85 },
          { group: "Thuốc chống viêm NSAID", confidence: 0.55 },
          { group: "Thuốc an thần nhẹ", confidence: 0.20 }
        ]);
      }
    }, 1500);
  });
};

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [activeSpecialty, setActiveSpecialty] = useState(SPECIALTIES[0]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setResults(null);
    const data = await analyzeText(text, activeSpecialty.id);
    setResults(data as any[]);
    setIsLoading(false);
  };

  const loadCase = (caseText: string) => {
    setText(caseText);
    setResults(null);
  };

  // --- LANDING PAGE VIEW ---
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
              <div className="p-1.5 bg-primary rounded-md text-white shadow-sm shadow-primary/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-heading text-primary tracking-tight">Drug-Pred AI</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#overview" className="text-text/70 hover:text-primary transition">Tổng quan</a>
              <a href="#architecture" className="text-text/70 hover:text-primary transition">Dynamic Expert Switching</a>
              <a href="#techstack" className="text-text/70 hover:text-primary transition">Công nghệ</a>
              <button 
                onClick={() => setView('dashboard')}
                className="px-6 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition shadow-md shadow-primary/20 flex items-center gap-2"
              >
                Mở Clinical Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center" id="overview">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-primary text-sm font-semibold mb-8 border border-blue-100/50">
            <Zap className="w-4 h-4" />
            Cross-lingual NLP · Dynamic LoRA Switching · XAI Ready
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold font-heading text-text leading-[1.1] mb-6 max-w-4xl tracking-tight">
            Dự đoán Nhóm thuốc với <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              XLM-RoBERTa + Multi-LoRA
            </span>
          </h1>
          <p className="text-xl text-text/60 mb-12 max-w-2xl leading-relaxed">
            Hệ thống hỗ trợ quyết định lâm sàng thế hệ mới. Áp dụng kiến trúc Dynamic Expert Switching với XLM-RoBERTa đa ngữ giúp phân loại bệnh án tiếng Việt chính xác, không cần dịch thuật.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button 
              onClick={() => setView('dashboard')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary/90 transition shadow-xl shadow-primary/30"
            >
              <Activity className="w-6 h-6" />
              Trải nghiệm Dashboard
            </button>
            <a href="#architecture" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-text bg-gray-50 font-semibold rounded-xl hover:bg-gray-100 transition border border-gray-200">
              Tìm hiểu Kiến trúc
            </a>
          </div>
        </main>

        {/* Architecture Section */}
        <section id="architecture" className="bg-gray-50/50 py-24 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-text mb-4">Kiến trúc Dynamic Expert Switching</h2>
              <p className="text-text/60 max-w-2xl text-lg">Tận dụng sức mạnh đa ngữ của XLM-RoBERTa và tính chuyên biệt của nhiều LoRA Adapters khác nhau cho từng chuyên khoa.</p>
            </div>
            
            {/* Visual Workflow */}
            <div className="relative">
              {/* Connecting Line */}
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-100 via-primary/30 to-green-100 -translate-y-1/2 z-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {/* Step 1 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 text-text/70">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">1. Keyword Router</h3>
                  <p className="text-sm text-text/60">Sử dụng regex/keyword matching để định tuyến nhánh chuyên khoa (Hô hấp, Tim mạch...) siêu tốc.</p>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-lg shadow-primary/5 flex flex-col items-center text-center transform lg:-translate-y-4">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-4 text-white shadow-inner">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-primary">2. Multi-LoRA Loading</h3>
                  <p className="text-sm text-text/60">Nạp động (Dynamic Loading) Adapter .safetensors tương ứng vào XLM-RoBERTa Base Model đang chạy trên RAM.</p>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 text-text/70">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">3. AI Inference</h3>
                  <p className="text-sm text-text/60">XLM-RoBERTa + LoRA thực hiện dự đoán phân loại nhóm thuốc với cơ chế attention đa ngữ, hỗ trợ tiếng Việt tự nhiên.</p>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-6 rounded-2xl border-2 border-cta/20 shadow-lg shadow-cta/5 flex flex-col items-center text-center transform lg:-translate-y-4">
                  <div className="w-14 h-14 bg-cta rounded-full flex items-center justify-center mb-4 text-white shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-cta">4. XAI Explainability</h3>
                  <p className="text-sm text-text/60">Module SHAP/LIME phân tích "hot-spots" đảm bảo tính minh bạch, trả về lý do ra quyết định y khoa.</p>
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
              <p className="text-text/60 max-w-2xl text-lg">Được thiết kế đề cao hiệu năng xử lý (High Performance) và khả năng mở rộng kiến thức y khoa (Isolation).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Core AI */}
              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition group">
                <Cpu className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold font-heading mb-4">Core AI & ML</h3>
                <ul className="space-y-3 text-text/70">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> XLM-RoBERTa (Multilingual)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Hugging Face PEFT (LoRA)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> PyTorch Framework</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> VnCoreNLP / Underthesea</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> LIME/SHAP (XAI)</li>
                </ul>
              </div>

              {/* Backend */}
              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition group">
                <Server className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold font-heading mb-4">Backend Services</h3>
                <ul className="space-y-3 text-text/70">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> FastAPI (Async API)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Uvicorn ASGI Server</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> PostgreSQL 16</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> SQLAlchemy ORM</li>
                </ul>
              </div>

              {/* Frontend */}
              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition group">
                <Code2 className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold font-heading mb-4">Frontend & UI</h3>
                <ul className="space-y-3 text-text/70">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> React.js + TypeScript</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Vite Bundler</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Tailwind CSS v3</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Lucide Icons</li>
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
            <p className="text-white/50 text-sm">© 2026 PJ-Medicine. Phục vụ mục đích Nghiên cứu.</p>
          </div>
        </footer>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Specialty Selection */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shadow-lg shadow-gray-200/20 z-20">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <button 
            onClick={() => setView('landing')}
            className="p-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-md transition text-text/60"
            title="Quay lại Landing Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="font-bold font-heading text-primary text-lg flex items-center gap-2">
            <Microscope className="w-5 h-5" />
            Clinical CDSS
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-bold text-text/40 uppercase tracking-wider mb-3">1. Routing Chuyên khoa</h3>
            <div className="flex flex-col gap-2">
              {SPECIALTIES.map(spec => (
                <button
                  key={spec.id}
                  onClick={() => {
                    setActiveSpecialty(spec);
                    setText('');
                    setResults(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all font-medium text-sm",
                    activeSpecialty.id === spec.id 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "text-text/70 hover:bg-gray-50 hover:text-text border border-transparent"
                  )}
                >
                  {spec.icon}
                  {spec.name}
                  {activeSpecialty.id === spec.id && <GitBranch className="w-4 h-4 ml-auto opacity-70" title="Đã nạp LoRA Adapter" />}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text/40 mt-2 px-1">* Hệ thống tự động nạp LoRA Adapter tương ứng khi chọn.</p>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          <div>
            <h3 className="text-xs font-bold text-text/40 uppercase tracking-wider mb-3">2. Nạp Bệnh án mẫu</h3>
            <div className="flex flex-col gap-3">
              {activeSpecialty.cases.map((c, i) => (
                <div 
                  key={i}
                  onClick={() => loadCase(c.text)}
                  className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-primary hover:shadow-md cursor-pointer transition-all group"
                >
                  <h4 className="text-sm font-bold text-text mb-1.5 group-hover:text-primary transition">{c.title}</h4>
                  <p className="text-xs text-text/60 line-clamp-3 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto flex justify-center relative z-10">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <header className="mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-text/60 mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              XLM-RoBERTa · LoRA_{activeSpecialty.id.toUpperCase()}_v1.0
            </div>
            <h2 className="text-3xl font-bold font-heading text-text">Dữ liệu Lâm sàng</h2>
          </header>

          <div className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập mô tả bệnh án, triệu chứng lâm sàng, sinh hiệu, hoặc kết quả cận lâm sàng..."
              className="w-full h-56 p-5 rounded-2xl border-2 border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 resize-none text-base leading-relaxed"
            />
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !text.trim()}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-text text-white font-semibold rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg min-w-[220px]"
            >
              {isLoading ? (
                <>
                  <Activity className="w-5 h-5 animate-pulse text-primary" />
                  XLM-RoBERTa Đang Inference...
                </>
              ) : (
                <>
                  Khởi chạy Dự đoán
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          {results && (
            <div className="mt-6 p-8 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-5 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-cta flex items-center justify-center border border-green-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-heading text-text">Kết quả Dự đoán Nhóm thuốc</h2>
                    <p className="text-sm text-text/60 mt-0.5">Top 3 nhóm thuốc dựa trên phân tích Multi-label</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="px-3 py-1 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono font-medium text-text/70">
                    Model: xlm-roberta-base + LoRA
                  </div>
                  <div className="px-3 py-1 bg-blue-50/50 rounded-md border border-blue-100 text-xs font-mono font-medium text-primary">
                    Framework: PyTorch + PEFT
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-6">
                {results.map((item, index) => {
                  const percent = Math.round(item.confidence * 100);
                  const isHighConf = percent >= 70;
                  const isMedConf = percent >= 40 && percent < 70;
                  
                  return (
                    <div key={index} className="flex flex-col gap-2">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-text text-lg">{item.group}</span>
                        <span className={cn(
                          "font-extrabold text-2xl",
                          isHighConf ? "text-cta" : isMedConf ? "text-primary" : "text-text/50"
                        )}>
                          {percent}%
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-4 w-full bg-gray-50 border border-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000 ease-out",
                            isHighConf ? "bg-cta" : isMedConf ? "bg-primary" : "bg-gray-300"
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Explainability Dummy Section */}
              <div className="mt-8 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <LineChart className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm text-text">XAI Analysis (LIME/SHAP hotspots)</span>
                </div>
                <div className="text-sm text-text/80 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-text/50 mr-2">Từ khóa ảnh hưởng:</span>
                  <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded mr-2 font-medium">sốt cao</span>
                  <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded mr-2 font-medium">ho có đờm</span>
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">khó thở</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50/50 rounded-xl flex items-start gap-3 border border-blue-100">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-text/80 leading-relaxed">
                  <span className="font-bold block mb-1">Cảnh báo Y khoa (CDSS Disclaimer):</span>
                  Các gợi ý trên được trích xuất tự động từ văn bản bệnh án. Kết quả mang tính chất tham khảo cho công tác nghiên cứu khoa học, không thay thế phác đồ điều trị và tư vấn của bác sĩ chuyên môn.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
