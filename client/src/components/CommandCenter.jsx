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
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- MODAL STATES ---
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [mintCount, setMintCount] = useState(60);

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

  // --- 1. DATA UPLOAD ---
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

  // --- 2. SUMMARY PDF (AAHAARAM UPGRADE) ---
  const generateStatsPDF = async () => {
    try {
      setLoading(true);
      showMessage("Compiling operations report...", "success");

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
      doc.text("AAHAARAM", 14, 25);

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
        "This document provides a comprehensive summary of meal fulfillments and badge scan activities recorded across all active terminals for the specified operational period. All data reflects real-time database ledger entries.";
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
          `Aahaaram Operations System • Page ${i} of ${pageCount}`,
          14,
          285,
        );
      }

      doc.save(`Aahaaram_EOD_Report_${now.toISOString().split("T")[0]}.pdf`);
      showMessage("Report downloaded.", "success");
    } catch (err) {
      showMessage("Failed to generate report.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. DETAILED LOG PDF (AAHAARAM UPGRADE) ---
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
      doc.text("AAHAARAM", 14, 22);

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
        doc.text(`Aahaaram Audit Ledger • Page ${i} of ${pageCount}`, 14, 285);
      }

      doc.save(`Aahaaram_Audit_Ledger_${now.toISOString().split("T")[0]}.pdf`);
      showMessage("Audit Ledger downloaded.", "success");
    } catch (err) {
      console.error(err);
      showMessage("Failed to generate ledger.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- 4. 🌸 MINIMAL & WELCOMING ANONYMOUS BADGES ---
  const generateQRPDF = async () => {
    const count = parseInt(mintCount);
    if (!count || count < 1)
      return showMessage("Please enter a valid number.", "error");

    setIsMintModalOpen(false);

    try {
      setLoading(true);
      showMessage(`Preparing ${count} welcome badges...`, "success");

      const res = await api.get(`/admin/generate-badges?count=${count}`);
      const badges = res.data.badges;

      if (!badges || badges.length === 0)
        return showMessage("Failed to create badges.", "error");

      const doc = new jsPDF("portrait", "mm", "a4");

      const cols = 3,
        rows = 4;
      const cardW = 50,
        cardH = 60;
      const gapX = 10,
        gapY = 10;
      const marginX = 20,
        marginY = 13.5;
      const qrSize = 40;

      let currentItem = 0;

      for (let i = 0; i < badges.length; i++) {
        const qrString = badges[i];

        if (currentItem > 0 && currentItem % (cols * rows) === 0) {
          doc.addPage();
          currentItem = 0;
        }

        const colIndex = currentItem % cols;
        const rowIndex = Math.floor(currentItem / cols);

        const x = marginX + colIndex * (cardW + gapX);
        const y = marginY + rowIndex * (cardH + gapY);

        // Draw Card Outline
        doc.setDrawColor(220);
        doc.roundedRect(x, y, cardW, cardH, 4, 4);

        // Minimalist QR
        const qrDataUrl = await QRCode.toDataURL(qrString, {
          margin: 0,
          width: 400,
          color: { dark: "#333333", light: "#FFFFFF" },
        });

        const qrX = x + (cardW - qrSize) / 2;
        const qrY = y + 7;
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

        // Warm Tagline
        const centerX = x + cardW / 2;
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "italic");
        doc.text("We're so glad you're here", centerX, y + 53, {
          align: "center",
        });

        currentItem++;
      }
      doc.save(`Welcome_Badges_${count}.pdf`);
      showMessage(`Successfully created ${count} badges.`, "success");
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
      {/* HEADER */}
      <div className="sticky top-16 z-30 pt-4 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 mx-[-1rem] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-[0.8rem] flex items-center justify-center shadow-inner">
            <i className="ph-fill ph-cpu text-indigo-400 text-xl"></i>
          </div>
          Command
        </h2>
      </div>

      {/* ALERTS */}
      {message && (
        <div
          className={`fixed top-32 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[100] px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center backdrop-blur-xl shadow-2xl animate-enter border ${message.type === "error" ? "bg-rose-500/90 border-rose-400 text-white" : "bg-teal-500/90 border-teal-400 text-white"}`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5 mt-6">
        {/* SETTINGS BLOCK */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem]">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <i className="ph-bold ph-faders text-teal-400"></i> Overrides
          </h3>

          <div className="space-y-3">
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

        {/* DATA OPS BLOCK */}
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
              onClick={() => setIsMintModalOpen(true)}
              disabled={loading}
              className="col-span-2 flex flex-col items-center justify-center py-4 bg-teal-500/10 active:bg-teal-500/20 rounded-[1.5rem] border border-teal-500/30 transition-all disabled:opacity-50"
            >
              <i className="ph-duotone ph-printer text-2xl text-teal-400 mb-1"></i>
              <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest">
                Print Blank IDs
              </span>
            </button>
          </div>
        </div>

        {/* STAFF ACCESS BLOCK */}
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

        {/* DANGER ZONE */}
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

      {/* MINT BADGES MODAL */}
      {isMintModalOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-950/80 backdrop-blur-sm p-4 animate-enter">
          <div className="bg-slate-900 border border-teal-500/50 w-full max-w-md mx-auto rounded-[2.5rem] p-6 shadow-2xl relative">
            <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-teal-500/30">
              <i className="ph-fill ph-qr-code text-3xl text-teal-500"></i>
            </div>

            <h3 className="text-xl font-black text-white text-center mb-1">
              Print Welcome Badges
            </h3>
            <p className="text-[10px] text-teal-400/80 font-bold uppercase tracking-[0.1em] text-center mb-6">
              Enter the number of blank IDs to generate.
            </p>

            <div className="bg-black/40 p-4 rounded-[1.5rem] border border-teal-500/20 mb-6">
              <input
                type="number"
                min="1"
                max="1000"
                value={mintCount}
                onChange={(e) => setMintCount(e.target.value)}
                className="w-full bg-slate-900 border border-teal-500/30 rounded-xl py-4 text-center text-white font-black text-xl focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={generateQRPDF}
                disabled={loading || mintCount < 1}
                className={`w-full py-4 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all ${loading || mintCount < 1 ? "bg-slate-800 text-slate-600 pointer-events-none" : "bg-teal-500 text-slate-900 active:scale-95 shadow-[0_0_20px_rgba(20,184,166,0.3)]"}`}
              >
                {loading ? "Minting..." : "Generate PDF"}
              </button>
              <button
                onClick={() => setIsMintModalOpen(false)}
                className="w-full py-4 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-2xl active:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURGE CONFIRMATION SHEET */}
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
