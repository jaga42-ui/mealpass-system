import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api/axios";

const Scanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const scannerRef = useRef(null);

  const startScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      scannerRef.current = new Html5Qrcode("reader");
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } }, // Forces a square scan box internally
        onScanSuccess,
        () => {},
      );
    } catch (err) {
      console.error("Camera Start Error:", err);
    }
  };

  const onScanSuccess = async (decodedText) => {
    if (scannerRef.current) scannerRef.current.pause(true); // Pause the camera feed, don't just stop scanning
    try {
      const response = await api.post("/scans/verify", {
        qrId: decodedText.trim(),
        mealType: "Lunch",
      });
      setScanResult({
        type: "success",
        title: "ACCESS GRANTED",
        message: response.data.message,
        participant: response.data.participant,
      });
    } catch (error) {
      setScanResult({
        type: "error",
        title: "ACCESS DENIED",
        message: error.response?.data?.message || "Invalid Token",
        participant: error.response?.data?.participant,
      });
    }
  };

  const closeResult = () => {
    setScanResult(null);
    if (scannerRef.current && isScanning) scannerRef.current.resume();
  };

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col relative z-20 pb-20">
      {/* 🚀 INJECTED CRAZY ANIMATIONS */}
      <style>{`
                @keyframes scan-laser {
                    0% { top: 0%; opacity: 0; box-shadow: 0 0 0px rgba(20,184,166,0); }
                    10% { opacity: 1; box-shadow: 0 0 20px rgba(20,184,166,0.8); }
                    50% { top: 100%; opacity: 1; box-shadow: 0 0 20px rgba(20,184,166,0.8); }
                    90% { opacity: 1; box-shadow: 0 0 20px rgba(20,184,166,0.8); }
                    100% { top: 0%; opacity: 0; box-shadow: 0 0 0px rgba(20,184,166,0); }
                }
                .laser-beam {
                    animation: scan-laser 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                
                @keyframes breathe {
                    0%, 100% { transform: scale(1); opacity: 0.8; border-color: rgba(20,184,166,0.5); }
                    50% { transform: scale(1.05); opacity: 1; border-color: rgba(20,184,166,1); }
                }
                .reticle-breathe {
                    animation: breathe 3s ease-in-out infinite;
                }

                @keyframes glitch-shake {
                    0% { transform: translate(0) }
                    20% { transform: translate(-3px, 3px) }
                    40% { transform: translate(-3px, -3px) }
                    60% { transform: translate(3px, 3px) }
                    80% { transform: translate(3px, -3px) }
                    100% { transform: translate(0) }
                }
                .glitch-effect {
                    animation: glitch-shake 0.3s cubic-bezier(.25,.8,.25,1) both;
                }

                @keyframes hologram-slide {
                    0% { transform: translateY(20px) scale(0.95); opacity: 0; filter: blur(10px); }
                    100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0px); }
                }
                .hologram-item {
                    animation: hologram-slide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0; /* Starts hidden until animation plays */
                }

                /* Hide the ugly default HTML5-QRCode styling */
                #reader img { display: none !important; }
                #reader { border: none !important; }
            `}</style>

      <div className="text-center pt-6 pb-4">
        <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase">
          Security Uplink
        </h2>
        <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest mt-1 animate-pulse">
          Awaiting Token
        </p>
      </div>

      {/* 🛡️ THE CYBER-SCANNER VIEWPORT */}
      <div className="relative w-[90%] mx-auto aspect-[4/5] bg-black/50 backdrop-blur-sm rounded-[2.5rem] mt-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden border border-white/5 flex-shrink-0">
        {/* The actual camera feed */}
        <div
          id="reader"
          className="w-full h-full object-cover absolute inset-0 z-0 scale-105"
        ></div>

        {/* THE OVERLAY UI (Only shows when scanning) */}
        {isScanning && !scanResult && (
          <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
            {/* Radar Ping Effect in Background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border border-teal-500/20 rounded-full animate-ping duration-[3000ms]"></div>
              <div className="absolute w-64 h-64 border border-teal-500/10 rounded-full animate-ping duration-[4000ms]"></div>
            </div>

            {/* Animated Targeting Reticles */}
            <div className="absolute inset-6 reticle-breathe">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-teal-500 rounded-tl-2xl shadow-[0_0_15px_rgba(20,184,166,0.5)]"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-teal-500 rounded-tr-2xl shadow-[0_0_15px_rgba(20,184,166,0.5)]"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-teal-500 rounded-bl-2xl shadow-[0_0_15px_rgba(20,184,166,0.5)]"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-teal-500 rounded-br-2xl shadow-[0_0_15px_rgba(20,184,166,0.5)]"></div>
            </div>

            {/* Sweeping Laser Beam */}
            <div className="absolute left-6 right-6 h-[2px] bg-teal-400 laser-beam shadow-[0_0_20px_#2dd4bf] z-20"></div>

            <div className="absolute bottom-8 left-0 right-0 text-center">
              <span className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-teal-400 border border-teal-500/30">
                Align Badge in Frame
              </span>
            </div>
          </div>
        )}

        {/* START BUTTON (Shows when camera is off) */}
        {!isScanning && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="w-24 h-24 bg-teal-500/10 rounded-full flex items-center justify-center mb-6 border border-teal-500/30 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
              <i className="ph-duotone ph-scan text-5xl text-teal-400"></i>
            </div>
            <button
              onClick={startScanner}
              className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(20,184,166,0.4)] active:scale-95 transition-all"
            >
              Activate Optics
            </button>
          </div>
        )}
      </div>

      {/* 💎 THE HOLOGRAPHIC RESULT OVERLAY */}
      {scanResult && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end p-4 animate-enter bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md mx-auto rounded-[2.5rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden ${scanResult.type === "success" ? "bg-slate-900 border border-emerald-500/50" : "bg-rose-950/90 border border-rose-500/50 glitch-effect"}`}
          >
            {/* Background Ambient Glow */}
            <div
              className={`absolute -top-20 -left-20 w-40 h-40 blur-[80px] rounded-full pointer-events-none ${scanResult.type === "success" ? "bg-emerald-500/30" : "bg-rose-500/30"}`}
            ></div>

            <div className="relative z-10">
              {/* Icon & Title */}
              <div
                className="flex items-center gap-4 mb-6 hologram-item"
                style={{ animationDelay: "0ms" }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${scanResult.type === "success" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"}`}
                >
                  <i
                    className={`ph-fill text-2xl ${scanResult.type === "success" ? "ph-shield-check" : "ph-shield-warning"}`}
                  ></i>
                </div>
                <div>
                  <h2
                    className={`text-xl font-black tracking-[0.1em] ${scanResult.type === "success" ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {scanResult.title}
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    {scanResult.message}
                  </p>
                </div>
              </div>

              {/* Main Identity Box */}
              <div
                className="bg-black/50 border border-white/5 rounded-[1.5rem] p-5 mb-5 hologram-item"
                style={{ animationDelay: "100ms" }}
              >
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">
                  Identified Entity
                </span>
                <p className="text-white text-2xl font-black tracking-tight truncate">
                  {scanResult.participant?.name || "UNKNOWN_ID"}
                </p>
                {scanResult.participant?.category && (
                  <span className="inline-block mt-2 px-3 py-1 bg-white/10 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-300">
                    CLASS: {scanResult.participant.category}
                  </span>
                )}
              </div>

              {/* 🚀 DYNAMIC EXCEL METADATA HOLOGRAPHIC GRID */}
              {scanResult.participant?.metadata &&
                Object.keys(scanResult.participant.metadata).length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {Object.entries(scanResult.participant.metadata).map(
                      ([key, value], index) => (
                        <div
                          key={key}
                          className="bg-slate-800/50 border border-white/5 p-3.5 rounded-xl hologram-item flex flex-col justify-center"
                          style={{ animationDelay: `${200 + index * 50}ms` }} // Staggers the appearance of each block!
                        >
                          <span className="text-[7px] font-black text-teal-500/80 uppercase tracking-[0.2em] block truncate mb-1">
                            {key}
                          </span>
                          <span className="text-xs font-bold text-white truncate block">
                            {String(value)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}

              {/* Action Button */}
              <button
                onClick={closeResult}
                className={`w-full py-5 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl active:scale-95 transition-all hologram-item shadow-xl ${scanResult.type === "success" ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_10px_20px_rgba(16,185,129,0.3)]" : "bg-rose-500 text-white hover:bg-rose-400 shadow-[0_10px_20px_rgba(244,63,94,0.3)]"}`}
                style={{ animationDelay: "400ms" }}
              >
                {scanResult.type === "success"
                  ? "Clear & Scan Next"
                  : "Acknowledge Overide"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
