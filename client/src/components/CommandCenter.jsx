import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; 
import api from '../api/axios';

const CommandCenter = () => {
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState({ activeMeal: 'Lunch', isScannerLocked: false });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchUsers();
    }, []);

    const fetchSettings = async () => {
        try { const res = await api.get('/admin/settings'); setSettings(res.data); } 
        catch (err) { console.error("Error fetching settings", err); }
    };

    const fetchUsers = async () => {
        try { const res = await api.get('/admin/users'); setUsers(res.data); } 
        catch (err) { console.error("Error fetching users", err); }
    };

    // --- 1. GLOBAL SETTINGS CONTROLS ---
    const handleUpdateSettings = async (key, value) => {
        try {
            const updated = { ...settings, [key]: value };
            setSettings(updated);
            await api.put('/admin/settings', updated);
            showMessage('System settings updated globally.', 'success');
        } catch (err) { showMessage('Failed to update settings.', 'error'); }
    };

    // --- 2. STAFF ROLE MANAGEMENT ---
    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
            showMessage('Staff role updated successfully.', 'success');
        } catch (err) { showMessage('Failed to update role.', 'error'); }
    };

    // --- 3. BULK EXCEL UPLOAD ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

                if (data.length > 0 && !data[0].qrId) {
                    throw new Error("Excel must have a 'qrId' column header.");
                }

                const res = await api.post('/admin/bulk-upload', data);
                showMessage(res.data.message, 'success');
            } catch (err) {
                showMessage(err.response?.data?.message || err.message || 'Upload failed.', 'error');
            } finally {
                setLoading(false);
                e.target.value = null; 
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- 4. EOD PDF REPORT GENERATION ---
    const generateStatsPDF = async () => {
        try {
            setLoading(true);
            const res = await api.get('/scans/stats');
            const stats = res.data.stats;
            const doc = new jsPDF();
            
            doc.setFontSize(22);
            doc.setTextColor(20, 184, 166); // Updated to match Teal-500
            doc.text("AccessPro - End of Day Report", 14, 20);
            
            autoTable(doc, {
                startY: 40,
                headStyles: { fillColor: [20, 184, 166] }, // Updated to match Teal-500
                head: [['Meal Category', 'Total Served']],
                body: [
                    ['Breakfast', stats.Breakfast],
                    ['Lunch', stats.Lunch],
                    ['Snacks', stats.Snacks],
                    ['Dinner', stats.Dinner],
                ],
                foot: [['GRAND TOTAL', res.data.total]],
                footStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold' }
            });

            doc.save(`AccessPro_Report_${res.data.date}.pdf`);
            showMessage('Stats Report downloaded.', 'success');
        } catch (err) { showMessage('Failed to generate stats.', 'error'); } 
        finally { setLoading(false); }
    };

    // --- 5. BATCH PRINT ID CARDS (A4 GRID) ---
    const generateQRPDF = async () => {
        try {
            setLoading(true);
            showMessage('Fetching roster and generating codes...', 'success');
            
            const res = await api.get('/participants');
            const participants = res.data;

            if (participants.length === 0) {
                showMessage('No participants in roster.', 'error');
                setLoading(false);
                return;
            }

            const doc = new jsPDF('portrait', 'mm', 'a4');
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
                
                const x = marginX + (colIndex * (badgeWidth + 10)); 
                const y = marginY + (rowIndex * (badgeHeight + 5)); 

                doc.setDrawColor(200);
                doc.roundedRect(x, y, badgeWidth, badgeHeight, 3, 3);

                const qrDataUrl = await QRCode.toDataURL(p.qrId, { margin: 1, width: 400 });

                const qrXOffset = x + (badgeWidth - qrSize) / 2;
                doc.addImage(qrDataUrl, 'PNG', qrXOffset, y + 5, qrSize, qrSize);

                doc.setFontSize(10);
                doc.setTextColor(30);
                doc.setFont("helvetica", "bold");
                const shortName = p.name.length > 18 ? p.name.substring(0, 15) + '...' : p.name;
                const textWidth = doc.getTextWidth(shortName);
                doc.text(shortName, x + (badgeWidth - textWidth) / 2, y + 52);

                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.setFont("helvetica", "normal");
                const subText = `${p.qrId} • ${p.category}`;
                const subTextWidth = doc.getTextWidth(subText);
                doc.text(subText, x + (badgeWidth - subTextWidth) / 2, y + 58);

                currentItem++;
            }

            doc.save('AccessPro_Printable_Badges.pdf');
            showMessage('Badge PDF downloaded successfully.', 'success');
            
        } catch (err) {
            console.error(err);
            showMessage('Failed to generate Badges.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    return (
        <div className="space-y-6 animate-enter w-full max-w-md mx-auto">
            
            {message && (
                <div className={`p-4 rounded-2xl text-[11px] font-bold text-center backdrop-blur-sm shadow-lg animate-enter border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-teal-500/10 border-teal-500/30 text-teal-300'}`}>
                    {message.text}
                </div>
            )}

            {/* SECTION 1: GLOBAL OVERRIDES */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] relative overflow-hidden">
                <h3 className="font-black text-white text-lg mb-5 flex items-center gap-3 tracking-wide">
                    <div className="w-8 h-8 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                        <i className="ph-bold ph-sliders text-teal-400"></i>
                    </div>
                    System Overrides
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900/50 border border-white/5 p-4 rounded-2xl shadow-inner">
                        <span className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest">Lock Scanners</span>
                        <button 
                            onClick={() => handleUpdateSettings('isScannerLocked', !settings.isScannerLocked)}
                            className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${settings.isScannerLocked ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${settings.isScannerLocked ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    <div className="flex flex-col bg-slate-900/50 border border-white/5 p-4 rounded-2xl shadow-inner">
                        <span className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest mb-3">Force Active Meal</span>
                        <select 
                            value={settings.activeMeal}
                            onChange={(e) => handleUpdateSettings('activeMeal', e.target.value)}
                            className="bg-slate-800 text-white font-bold py-3 px-4 rounded-xl border border-white/10 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner appearance-none"
                        >
                            <option value="Breakfast" className="bg-slate-800">Breakfast</option>
                            <option value="Lunch" className="bg-slate-800">Lunch</option>
                            <option value="Snacks" className="bg-slate-800">Snacks</option>
                            <option value="Dinner" className="bg-slate-800">Dinner</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECTION 2: DATA OPERATIONS */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)]">
                <h3 className="font-black text-white text-lg mb-5 flex items-center gap-3 tracking-wide">
                    <div className="w-8 h-8 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                        <i className="ph-bold ph-database text-teal-400"></i>
                    </div>
                    Data Center
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                    <label className="relative flex flex-col items-center justify-center py-5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl cursor-pointer transition-all duration-300 text-center border border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95 group">
                        <i className="ph-duotone ph-file-xls text-3xl text-emerald-400 mb-2 group-hover:scale-110 transition-transform"></i>
                        <span className="text-[9px] font-black text-emerald-300/80 uppercase tracking-widest">Upload</span>
                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={loading} />
                    </label>

                    <button 
                        onClick={generateStatsPDF}
                        disabled={loading}
                        className="flex flex-col items-center justify-center py-5 bg-rose-500/10 hover:bg-rose-500/20 rounded-2xl transition-all duration-300 text-center border border-rose-500/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] active:scale-95 disabled:opacity-50 group"
                    >
                        <i className="ph-duotone ph-file-pdf text-3xl text-rose-400 mb-2 group-hover:scale-110 transition-transform"></i>
                        <span className="text-[9px] font-black text-rose-300/80 uppercase tracking-widest">Report</span>
                    </button>

                    <button 
                        onClick={generateQRPDF}
                        disabled={loading}
                        className="flex flex-col items-center justify-center py-5 bg-teal-500/10 hover:bg-teal-500/20 rounded-2xl transition-all duration-300 text-center border border-teal-500/30 hover:shadow-[0_0_20px_rgba(20,184,166,0.2)] active:scale-95 disabled:opacity-50 group"
                    >
                        <i className="ph-duotone ph-printer text-3xl text-teal-400 mb-2 group-hover:scale-110 transition-transform"></i>
                        <span className="text-[9px] font-black text-teal-300/80 uppercase tracking-widest">Print IDs</span>
                    </button>
                </div>
            </div>

            {/* SECTION 3: STAFF MANAGEMENT */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)]">
                <h3 className="font-black text-white text-lg mb-5 flex items-center gap-3 tracking-wide">
                    <div className="w-8 h-8 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <i className="ph-bold ph-shield-check text-purple-400"></i>
                    </div>
                    Staff Access
                </h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar pr-1">
                    {users.map(u => (
                        <div key={u._id} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-inner">
                            <div className="overflow-hidden mr-2">
                                <p className="text-xs font-bold text-slate-300 truncate">{u.email}</p>
                            </div>
                            <select 
                                value={u.role}
                                onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                className={`text-[9px] font-black uppercase tracking-widest rounded-xl px-3 py-2 outline-none appearance-none text-center cursor-pointer ${
                                    u.role === 'admin' ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300' : 
                                    u.role === 'volunteer' ? 'bg-teal-500/20 border border-teal-500/30 text-teal-300' : 
                                    'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                                }`}
                            >
                                <option value="pending" className="bg-slate-800 text-amber-400">Pending</option>
                                <option value="volunteer" className="bg-slate-800 text-teal-400">Volunteer</option>
                                <option value="admin" className="bg-slate-800 text-purple-400">Admin</option>
                            </select>
                        </div>
                    ))}
                    {users.length === 0 && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center py-4">No staff found.</p>}
                </div>
            </div>

        </div>
    );
};

export default CommandCenter;