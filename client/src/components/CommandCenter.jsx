import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import api from "../api/axios";

const CommandCenter = () => {
  const [users, setUsers] = useState([]);

  // 🚀 Settings & Hydration State
  const [settings, setSettings] = useState({
    activeMeal: "Lunch",
    isScannerLocked: false,
  });
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

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
    } finally {
      setIsSettingsLoaded(true);
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

  const handleUpdateSettings = async (key, value) => {
    try {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await api.put("/admin/settings", updated);
      showMessage("Settings updated.", "success");
    } catch (err) {
      showMessage("Failed to update.", "error");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(
        users.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
      );
      showMessage("Role updated.", "success");
    } catch (err) {
      showMessage("Failed to update.", "error");
    }
  };

  // --- 1. 🛡️ ARRAY-BUFFER EXCEL UPLOAD ---
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
          showMessage("File is empty.", "error");
          return setLoading(false);
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

        if (cleanData.length === 0) {
          showMessage("No valid data found.", "error");
          return;
        }

        const res = await api.post("/admin/bulk-upload", cleanData);
        showMessage(res.data.message, "success");
      } catch (err) {
        showMessage("Upload failed. Check file.", "error");
      } finally {
        setLoading(false);
        e.target.value = null;
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // --- 2. SUMMARY STATS PDF REPORT ---
  const generateStatsPDF = async () => {
    try {
      setLoading(true);
      showMessage("Compiling secure report...", "success");

      const res = await api.get("/scans/stats");
      const stats = res.data.stats;
      const doc = new jsPDF();

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      doc.setFontSize(24);
      doc.setTextColor(20, 184, 166);
      doc.setFont("helvetica", "bold");
      doc.text("ACCESSPRO", 14, 25);

      doc.setFontSize(14);
      doc.setTextColor(50, 50, 50);
      doc.text("End of Day Operations Report", 14, 33);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Report Period:   ${dateStr}`, 14, 45);
      doc.text(`Generated On:    ${dateStr} at ${timeStr}`, 14, 51);
      doc.text(`Authorized By:   System Administrator`, 14, 57);

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const introText =
        "This document provides a comprehensive, cryptographically verified summary of meal fulfillments and badge scan activities recorded across all active terminals for the specified operational period. All data reflects real-time database ledger entries.";
      const splitIntro = doc.splitTextToSize(introText, 180);
      doc.text(splitIntro, 14, 68);

      autoTable(doc, {
        startY: 85,
        theme: "grid",
        headStyles: {
          fillColor: [20, 184, 166],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "left",
        },
        columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
        head: [["Operational Category", "Total Verified Scans"]],
        body: [
          ["Breakfast Fulfillment", stats.Breakfast || 0],
          ["Lunch Fulfillment", stats.Lunch || 0],
          ["Snacks Fulfillment", stats.Snacks || 0],
          ["Dinner Fulfillment", stats.Dinner || 0],
        ],
        foot: [["TOTAL SYSTEM THROUGHPUT", res.data.total || 0]],
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "right",
        },
      });

      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `AccessPro Security & Logistics System • Page ${i} of ${pageCount}`,
          14,
          285,
        );
      }

      doc.save(`AccessPro_EOD_Report_${now.toISOString().split("T")[0]}.pdf`);
      showMessage("Report downloaded.", "success");
    } catch (err) {
      showMessage("Failed to generate report.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. DETAILED SCAN LOG PDF ---
  const generateDetailedReportPDF = async () => {
    try {
      setLoading(true);
      showMessage("Compiling detailed scan log...", "success");

      const res = await api.get("/scans/history");
      const scans = res.data;

      if (!scans || scans.length === 0) {
        showMessage("No scan data found for today.", "error");
        setLoading(false);
        return;
      }

      const doc = new jsPDF();
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.setFont("helvetica", "bold");
      doc.text("ACCESSPRO", 14, 22);

      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text("Detailed Access & Meal Ledger", 14, 29);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated On: ${now.toLocaleString()}`, 14, 38);

      const tableData = scans.map((scan) => {
        const scanDate = new Date(scan.scannedAt || scan.createdAt);
        return [
          scan.participant?.name || "UNKNOWN ID",
          scan.participant?.category || "N/A",
          scan.mealType,
          scanDate.toLocaleDateString(),
          scanDate.toLocaleTimeString(),
          scan.status || "Approved",
        ];
      });

      autoTable(doc, {
        startY: 45,
        theme: "grid",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        head: [
          ["Participant Name", "Category", "Meal", "Date", "Time", "Status"],
        ],
        body: tableData,
      });

      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`AccessPro Audit Ledger • Page ${i} of ${pageCount}`, 14, 285);
      }

      doc.save(`AccessPro_Audit_Ledger_${now.toISOString().split("T")[0]}.pdf`);
      showMessage("Audit Ledger downloaded.", "success");
    } catch (err) {
      console.error(err);
      showMessage("Failed to generate ledger.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- 4. PRINT QR CODES ---
  const generateQRPDF = async () => {
    try {
      setLoading(true);
      showMessage("Generating codes...", "success");
      const res = await api.get("/participants");
      const participants = res.data;

      if (participants.length === 0)
        return showMessage("Roster empty.", "error");

      const doc = new jsPDF("portrait", "mm", "a4");
      const cols = 3,
        rows = 4,
        marginX = 15,
        marginY = 15,
        badgeWidth = 55,
        badgeHeight = 65,
        qrSize = 40;
      let currentItem = 0;

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (currentItem > 0 && currentItem % (cols * rows) === 0) {
          doc.addPage();
          currentItem = 0;
        }

        const x = marginX + (currentItem % cols) * (badgeWidth + 10);
        const y = marginY + Math.floor(currentItem / cols) * (badgeHeight + 5);

        doc.setDrawColor(200);
        doc.roundedRect(x, y, badgeWidth, badgeHeight, 3, 3);

        if (p.qrId) {
          const qrDataUrl = await QRCode.toDataURL(p.qrId, {
            margin: 1,
            width: 400,
          });
          doc.addImage(
            qrDataUrl,
            "PNG",
            x + (badgeWidth - qrSize) / 2,
            y + 5,
            qrSize,
            qrSize,
          );
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
        doc.text(
          shortName,
          x + (badgeWidth - doc.getTextWidth(shortName)) / 2,
          y + 52,
        );

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        const subText = `${p.qrId ? p.qrId.split("-")[0] : "NO BADGE"} • ${p.category}`;
        doc.text(
          subText,
          x + (badgeWidth - doc.getTextWidth(subText)) / 2,
          y + 58,
        );
        currentItem++;
      }
      doc.save("Badges.pdf");
    } catch (err) {
      showMessage("Generation failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- 5. PURGE DATABASE ---
  const executePurge = async () => {
    if (purgeConfirmText !== "PURGE") return;
    setIsPurging(true);
    try {
      await api.delete("/admin/purge");
      showMessage("SYSTEM PURGED.", "success");
      setIsPurgeModalOpen(false);
      setPurgeConfirmText("");
    } catch (error) {
      showMessage("Purge failed.", "error");
    } finally {
      setIsPurging(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="animate-enter w-full max-w-md mx-auto pb-24 px-4 relative z-20">
      {/* MOBILE-OPTIMIZED HEADER */}
      <div className="sticky top-16 z-30 pt-4 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 mx-[-1rem] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-[0.8rem] flex items-center justify-center shadow-inner">
            <i className="ph-fill ph-cpu text-indigo-400 text-xl"></i>
          </div>
          Command
        </h2>
      </div>

      {/* FLOATING MOBILE ALERTS */}
      {message && (
        <div
          className={`fixed top-32 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[100] px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center backdrop-blur-xl shadow-2xl animate-enter border ${message.type === "error" ? "bg-rose-500/90 border-rose-400 text-white" : "bg-teal-500/90 border-teal-400 text-white"}`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5 mt-6">
        {/* 🎛️ SETTINGS */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem]">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <i className="ph-bold ph-faders text-teal-400"></i> Overrides
          </h3>

          <div className="space-y-3">
            {/* TERMINAL LOCK */}
            <div
              className="flex items-center justify-between bg-black/40 p-4 rounded-2xl active:bg-black/60 transition-colors cursor-pointer"
              onClick={() =>
                isSettingsLoaded &&
                handleUpdateSettings(
                  "isScannerLocked",
                  !settings.isScannerLocked,
                )
              }
            >
              <div>
                <span className="text-[11px] font-black text-white uppercase tracking-widest block">
                  Terminal Lock
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                  {!isSettingsLoaded
                    ? "Connecting..."
                    : settings.isScannerLocked
                      ? "Disabled"
                      : "Active"}
                </span>
              </div>

              {!isSettingsLoaded ? (
                <div className="w-12 h-7 rounded-full bg-slate-800 animate-pulse"></div>
              ) : (
                <div
                  className={`w-12 h-7 rounded-full relative transition-all duration-300 ${settings.isScannerLocked ? "bg-rose-500" : "bg-slate-800 border border-white/10"}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 ${settings.isScannerLocked ? "left-6" : "left-1"}`}
                  ></div>
                </div>
              )}
            </div>

            {/* MEAL QUEUE */}
            <div className="relative bg-black/40 p-4 rounded-2xl">
              <span className="text-[11px] font-black text-white uppercase tracking-widest block mb-2">
                Meal Queue
              </span>

              {!isSettingsLoaded ? (
                <div className="w-full h-12 bg-slate-800/50 rounded-xl animate-pulse border border-white/5"></div>
              ) : (
                <div className="relative">
                  <select
                    value={settings.activeMeal}
                    onChange={(e) =>
                      handleUpdateSettings("activeMeal", e.target.value)
                    }
                    className="w-full bg-slate-800 text-teal-400 font-bold py-3.5 px-4 rounded-xl border border-white/5 outline-none focus:border-teal-500 appearance-none text-sm"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Dinner">Dinner</option>
                  </select>
                  <i className="ph-bold ph-caret-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 💾 DATA OPS */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem]">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <i className="ph-bold ph-database text-blue-400"></i> Data Ops
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <label
              className={`col-span-2 flex flex-col items-center justify-center py-5 bg-emerald-500/10 active:bg-emerald-500/20 rounded-[1.5rem] cursor-pointer border border-emerald-500/30 transition-all ${loading ? "opacity-50" : ""}`}
            >
              <i className="ph-duotone ph-file-xls text-3xl text-emerald-400 mb-1.5"></i>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                Bulk Upload
              </span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </label>

            <button
              onClick={generateStatsPDF}
              disabled={loading}
              className="flex flex-col items-center justify-center py-4 bg-blue-500/10 active:bg-blue-500/20 rounded-[1.5rem] border border-blue-500/30 transition-all disabled:opacity-50"
            >
              <i className="ph-duotone ph-chart-pie-slice text-2xl text-blue-400 mb-1"></i>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                Summary
              </span>
            </button>

            <button
              onClick={generateDetailedReportPDF}
              disabled={loading}
              className="flex flex-col items-center justify-center py-4 bg-indigo-500/10 active:bg-indigo-500/20 rounded-[1.5rem] border border-indigo-500/30 transition-all disabled:opacity-50"
            >
              <i className="ph-duotone ph-list-numbers text-2xl text-indigo-400 mb-1"></i>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                Audit Log
              </span>
            </button>

            <button
              onClick={generateQRPDF}
              disabled={loading}
              className="col-span-2 flex flex-col items-center justify-center py-4 bg-teal-500/10 active:bg-teal-500/20 rounded-[1.5rem] border border-teal-500/30 transition-all disabled:opacity-50"
            >
              <i className="ph-duotone ph-printer text-2xl text-teal-400 mb-1"></i>
              <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest">
                Print Physical IDs
              </span>
            </button>
          </div>
        </div>

        {/* 👥 STAFF ACCESS */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem]">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <i className="ph-bold ph-shield-check text-purple-400"></i> Staff
            Access
          </h3>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
            {users.map((u) => (
              <div
                key={u._id}
                className="bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center justify-between"
              >
                <div className="truncate mr-2">
                  <p className="text-xs font-bold text-slate-300 truncate">
                    {u.email}
                  </p>
                </div>
                <div className="relative shrink-0">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className={`text-[9px] font-black uppercase tracking-widest rounded-xl px-2 py-2 outline-none appearance-none pr-6 ${
                      u.role === "admin"
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                        : u.role === "volunteer"
                          ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
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
                  <i className="ph-bold ph-caret-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none text-slate-400"></i>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🚨 DANGER ZONE */}
        <div className="bg-rose-950/20 border border-rose-500/20 p-5 rounded-[2rem] mt-4">
          <h3 className="font-black text-rose-500 text-base mb-1 flex items-center gap-2">
            <i className="ph-bold ph-warning-octagon text-rose-400"></i> Danger
            Zone
          </h3>
          <p className="text-[10px] text-rose-400/70 font-bold uppercase tracking-widest mb-4 ml-6">
            Wipe rosters & scans
          </p>
          <button
            onClick={() => setIsPurgeModalOpen(true)}
            className="w-full py-4 bg-rose-500/10 text-rose-500 border border-rose-500/30 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] active:bg-rose-500 active:text-white transition-all"
          >
            Initiate Purge
          </button>
        </div>
      </div>

      {/* 🚨 MOBILE PURGE SHEET */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-950/80 backdrop-blur-sm p-4 animate-enter">
          <div className="bg-slate-900 border border-rose-500/50 w-full max-w-md mx-auto rounded-[2.5rem] p-6 shadow-2xl relative">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-rose-500/30">
              <i className="ph-fill ph-warning-diamond text-3xl text-rose-500"></i>
            </div>

            <h3 className="text-xl font-black text-white text-center mb-1">
              Confirm Purge
            </h3>
            <p className="text-[10px] text-rose-400/80 font-bold uppercase tracking-[0.1em] text-center mb-6">
              This action is destructive and irreversible.
            </p>

            <div className="bg-black/40 p-4 rounded-[1.5rem] border border-rose-500/20 mb-6">
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                className="w-full bg-slate-900 border border-rose-500/30 rounded-xl py-4 text-center text-white font-black tracking-[0.2em] focus:outline-none focus:border-rose-400 uppercase text-sm"
                placeholder="TYPE 'PURGE'"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={executePurge}
                disabled={purgeConfirmText !== "PURGE" || isPurging}
                className={`w-full py-4 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all ${purgeConfirmText === "PURGE" ? "bg-rose-500 text-white active:scale-95" : "bg-slate-800 text-slate-600 pointer-events-none"}`}
              >
                {isPurging ? "Purging..." : "Destroy Data"}
              </button>
              <button
                onClick={() => {
                  setIsPurgeModalOpen(false);
                  setPurgeConfirmText("");
                }}
                className="w-full py-4 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-2xl active:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCenter;
