import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-stone-950 flex flex-col items-center font-sans relative overflow-x-hidden overflow-y-auto py-12 px-4">
      
      {/* 🌅 Warm, Organic Ambient Lighting */}
      <div className="absolute top-[-5%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md animate-enter relative z-10 flex flex-col items-center mt-6 sm:mt-12">
        
        {/* 🌿 Welcoming Logo */}
        <div className="w-20 h-20 bg-stone-900 border border-stone-800 rounded-3xl flex items-center justify-center shadow-2xl mb-6">
          <i className="ph-duotone ph-bowl-food text-5xl text-emerald-500"></i>
        </div>

        {/* 🖋️ Tagline & Header */}
        <h1 className="text-4xl font-black text-stone-100 tracking-tight mb-2">
          Aahaaram
        </h1>
        <h2 className="text-emerald-500 font-bold uppercase tracking-[0.2em] text-[9px] mb-6 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          Dignity in Logistics
        </h2>

        <p className="text-sm font-medium text-stone-400 mb-10 text-center leading-relaxed px-2">
          A decentralized, zero-friction operating system for community kitchens, disaster relief, and large-scale meal distribution.
        </p>

        {/* 🚪 Auth Actions */}
        <div className="w-full flex flex-col gap-3 mb-16">
          <button
            onClick={() => navigate("/login")}
            className="w-full py-4 bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-[0_10px_30px_rgba(5,150,105,0.2)] hover:bg-emerald-500 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <i className="ph-bold ph-sign-in text-lg"></i>
            Sign In
          </button>

          <button
            onClick={() => navigate("/login", { state: { isSignup: true } })}
            className="w-full py-4 bg-stone-900 text-stone-300 font-bold text-sm rounded-2xl border border-stone-800 hover:bg-stone-800 hover:text-white active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <i className="ph-bold ph-user-plus text-lg"></i>
            Sign Up
          </button>
        </div>

        {/* 📦 Use Cases / Feature Grid */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 bg-stone-800/50"></div>
            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Platform Capabilities</span>
            <div className="h-px flex-1 bg-stone-800/50"></div>
          </div>

          {/* Feature 1 */}
          <div className="bg-stone-900/40 backdrop-blur-md border border-stone-800/50 p-5 rounded-3xl flex items-start gap-4">
            <div className="w-12 h-12 rounded-[1rem] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <i className="ph-duotone ph-shield-check text-2xl"></i>
            </div>
            <div>
              <h4 className="text-stone-200 font-bold text-xs mb-1.5 tracking-wide">Cryptographic Badging</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Stateless HMAC-SHA256 signatures ensure printed meal passes cannot be counterfeited or duplicated by bad actors.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-stone-900/40 backdrop-blur-md border border-stone-800/50 p-5 rounded-3xl flex items-start gap-4">
            <div className="w-12 h-12 rounded-[1rem] bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <i className="ph-duotone ph-lightning text-2xl"></i>
            </div>
            <div>
              <h4 className="text-stone-200 font-bold text-xs mb-1.5 tracking-wide">Zero-Friction Scans</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Sub-second camera processing built for fast-paced crowds. Verify attendees instantly without bottlenecking the line.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-stone-900/40 backdrop-blur-md border border-stone-800/50 p-5 rounded-3xl flex items-start gap-4">
            <div className="w-12 h-12 rounded-[1rem] bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <i className="ph-duotone ph-chart-polar text-2xl"></i>
            </div>
            <div>
              <h4 className="text-stone-200 font-bold text-xs mb-1.5 tracking-wide">Live Audit Ledger</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Generate instant end-of-day PDFs and track real-time fulfillment stats securely across multiple volunteer terminals.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 mb-8 flex items-center gap-2 text-stone-600/50 text-[10px] font-bold uppercase tracking-widest">
          <i className="ph-fill ph-cpu text-sm"></i>
          <span>Aahaaram OS • Core Engine</span>
        </div>
        
      </div>
    </div>
  );
};

export default Landing;