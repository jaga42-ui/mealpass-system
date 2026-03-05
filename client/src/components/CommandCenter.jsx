import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; // <-- New QR Engine
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
            doc.setTextColor(42, 123, 155);
            doc.text("MealPass - End of Day Report", 14, 20);
            
            autoTable(doc, {
                startY: 40,
                headStyles: { fillColor: [42, 123, 155] },
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

            doc.save(`MealPass_Report_${res.data.date}.pdf`);
            showMessage('Stats Report downloaded.', 'success');
        } catch (err) { showMessage('Failed to generate stats.', 'error'); } 
        finally { setLoading(false); }
    };

    // --- 5. BATCH PRINT ID CARDS (A4 GRID) ---
    const generateQRPDF = async () => {
        try {
            setLoading(true);
            showMessage('Fetching roster and generating codes...', 'success');
            
            // 1. Fetch the entire Roster from the backend
            const res = await api.get('/participants');
            const participants = res.data;

            if (participants.length === 0) {
                showMessage('No participants in roster.', 'error');
                setLoading(false);
                return;
            }

            // 2. Setup an A4 Document
            const doc = new jsPDF('portrait', 'mm', 'a4');
            
            // A4 Grid Math: 3 columns x 4 rows = 12 badges per page
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

                // If we filled the page (12 items), add a new page
                if (currentItem > 0 && currentItem % (cols * rows) === 0) {
                    doc.addPage();
                    currentItem = 0; // Reset for the new page
                }

                // Calculate the exact X and Y coordinates for this badge
                const colIndex = currentItem % cols;
                const rowIndex = Math.floor(currentItem / cols);
                
                const x = marginX + (colIndex * (badgeWidth + 10)); // 10mm gap between columns
                const y = marginY + (rowIndex * (badgeHeight + 5)); // 5mm gap between rows

                // Draw Badge Border
                doc.setDrawColor(200);
                doc.roundedRect(x, y, badgeWidth, badgeHeight, 3, 3);

                // Generate the QR Code image data
                // We use the raw qrId here so printed cards trigger the hybrid fallback!
                const qrDataUrl = await QRCode.toDataURL(p.qrId, { margin: 1, width: 400 });

                // Inject QR Code Image
                const qrXOffset = x + (badgeWidth - qrSize) / 2;
                doc.addImage(qrDataUrl, 'PNG', qrXOffset, y + 5, qrSize, qrSize);

                // Inject Participant Name (Truncated if too long)
                doc.setFontSize(10);
                doc.setTextColor(30);
                doc.setFont("helvetica", "bold");
                const shortName = p.name.length > 18 ? p.name.substring(0, 15) + '...' : p.name;
                const textWidth = doc.getTextWidth(shortName);
                doc.text(shortName, x + (badgeWidth - textWidth) / 2, y + 52);

                // Inject ID and Category
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.setFont("helvetica", "normal");
                const subText = `${p.qrId} • ${p.category}`;
                const subTextWidth = doc.getTextWidth(subText);
                doc.text(subText, x + (badgeWidth - subTextWidth) / 2, y + 58);

                currentItem++;
            }

            doc.save('MealPass_Printable_Badges.pdf');
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
        <div className="space-y-6 animate-enter relative z-20 w-full max-w-md mx-auto mt-6 pb-6">
            
            {message && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center shadow-md ${message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-600'}`}>
                    {message.text}
                </div>
            )}

            {/* SECTION 1: GLOBAL OVERRIDES */}
            <div className="glass-dark p-6 rounded-[2rem] border border-white/10 shadow-lg">
                <h3 className="font-extrabold text-white mb-4 flex items-center gap-2">
                    <i className="ph-fill ph-sliders text-[#2A7B9B]"></i> System Overrides
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl">
                        <span className="text-xs font-bold text-slate-300 uppercase">Lock All Scanners</span>
                        <button 
                            onClick={() => handleUpdateSettings('isScannerLocked', !settings.isScannerLocked)}
                            className={`w-12 h-6 rounded-full relative transition-colors ${settings.isScannerLocked ? 'bg-red-500' : 'bg-slate-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.isScannerLocked ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    <div className="flex flex-col bg-slate-900/50 p-3 rounded-xl">
                        <span className="text-xs font-bold text-slate-300 uppercase mb-2">Force Active Meal</span>
                        <select 
                            value={settings.activeMeal}
                            onChange={(e) => handleUpdateSettings('activeMeal', e.target.value)}
                            className="bg-slate-800 text-white font-bold py-2 px-3 rounded-lg outline-none focus:ring-2 focus:ring-[#2A7B9B]"
                        >
                            <option value="Breakfast">Breakfast</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Snacks">Snacks</option>
                            <option value="Dinner">Dinner</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECTION 2: DATA OPERATIONS */}
            <div className="glass p-6 rounded-[2rem] shadow-sm">
                <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="ph-fill ph-database text-[#2480D1]"></i> Data Center
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                    <label className="relative flex flex-col items-center justify-center py-4 bg-white/50 hover:bg-white rounded-xl cursor-pointer transition-colors shadow-sm text-center border-2 border-dashed border-[#2480D1]/30 active:scale-95">
                        <i className="ph-duotone ph-file-xls text-3xl text-green-600 mb-1"></i>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Upload</span>
                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={loading} />
                    </label>

                    <button 
                        onClick={generateStatsPDF}
                        disabled={loading}
                        className="flex flex-col items-center justify-center py-4 bg-white/50 hover:bg-white rounded-xl transition-colors shadow-sm text-center border-2 border-dashed border-red-500/30 active:scale-95"
                    >
                        <i className="ph-duotone ph-chart-bar text-3xl text-red-500 mb-1"></i>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">EOD Report</span>
                    </button>

                    {/* NEW: Batch Print Button */}
                    <button 
                        onClick={generateQRPDF}
                        disabled={loading}
                        className="flex flex-col items-center justify-center py-4 bg-[#2A7B9B]/10 hover:bg-[#2A7B9B]/20 rounded-xl transition-colors shadow-sm text-center border-2 border-[#2A7B9B]/30 active:scale-95"
                    >
                        <i className="ph-duotone ph-printer text-3xl text-[#2A7B9B] mb-1"></i>
                        <span className="text-[9px] font-bold text-[#2A7B9B] uppercase">Print IDs</span>
                    </button>
                </div>
            </div>

            {/* SECTION 3: STAFF MANAGEMENT */}
            <div className="glass-dark p-6 rounded-[2rem] border border-white/10 shadow-lg">
                <h3 className="font-extrabold text-white mb-4 flex items-center gap-2">
                    <i className="ph-fill ph-shield-check text-purple-400"></i> Staff Access
                </h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar pr-1">
                    {users.map(u => (
                        <div key={u._id} className="bg-slate-900/50 p-3 rounded-xl flex items-center justify-between">
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-white truncate">{u.email}</p>
                            </div>
                            <select 
                                value={u.role}
                                onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                className={`text-[10px] font-bold uppercase rounded-lg px-2 py-1 outline-none ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : u.role === 'volunteer' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'}`}
                            >
                                <option value="pending" className="bg-slate-800 text-white">Pending</option>
                                <option value="volunteer" className="bg-slate-800 text-white">Volunteer</option>
                                <option value="admin" className="bg-slate-800 text-white">Admin</option>
                            </select>
                        </div>
                    ))}
                    {users.length === 0 && <p className="text-xs text-slate-500 text-center">No staff found.</p>}
                </div>
            </div>

        </div>
    );
};

export default CommandCenter;