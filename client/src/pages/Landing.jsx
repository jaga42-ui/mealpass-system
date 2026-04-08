import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-stone-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* 🌅 Warm, Organic Ambient Lighting (No harsh neon) */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm animate-enter relative z-10 flex flex-col items-center">
        {/* 🌿 Welcoming Logo */}
        <div className="w-20 h-20 bg-stone-900 border border-stone-800 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
          <i className="ph-duotone ph-bowl-food text-5xl text-emerald-500"></i>
        </div>

        <h1 className="text-4xl font-black text-stone-100 tracking-tight mb-2">
          Aahaaram
        </h1>

        <p className="text-sm font-medium text-stone-400 mb-10 text-center max-w-[250px] leading-relaxed">
          Seamless meal distribution and community event logistics.
        </p>

        {/* 🎟️ Primary Action: Attendees */}
        <div className="w-full mb-6">
          <button
            onClick={() => navigate("/pass")}
            className="w-full py-4 bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-[0_10px_30px_rgba(5,150,105,0.2)] hover:bg-emerald-500 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <i className="ph-bold ph-qr-code text-lg"></i>
            Access My Pass
          </button>
        </div>

        {/* 📋 Secondary Actions: Staff & Organization */}
        <div className="w-full bg-stone-900/50 backdrop-blur-md border border-stone-800/50 rounded-3xl p-2 flex flex-col gap-2">
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-4 bg-stone-900 text-stone-300 font-semibold text-sm rounded-2xl border border-stone-800 hover:bg-stone-800 hover:text-white active:scale-95 transition-all duration-300 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <i className="ph-duotone ph-user-circle text-xl text-stone-500 group-hover:text-emerald-400 transition-colors"></i>
              Staff Login
            </div>
            <i className="ph-bold ph-caret-right text-stone-600 group-hover:text-stone-400 transition-colors"></i>
          </button>

          <button
            onClick={() => navigate("/signup")}
            className="w-full py-3.5 px-4 bg-transparent text-stone-400 font-semibold text-sm rounded-2xl hover:bg-stone-800/50 hover:text-stone-200 active:scale-95 transition-all duration-300 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <i className="ph-duotone ph-buildings text-xl text-stone-500 group-hover:text-amber-400 transition-colors"></i>
              Register Organization
            </div>
            <i className="ph-bold ph-caret-right text-stone-600 group-hover:text-stone-400 transition-colors"></i>
          </button>
        </div>

        <div className="mt-10 flex items-center gap-2 text-stone-600 text-xs font-medium">
          <i className="ph-fill ph-leaf text-emerald-600/50"></i>
          <span>Built for community scale</span>
        </div>
      </div>
    </div>
  );
};

export default Landing;
