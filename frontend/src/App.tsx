import { useState } from 'react';
import { 
  Activity, Stethoscope, CheckCircle2, 
  AlertCircle, BrainCircuit, FileText, Wind, HeartPulse, 
  Brain, Microscope, ChevronLeft, 
  ArrowRight, Server, Layers, Cpu, Code2, LineChart, ShieldCheck,
  Zap, GitBranch, Menu, X
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
const analyzeText = async (_text: string, specialtyId: string) => {
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

      <div className="mt-8 border-t border-gray-100 pt-6 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-10 bg-slate-200 rounded w-full" />
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | '404' | 'error'>('landing');
  const [activeSpecialty, setActiveSpecialty] = useState(SPECIALTIES[0]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // --- 404 VIEW ---
  if (view === '404') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
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
        <div className="p-4 bg-white rounded-full shadow-lg mb-6 border border-gray-100">
          <Activity className="w-16 h-16 text-red-500 animate-pulse" />
        </div>
        <h1 className="text-4xl font-extrabold font-heading text-text mb-4">Đã xảy ra sự cố</h1>
        <p className="text-text/75 mb-8 max-w-md">Hệ thống hỗ trợ quyết định lâm sàng (CDSS) gặp lỗi kết nối server hoặc lỗi tải mô hình Mamba-3.</p>
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
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div 
              role="button"
              tabIndex={0}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              aria-label="Drug-Pred AI logo, cuộn lên đầu trang"
            >
              <div className="p-1.5 bg-primary rounded-md text-white shadow-sm shadow-primary/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-heading text-primary tracking-tight">Drug-Pred AI</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#overview" className="text-text/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">Tổng quan</a>
              <a href="#architecture" className="text-text/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">Dynamic Expert Switching</a>
              <a href="#techstack" className="text-text/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">Công nghệ</a>
              <button 
                onClick={() => setView('dashboard')}
                className="px-6 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 hover:scale-105 transition-all shadow-md shadow-primary/20 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Mở ứng dụng Dashboard lâm sàng"
              >
                Mở Clinical Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Menu Icon */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-text hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              aria-label="Mở thanh điều hướng di động"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation Drawer */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-b border-gray-100 bg-white/95 backdrop-blur-md px-6 py-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
              <a 
                href="#overview" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-text/75 hover:text-primary font-medium transition py-1"
              >
                Tổng quan
              </a>
              <a 
                href="#architecture" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-text/75 hover:text-primary font-medium transition py-1"
              >
                Dynamic Expert Switching
              </a>
              <a 
                href="#techstack" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-text/75 hover:text-primary font-medium transition py-1"
              >
                Công nghệ
              </a>
              <button 
                onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                className="w-full text-center px-6 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition shadow-md shadow-primary/20 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Khởi động Clinical Dashboard"
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
            Zero-latency Switching & Sub-quadratic Complexity
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold font-heading text-text leading-[1.1] mb-6 max-w-4xl tracking-tight">
            Dự đoán Nhóm thuốc với <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Mamba-3 & Multi-LoRA
            </span>
          </h1>
          <p className="text-xl text-text/75 mb-12 max-w-2xl leading-relaxed">
            Hệ thống hỗ trợ quyết định lâm sàng thế hệ mới. Áp dụng kiến trúc Dynamic Expert Switching giúp phân loại bệnh án tiếng Việt với độ trễ tính bằng mili-giây, vượt trội hơn mô hình Transformer truyền thống.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button 
              onClick={() => setView('dashboard')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary/90 hover:scale-105 transition-all shadow-xl shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Bắt đầu sử dụng Dashboard"
            >
              <Activity className="w-6 h-6" />
              Trải nghiệm Dashboard
            </button>
            <a 
              href="#architecture" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-text bg-gray-50 font-semibold rounded-xl hover:bg-gray-100 hover:scale-105 transition-all border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              <p className="text-text/75 max-w-2xl text-lg">Tận dụng tốc độ của State Space Model (Mamba-3) và tính chuyên biệt của nhiều LoRA Adapters khác nhau cho từng chuyên khoa.</p>
            </div>
            
            {/* Visual Workflow */}
            <div className="relative">
              {/* Connecting Line */}
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-100 via-primary/30 to-green-100 -translate-y-1/2 z-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {/* Step 1 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 text-text/70">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">1. Keyword Router</h3>
                  <p className="text-sm text-text/75">Sử dụng regex/keyword matching để định tuyến nhánh chuyên khoa (Hô hấp, Tim mạch...) siêu tốc.</p>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-lg shadow-primary/5 flex flex-col items-center text-center transform lg:-translate-y-4 hover:shadow-xl hover:scale-102 transition-all duration-300">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-4 text-white shadow-inner">
                    <Layers className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-primary">2. Multi-LoRA Loading</h3>
                  <p className="text-sm text-text/75">Nạp động (Dynamic Loading) Adapter .safetensors tương ứng vào Mamba-3 Base Model đang chạy trên RAM.</p>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 text-text/70">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">3. AI Inference</h3>
                  <p className="text-sm text-text/75">Mamba-3 thực hiện dự đoán phân loại đa nhãn (Multi-label) với độ phức tạp tuyến tính O(N).</p>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-6 rounded-2xl border-2 border-cta/20 shadow-lg shadow-cta/5 flex flex-col items-center text-center transform lg:-translate-y-4 hover:shadow-xl hover:scale-102 transition-all duration-300">
                  <div className="w-14 h-14 bg-cta rounded-full flex items-center justify-center mb-4 text-white shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-cta">4. XAI Explainability</h3>
                  <p className="text-sm text-text/75">Module SHAP/LIME phân tích "hot-spots" đảm bảo tính minh bạch, trả về lý do ra quyết định y khoa.</p>
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
              <p className="text-text/75 max-w-2xl text-lg">Được thiết kế đề cao hiệu năng xử lý (High Performance) và khả năng mở rộng kiến thức y khoa (Isolation).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Core AI */}
              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <Cpu className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold font-heading mb-4">Core AI & ML</h3>
                <ul className="space-y-3 text-text/75">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Mamba-3 Architecture</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Hugging Face PEFT (LoRA)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> PyTorch Framework</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> VnCoreNLP / Underthesea</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> LIME/SHAP (XAI)</li>
                </ul>
              </div>

              {/* Backend */}
              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <Server className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold font-heading mb-4">Backend Services</h3>
                <ul className="space-y-3 text-text/75">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> FastAPI (Async API)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Uvicorn ASGI Server</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> PostgreSQL 16</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> SQLAlchemy ORM</li>
                </ul>
              </div>

              {/* Frontend */}
              <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <Code2 className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold font-heading mb-4">Frontend & UI</h3>
                <ul className="space-y-3 text-text/75">
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
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="flex gap-4 text-sm text-white/50">
                <button onClick={() => setView('404')} className="hover:text-white transition-colors">Demo 404</button>
                <span>|</span>
                <button onClick={() => setView('error')} className="hover:text-white transition-colors">Demo Error</button>
              </div>
              <p className="text-white/50 text-sm">© 2026 PJ-Medicine. Phục vụ mục đích Nghiên cứu.</p>
            </div>
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
            className="p-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-md transition text-text/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Quay lại Landing Page"
            aria-label="Quay lại trang chủ"
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
            <h3 className="text-xs font-bold text-text/75 uppercase tracking-wider mb-3">1. Routing Chuyên khoa</h3>
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
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    activeSpecialty.id === spec.id 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "text-text/75 hover:bg-gray-50 hover:text-text border border-transparent"
                  )}
                  aria-label={`Chọn chuyên khoa ${spec.name}`}
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
            <p className="text-[10px] text-text/75 mt-2 px-1">* Hệ thống tự động nạp LoRA Adapter tương ứng khi chọn.</p>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          <div>
            <h3 className="text-xs font-bold text-text/75 uppercase tracking-wider mb-3">2. Nạp Bệnh án mẫu</h3>
            <div className="flex flex-col gap-3">
              {activeSpecialty.cases.map((c, i) => (
                <div 
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadCase(c.text)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      loadCase(c.text);
                    }
                  }}
                  aria-label={`Nạp bệnh án mẫu: ${c.title}`}
                  className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer transition-all group"
                >
                  <h4 className="text-sm font-bold text-text mb-1.5 group-hover:text-primary transition">{c.title}</h4>
                  <p className="text-xs text-text/75 line-clamp-3 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo View Toggles in Sidebar */}
        <div className="p-4 border-t border-gray-100 flex justify-between text-xs text-text/75 bg-gray-50/50">
          <button onClick={() => setView('404')} className="hover:text-primary transition-colors font-medium">Demo 404</button>
          <button onClick={() => setView('error')} className="hover:text-primary transition-colors font-medium">Demo Error</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto flex justify-center relative z-10">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <header className="mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-text/75 mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Adapter Active: LoRA_{activeSpecialty.id.toUpperCase()}_v1.2
            </div>
            <h2 className="text-3xl font-bold font-heading text-text">Dữ liệu Lâm sàng</h2>
          </header>

          <div className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập mô tả bệnh án, triệu chứng lâm sàng, sinh hiệu, hoặc kết quả cận lâm sàng..."
              aria-label="Mô tả bệnh án hoặc triệu chứng lâm sàng"
              className="w-full h-56 p-5 rounded-2xl border-2 border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 resize-none text-base leading-relaxed"
            />
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !text.trim()}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-text text-white font-semibold rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg min-w-[220px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Gửi yêu cầu phân tích bệnh án"
            >
              {isLoading ? (
                <>
                  <Activity className="w-5 h-5 animate-spin text-primary" />
                  Mamba-3 Đang Inference...
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
          {isLoading && <ShimmerSkeleton />}

          {results && !isLoading && (
            <div className="mt-6 p-8 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-5 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-cta flex items-center justify-center border border-green-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-heading text-text">Kết quả Dự đoán Nhóm thuốc</h2>
                    <p className="text-sm text-text/75 mt-0.5">Top 3 nhóm thuốc dựa trên phân tích Multi-label</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="px-3 py-1 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono font-medium text-text/75">
                    Model: mamba-3-base
                  </div>
                  <div className="px-3 py-1 bg-blue-50/50 rounded-md border border-blue-100 text-xs font-mono font-medium text-primary">
                    Latency: ~0.14s (O(N))
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
                          isHighConf ? "text-cta" : isMedConf ? "text-primary" : "text-text/75"
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

              {/* Explainability Section */}
              <div className="mt-8 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <LineChart className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm text-text">XAI Analysis (LIME/SHAP hotspots)</span>
                </div>
                <div className="text-sm text-text/80 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-text/75 mr-2">Từ khóa ảnh hưởng:</span>
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
