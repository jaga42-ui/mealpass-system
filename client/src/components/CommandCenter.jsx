import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import api from "../api/axios";

const CommandCenter = () => {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    activeMeal: "Lunch",
    isScannerLocked: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- 🚨 PURGE STATE ---
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/admin/settings");
      setSettings(res.data);
    } catch (err) {
      console.error("Error fetching settings", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  // --- 1. GLOBAL SETTINGS CONTROLS ---
  const handleUpdateSettings = async (key, value) => {
    try {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await api.put("/admin/settings", updated);
      showMessage("System settings updated globally.", "success");
    } catch (err) {
      showMessage("Failed to update settings.", "error");
    }
  };

  // --- 2. STAFF ROLE MANAGEMENT ---
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(
        users.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
      );
      showMessage("Staff role updated successfully.", "success");
    } catch (err) {
      showMessage("Failed to update role.", "error");
    }
  };

  // --- 3. 🛡️ REINFORCED ARRAY-BUFFER EXCEL UPLOAD ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawGrid.length < 2) {
          showMessage("File is empty or only contains headers.", "error");
          setLoading(false);
          return;
        }

        const headers = rawGrid[0].map((h) => String(h).toLowerCase().trim());
        let nameCol = headers.findIndex((h) => h.includes("name"));
        let catCol = headers.findIndex(
          (h) => h.includes("category") || h.includes("role"),
        );
        let qrCol = headers.findIndex(
          (h) => (h.includes("qr") || h.includes("id")) && !h.includes("email"),
        );

        if (nameCol === -1) nameCol = 1;

        const cleanData = rawGrid
          .slice(1)
          .map((row) => {
            if (!row || row.length === 0) return null;
            const participantName = row[nameCol];
            if (!participantName) return null;

            const formattedRow = {
              name: String(participantName).trim(),
              category:
                catCol !== -1 && row[catCol]
                  ? String(row[catCol]).trim()
                  : "Participant",
            };

            if (
              qrCol !== -1 &&
              row[qrCol] &&
              String(row[qrCol]).trim() !== ""
            ) {
              formattedRow.qrId = String(row[qrCol]).trim().toUpperCase();
            }

            headers.forEach((header, i) => {
              if (
                i !== nameCol &&
                i !== catCol &&
                i !== qrCol &&
                header !== ""
              ) {
                formattedRow[header] = row[i];
              }
            });

            return formattedRow;
          })
          .filter(Boolean);

        console.log(
          `🚀 SUCCESSFULLY PARSED ${cleanData.length} ROWS:`,
          cleanData,
        );

        if (cleanData.length === 0) {
          showMessage(
            "Could not extract any valid data from the file.",
            "error",
          );
          return;
        }

        const res = await api.post("/admin/bulk-upload", cleanData);
        showMessage(res.data.message, "success");
      } catch (err) {
        console.error("Upload Error:", err);
        showMessage(
          err.response?.data?.message ||
            "Upload failed. Check console for details.",
          "error",
        );
      } finally {
        setLoading(false);
        e.target.value = null;
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // --- 4. EOD PDF REPORT GENERATION ---
  const generateStatsPDF = async () => {
    try {
      setLoading(true);
      const res = await api.get("/scans/stats");
      const stats = res.data.stats;
      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.setTextColor(20, 184, 166);
      doc.text("AccessPro - End of Day Report", 14, 20);

      autoTable(doc, {
        startY: 40,
        headStyles: { fillColor: [20, 184, 166] },
        head: [["Meal Category", "Total Served"]],
        body: [
          ["Breakfast", stats.Breakfast || 0],
          ["Lunch", stats.Lunch || 0],
          ["Snacks", stats.Snacks || 0],
          ["Dinner", stats.Dinner || 0],
        ],
        foot: [["GRAND TOTAL", res.data.total || 0]],
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
      });

      doc.save(
        `AccessPro_Report_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      showMessage("Stats Report downloaded.", "success");
    } catch (err) {
      showMessage("Failed to generate stats.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- 5. BATCH PRINT ID CARDS (A4 GRID) ---
  const generateQRPDF = async () => {
    try {
      setLoading(true);
      showMessage("Fetching roster and generating codes...", "success");

      const res = await api.get("/participants");
      const participants = res.data;

      if (participants.length === 0) {
        showMessage("No participants in roster.", "error");
        setLoading(false);
        return;
      }

      const doc = new jsPDF("portrait", "mm", "a4");
      const cols = 3;
      const rows = 4;
      const marginX = 15;
      const marginY = 15;
      const badgeWidth = 55;
      const badgeHeight = 65;
      const qrSize = 40;

      let currentItem = 0;

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];

        if (currentItem > 0 && currentItem % (cols * rows) === 0) {
          doc.addPage();
          currentItem = 0;
        }

        const colIndex = currentItem % cols;
        const rowIndex = Math.floor(currentItem / cols);

        const x = marginX + colIndex * (badgeWidth + 10);
        const y = marginY + rowIndex * (badgeHeight + 5);

        doc.setDrawColor(200);
        doc.roundedRect(x, y, badgeWidth, badgeHeight, 3, 3);

        if (p.qrId) {
          const qrDataUrl = await QRCode.toDataURL(p.qrId, {
            margin: 1,
            width: 400,
          });
          const qrXOffset = x + (badgeWidth - qrSize) / 2;
          doc.addImage(qrDataUrl, "PNG", qrXOffset, y + 5, qrSize, qrSize);
        } else {
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text("UNASSIGNED", x + 12, y + 25);
        }

        doc.setFontSize(10);
        doc.setTextColor(30);
        doc.setFont("helvetica", "bold");
        const shortName = p.name
          ? p.name.length > 18
            ? p.name.substring(0, 15) + "..."
            : p.name
          : "Unnamed";
        const textWidth = doc.getTextWidth(shortName);
        doc.text(shortName, x + (badgeWidth - textWidth) / 2, y + 52);

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        const subText = `${p.qrId ? p.qrId.split("-")[0] : "NO BADGE"} • ${p.category}`;
        const subTextWidth = doc.getTextWidth(subText);
        doc.text(subText, x + (badgeWidth - subTextWidth) / 2, y + 58);

        currentItem++;
      }

      doc.save("AccessPro_Printable_Badges.pdf");
      showMessage("Badge PDF downloaded successfully.", "success");
    } catch (err) {
      console.error(err);
      showMessage("Failed to generate Badges.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- 6. NUCLEAR PURGE LOGIC ---
  const executePurge = async () => {
    if (purgeConfirmText !== "PURGE") return;
    setIsPurging(true);
    try {
      await api.delete("/admin/purge");
      showMessage("SYSTEM PURGED. All rosters and scan data wiped.", "success");
      setIsPurgeModalOpen(false);
      setPurgeConfirmText("");
    } catch (error) {
      showMessage("Purge failed. Check server logs.", "error");
    } finally {
      setIsPurging(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="animate-enter w-full max-w-md md:max-w-4xl mx-auto pb-24 relative z-20 px-4 md:px-0">
      {/* 💎 ULTRA-SLEEK GLASS HEADER */}
      <div className="sticky top-16 z-30 pt-4 pb-6 bg-slate-950/80 backdrop-blur-2xl mx-[-1rem] px-4 md:mx-0 md:px-0 md:bg-transparent shadow-[0_20px_40px_rgba(0,0,0,0.8)] md:shadow-none border-b border-white/5 md:border-none">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-inner">
            <i className="ph-fill ph-cpu text-indigo-400 text-2xl"></i>
          </div>
          Command Center
        </h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2 ml-16">
          System Architecture & Overrides
        </p>
      </div>

      {/* FLOATING ALERTS */}
      {message && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest text-center backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-enter border ${message.type === "error" ? "bg-rose-500/20 border-rose-500/50 text-rose-300" : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"}`}
        >
          {message.text}
        </div>
      )}

      {/* 🍱 BENTO BOX GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* 🎛️ SECTION 1: SYSTEM OVERRIDES */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] hover:border-white/10 transition-all group">
          <h3 className="font-black text-white text-lg mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500/10 rounded-xl flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <i className="ph-bold ph-faders text-teal-400"></i>
            </div>
            Overrides
          </h3>

          <div className="space-y-4">
            {/* Custom Animated Toggle */}
            <div
              className="flex items-center justify-between bg-black/40 border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors cursor-pointer"
              onClick={() =>
                handleUpdateSettings(
                  "isScannerLocked",
                  !settings.isScannerLocked,
                )
              }
            >
              <div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                  Terminal Lock
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                  {settings.isScannerLocked
                    ? "Scanning Disabled"
                    : "Scanning Active"}
                </span>
              </div>
              <div
                className={`w-14 h-8 rounded-full relative transition-all duration-500 shadow-inner ${settings.isScannerLocked ? "bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]" : "bg-slate-800 border border-white/10"}`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all duration-500 shadow-md ${settings.isScannerLocked ? "left-7" : "left-1"}`}
                ></div>
              </div>
            </div>

            {/* Custom Select */}
            <div className="flex flex-col bg-black/40 border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">
                Active Meal Queue
              </span>
              <div className="relative">
                <select
                  value={settings.activeMeal}
                  onChange={(e) =>
                    handleUpdateSettings("activeMeal", e.target.value)
                  }
                  className="w-full bg-slate-800 text-teal-400 font-black tracking-wide py-4 px-5 rounded-xl border border-white/5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all appearance-none shadow-inner"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Dinner">Dinner</option>
                </select>
                <i className="ph-bold ph-caret-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
              </div>
            </div>
          </div>
        </div>

        {/* 💾 SECTION 2: DATA CENTER */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] hover:border-white/10 transition-all group">
          <h3 className="font-black text-white text-lg mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <i className="ph-bold ph-database text-blue-400"></i>
            </div>
            Data Ops
          </h3>

          <div className="grid grid-cols-2 gap-4 h-[calc(100%-3rem)]">
            {/* Glowing Upload Dropzone */}
            <label
              className={`col-span-2 relative flex flex-col items-center justify-center py-6 bg-black/40 hover:bg-emerald-500/10 rounded-2xl cursor-pointer border border-white/5 hover:border-emerald-500/50 transition-all duration-300 text-center active:scale-95 group/upload ${loading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <div className="w-12 h-12 bg-slate-800 group-hover/upload:bg-emerald-500/20 rounded-full flex items-center justify-center mb-3 transition-colors shadow-inner">
                <i className="ph-duotone ph-file-xls text-2xl text-emerald-400"></i>
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                Bulk Upload
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                .xlsx / .csv
              </span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </label>

            {/* App-Icon style buttons */}
            <button
              onClick={generateStatsPDF}
              disabled={loading}
              className="flex flex-col items-center justify-center py-5 bg-black/40 hover:bg-blue-500/10 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-all duration-300 text-center active:scale-95 disabled:opacity-50 group/btn"
            >
              <i className="ph-duotone ph-chart-line-up text-2xl text-blue-400 mb-2 group-hover/btn:scale-110 transition-transform"></i>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                EOD Report
              </span>
            </button>

            <button
              onClick={generateQRPDF}
              disabled={loading}
              className="flex flex-col items-center justify-center py-5 bg-black/40 hover:bg-teal-500/10 rounded-2xl border border-white/5 hover:border-teal-500/50 transition-all duration-300 text-center active:scale-95 disabled:opacity-50 group/btn"
            >
              <i className="ph-duotone ph-printer text-2xl text-teal-400 mb-2 group-hover/btn:scale-110 transition-transform"></i>
              <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest">
                Print Grid
              </span>
            </button>
          </div>
        </div>

        {/* 👥 SECTION 3: STAFF MANAGEMENT (Spans full width on tablet/desktop) */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] hover:border-white/10 transition-all md:col-span-2 group">
          <h3 className="font-black text-white text-lg mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <i className="ph-bold ph-shield-check text-purple-400"></i>
            </div>
            Staff Permissions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto no-scrollbar pr-1">
            {users.map((u) => (
              <div
                key={u._id}
                className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden mr-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
                    <i className="ph-fill ph-user text-slate-400 text-sm"></i>
                  </div>
                  <p className="text-xs font-bold text-slate-300 truncate">
                    {u.email}
                  </p>
                </div>
                <div className="relative shrink-0">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className={`text-[9px] font-black uppercase tracking-widest rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer shadow-inner pr-8 ${
                      u.role === "admin"
                        ? "bg-purple-500/10 border border-purple-500/30 text-purple-400"
                        : u.role === "volunteer"
                          ? "bg-teal-500/10 border border-teal-500/30 text-teal-400"
                          : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    }`}
                  >
                    <option
                      value="pending"
                      className="bg-slate-900 text-amber-400"
                    >
                      Pending
                    </option>
                    <option
                      value="volunteer"
                      className="bg-slate-900 text-teal-400"
                    >
                      Volunteer
                    </option>
                    <option
                      value="admin"
                      className="bg-slate-900 text-purple-400"
                    >
                      Admin
                    </option>
                  </select>
                  <i
                    className={`ph-bold ph-caret-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none ${
                      u.role === "admin"
                        ? "text-purple-400"
                        : u.role === "volunteer"
                          ? "text-teal-400"
                          : "text-amber-400"
                    }`}
                  ></i>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="col-span-full py-8 text-center bg-black/20 rounded-2xl border border-dashed border-white/10">
                <i className="ph-duotone ph-ghost text-3xl text-slate-600 mb-2"></i>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  No staff found
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 🚨 SECTION 4: DANGER ZONE (Spans full width) */}
        <div className="bg-rose-950/20 border border-rose-500/20 p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden md:col-span-2 group">
          {/* CSS Striped background pattern for Danger Zone */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #f43f5e, #f43f5e 10px, transparent 10px, transparent 20px)",
            }}
          ></div>
          <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6">
            <div>
              <h3 className="font-black text-rose-500 text-lg mb-1 flex items-center gap-3 tracking-wide">
                <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center group-hover:bg-rose-500/20 transition-colors border border-rose-500/30">
                  <i className="ph-bold ph-warning-octagon text-rose-400"></i>
                </div>
                Terminate Database
              </h3>
              <p className="text-[10px] text-rose-400/60 font-bold uppercase tracking-widest mt-2 md:ml-11">
                Permanently wipe all rosters, analytics, and scan data.
              </p>
            </div>
            <button
              onClick={() => setIsPurgeModalOpen(true)}
              className="px-8 py-4 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 border border-rose-500/50 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.1)] hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] active:scale-95 transition-all w-full md:w-auto shrink-0"
            >
              Initiate Purge
            </button>
          </div>
        </div>
      </div>

      {/* 🚨 SCROLL-PROOFED PURGE CONFIRMATION MODAL 🚨 */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-rose-500/50 w-full max-w-sm rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(244,63,94,0.2)] animate-enter relative overflow-hidden text-center my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>

            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-500/30 shadow-inner">
              <i className="ph-fill ph-warning-diamond text-4xl text-rose-500 animate-pulse"></i>
            </div>

            <h3 className="text-2xl font-black text-white mb-2 tracking-wide">
              Confirm Purge
            </h3>
            <p className="text-[10px] text-rose-400/80 font-bold uppercase tracking-[0.1em] leading-relaxed mb-8">
              This action is destructive and irreversible.
            </p>

            <div className="bg-black/40 p-5 rounded-2xl border border-rose-500/20 mb-6">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-3">
                Type "PURGE" below
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                className="w-full bg-slate-900 border border-rose-500/30 rounded-xl py-4 text-center text-white font-black tracking-[0.3em] focus:outline-none focus:border-rose-400 focus:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all uppercase"
                placeholder="PURGE"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsPurgeModalOpen(false);
                  setPurgeConfirmText("");
                }}
                className="flex-1 py-4 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executePurge}
                disabled={purgeConfirmText !== "PURGE" || isPurging}
                className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all ${purgeConfirmText === "PURGE" ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:bg-rose-400 active:scale-95" : "bg-slate-800 text-slate-600 pointer-events-none"}`}
              >
                {isPurging ? "Purging..." : "Destroy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCenter;
