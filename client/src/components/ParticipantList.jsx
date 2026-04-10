import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api/axios";

const ParticipantList = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- SEARCH & FILTER ---
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // --- 🚀 LAZY LOADING (INFINITE SCROLL) STATE ---
  const [displayCount, setDisplayCount] = useState(20);
  const observer = useRef();

  // --- 🛡️ PAIRING SCANNER ---
  const [pairingUser, setPairingUser] = useState(null);
  const pairingUserRef = useRef(null); // 🚀 THE FIX: The synchronous memory lock
  const [isScanning, setIsScanning] = useState(false);
  const [pairResult, setPairResult] = useState(null);
  const scannerRef = useRef(null);

  // --- 🚶 WALKIN ---
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [walkinData, setWalkinData] = useState({
    name: "",
    category: "Participant",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 👑 GOD MODE (EDIT & STATUS) ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({ _id: "", name: "", category: "" });

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const response = await api.get("/participants");
      const sortedData = response.data.sort((a, b) => (a._id < b._id ? 1 : -1));
      setParticipants(sortedData);
      setError("");
    } catch (err) {
      setError("Failed to load participants.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  useEffect(() => {
    setDisplayCount(20);
  }, [searchTerm, activeFilter]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.qrId && p.qrId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter =
        activeFilter === "All" || p.category === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [participants, searchTerm, activeFilter]);

  const lastParticipantRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          displayCount < filteredParticipants.length
        ) {
          setDisplayCount((prev) => prev + 20);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, displayCount, filteredParticipants.length],
  );

  const openPairingModal = (user) => {
    setPairingUser(user);
    pairingUserRef.current = user; // 🚀 Instantly save the user in memory
    setPairResult(null);
    setTimeout(() => {
      startCamera();
    }, 150);
  };

  const startCamera = async () => {
    setIsScanning(true);
    try {
      scannerRef.current = new Html5Qrcode("pair-reader");
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 15 },
        onScanSuccess,
        () => {},
      );
    } catch (err) {
      console.error("Camera Error:", err);
      setPairResult({
        type: "error",
        title: "Camera Error",
        message: "Could not access the camera.",
      });
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Stop error", err);
      }
    }
    setIsScanning(false);
    scannerRef.current = null;
    setPairingUser(null);
    pairingUserRef.current = null; // 🚀 Clear the memory
    setPairResult(null);
  };

  const onScanSuccess = async (decodedText) => {
    if (scannerRef.current) scannerRef.current.pause();
    try {
      const response = await api.post("/admin/pair-badge", {
        participantId: pairingUserRef.current._id, // 🚀 Pulling directly from the synchronous ref
        qrString: decodedText.trim(),
      });
      setPairResult({
        type: "success",
        title: "BADGE LINKED",
        message: response.data.message,
      });
      fetchParticipants();
    } catch (error) {
      setPairResult({
        type: "error",
        title: "CONNECTION FAILED",
        message: `Error: ${error.message}. Server said: ${error.response?.data?.message || "Nothing (Blocked)"}`,
      });
    }
  };

  const handleNextAction = () => {
    if (pairResult?.type === "success") stopCamera();
    else {
      setPairResult(null);
      if (scannerRef.current) scannerRef.current.resume();
    }
  };

  const handleWalkinAction = async (action = "link") => {
    if (!walkinData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post("/admin/bulk-upload", [walkinData]);
      const freshRes = await api.get("/participants");
      const sortedList = freshRes.data.sort((a, b) => (a._id < b._id ? 1 : -1));

      setParticipants(sortedList);
      setSearchTerm("");
      setActiveFilter("All");
      setIsWalkinOpen(false);

      if (action === "link") {
        const newUser = sortedList.find(
          (p) => p.name === walkinData.name.trim() && !p.qrId,
        );
        if (newUser) setTimeout(() => openPairingModal(newUser), 300);
        else alert("User added! Please click 'Link' from the roster list.");
      }
      setWalkinData({ name: "", category: "Participant" });
    } catch (err) {
      alert("Failed to register walk-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await api.delete(`/admin/participants/${id}`);
      fetchParticipants();
    } catch (err) {
      alert("Failed to delete participant.");
    }
  };

  const handleUnlink = async (id) => {
    if (!window.confirm("Unlink this badge?")) return;
    try {
      await api.put(`/admin/participants/${id}`, { qrId: null });
      fetchParticipants();
    } catch (err) {
      alert("Failed to unlink badge.");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.put(`/admin/participants/${id}`, {
        isApproved: !currentStatus,
      });
      fetchParticipants();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const openEditModal = (user) => {
    setEditData({ _id: user._id, name: user.name, category: user.category });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/admin/participants/${editData._id}`, {
        name: editData.name,
        category: editData.category,
      });
      setIsEditOpen(false);
      fetchParticipants();
    } catch (err) {
      alert("Failed to update participant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && participants.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-pulse">
        <div className="w-12 h-12 border-4 border-stone-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
          Loading Check-in Desk...
        </p>
      </div>
    );

  const categories = ["All", "Participant", "Volunteer", "Guest"];

  return (
    <>
      <div className="flex flex-col h-full w-full max-w-md mx-auto pb-24 relative z-20 animate-enter">
        {/* 🌿 ORGANIC GLASS HEADER */}
        <div className="sticky top-16 z-30 pt-2 pb-5 bg-stone-950/90 backdrop-blur-2xl mx-[-1rem] px-4 shadow-xl border-b border-stone-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-stone-100 text-xl flex items-center gap-3 tracking-wide">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                <i className="ph-fill ph-users-three text-emerald-500 text-xl"></i>
              </div>
              Check-in Desk
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsWalkinOpen(true)}
                className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-900/50"
              >
                <i className="ph-bold ph-plus text-lg"></i>
              </button>
              <button
                onClick={fetchParticipants}
                className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 text-emerald-500 hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center"
              >
                <i className="ph-bold ph-arrows-clockwise text-lg"></i>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4 group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <i className="ph-bold ph-magnifying-glass text-stone-500 text-lg group-focus-within:text-emerald-500 transition-colors"></i>
            </div>
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-2xl py-3.5 pl-12 pr-4 text-stone-200 font-medium placeholder-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 border ${
                  activeFilter === cat
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/30"
                    : "bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 📜 LIST AREA */}
        <div className="mt-6 space-y-3 px-1">
          <div className="flex justify-between items-center mb-3 px-1">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              Displaying {Math.min(displayCount, filteredParticipants.length)}{" "}
              of {filteredParticipants.length}
            </span>
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="bg-stone-900/50 py-12 rounded-[2rem] text-center text-stone-600 font-medium border border-stone-800/50">
              <i className="ph-duotone ph-ghost text-5xl mb-3 opacity-50"></i>
              <p className="text-[10px] uppercase tracking-[0.2em]">
                No records found.
              </p>
            </div>
          ) : (
            filteredParticipants.slice(0, displayCount).map((p, index) => {
              const isLastElement = index === displayCount - 1;

              return (
                <div
                  key={p._id}
                  ref={isLastElement ? lastParticipantRef : null}
                  className="group bg-stone-900 rounded-[1.5rem] border border-stone-800 overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:bg-stone-800/80 relative shadow-sm"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${p.qrId ? "bg-emerald-500" : "bg-amber-500"}`}
                  ></div>

                  <div className="p-4 pl-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-3">
                        <h4 className="font-bold text-stone-200 text-base tracking-wide leading-tight mb-1 truncate">
                          {p.name}
                        </h4>

                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${
                              p.category === "Volunteer"
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                : p.category === "Guest"
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            }`}
                          >
                            {p.category}
                          </span>

                          {p.qrId ? (
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-950 border border-stone-800 px-2 py-1 rounded-md flex items-center gap-1">
                              <i className="ph-bold ph-check-circle text-emerald-500"></i>{" "}
                              {p.qrId.split("-")[0]}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                              <i className="ph-bold ph-warning"></i> No Badge
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(p._id, p.isApproved)}
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all border ${p.isApproved ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-stone-950 text-stone-600 border-stone-800"}`}
                      >
                        <i
                          className={`ph-fill text-xl ${p.isApproved ? "ph-check-circle" : "ph-circle"}`}
                        ></i>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-stone-800/50">
                      {p.qrId ? (
                        <button
                          onClick={() => handleUnlink(p._id)}
                          className="py-2.5 bg-stone-950 rounded-xl text-[9px] font-bold uppercase text-stone-500 hover:text-amber-500 hover:bg-stone-900 transition-all flex items-center justify-center gap-1.5 border border-stone-800"
                        >
                          <i className="ph-bold ph-link-break text-sm"></i>{" "}
                          Unlink
                        </button>
                      ) : (
                        <button
                          onClick={() => openPairingModal(p)}
                          className="py-2.5 bg-emerald-600/10 rounded-xl text-[9px] font-bold uppercase text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1.5 border border-emerald-500/20 active:scale-95"
                        >
                          <i className="ph-bold ph-qr-code text-sm"></i> Link
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(p)}
                        className="py-2.5 bg-stone-950 rounded-xl text-[9px] font-bold uppercase text-stone-500 hover:text-blue-400 hover:bg-stone-900 transition-all flex items-center justify-center gap-1.5 border border-stone-800"
                      >
                        <i className="ph-bold ph-pencil-simple text-sm"></i>{" "}
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p._id, p.name)}
                        className="py-2.5 bg-stone-950 rounded-xl text-[9px] font-bold uppercase text-stone-500 hover:text-rose-500 hover:bg-stone-900 transition-all flex items-center justify-center gap-1.5 border border-stone-800"
                      >
                        <i className="ph-bold ph-trash text-sm"></i> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {displayCount < filteredParticipants.length && (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-stone-800 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* 🛡️ PAIRING CAMERA MODAL */}
      {pairingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/95 backdrop-blur-xl p-6">
          <div className="w-full max-w-sm flex flex-col items-center animate-enter">
            <div className="text-center mb-8 z-10">
              <h2 className="text-2xl font-black text-stone-100 tracking-widest">
                ASSIGN BADGE
              </h2>
              <p className="text-emerald-500 font-bold uppercase tracking-widest mt-2 text-[10px] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block">
                {pairingUser.name}
              </p>
            </div>

            <div className="relative w-full max-w-[280px] aspect-square bg-stone-900 rounded-[2rem] overflow-hidden border border-emerald-500/30 shadow-2xl z-10">
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500 pointer-events-none z-10 rounded-tl-lg"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500 pointer-events-none z-10 rounded-tr-lg"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500 pointer-events-none z-10 rounded-bl-lg"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500 pointer-events-none z-10 rounded-br-lg"></div>
              <div
                id="pair-reader"
                className="w-full h-full object-cover"
              ></div>
            </div>

            <button
              onClick={stopCamera}
              className="mt-10 px-8 py-4 bg-stone-900 text-stone-400 hover:text-stone-200 font-bold uppercase tracking-widest text-[10px] rounded-2xl hover:bg-stone-800 transition-all z-10 border border-stone-800"
            >
              Cancel Scanning
            </button>

            {pairResult && (
              <div className="absolute inset-0 z-[110] flex items-center justify-center bg-stone-950/90 p-6 animate-enter">
                <div
                  className={`bg-stone-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border ${pairResult.type === "success" ? "border-emerald-500/50" : "border-rose-500/50"}`}
                >
                  <div className="p-8 text-center">
                    <div
                      className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-4 ${pairResult.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"}`}
                    >
                      <i
                        className={`ph-fill text-4xl ${pairResult.type === "success" ? "ph-check" : "ph-x"}`}
                      ></i>
                    </div>
                    <h3
                      className={`text-xl font-black tracking-widest ${pairResult.type === "success" ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {pairResult.title}
                    </h3>
                    <p className="text-[10px] font-medium mt-3 text-stone-400 uppercase tracking-widest leading-relaxed">
                      {pairResult.message}
                    </p>
                  </div>
                  <div className="p-4 bg-stone-950/50">
                    <button
                      onClick={handleNextAction}
                      className={`w-full py-4 text-white font-bold tracking-widest uppercase text-[10px] rounded-2xl active:scale-95 transition-all ${pairResult.type === "success" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"}`}
                    >
                      {pairResult.type === "success" ? "Complete" : "Try Again"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🚶 WALK-IN & ✏️ EDIT MODALS */}
      {(isWalkinOpen || isEditOpen) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-stone-950/90 backdrop-blur-xl p-6">
          <div className="w-full max-w-sm bg-stone-900 rounded-[2.5rem] border border-stone-800 p-8 shadow-2xl animate-enter relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 w-full h-1 ${isWalkinOpen ? "bg-emerald-500" : "bg-blue-500"}`}
            ></div>

            <h3 className="text-xl font-black text-stone-100 mb-6 flex items-center gap-3 tracking-widest uppercase">
              <i
                className={`ph-fill text-2xl ${isWalkinOpen ? "ph-user-plus text-emerald-500" : "ph-pencil-line text-blue-500"}`}
              ></i>
              {isWalkinOpen ? "Walk-in" : "Edit Record"}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                isWalkinOpen ? handleWalkinAction("link") : handleEditSubmit(e);
              }}
              className="space-y-5"
            >
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-500 ml-1 tracking-widest mb-1.5 block">
                  Full Name
                </label>
                <input
                  required
                  value={isWalkinOpen ? walkinData.name : editData.name}
                  onChange={(e) =>
                    isWalkinOpen
                      ? setWalkinData({ ...walkinData, name: e.target.value })
                      : setEditData({ ...editData, name: e.target.value })
                  }
                  className="w-full bg-stone-950/50 border border-stone-800 rounded-2xl py-4 px-5 text-stone-200 font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="Enter name..."
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-500 ml-1 tracking-widest mb-1.5 block">
                  Category
                </label>
                <select
                  value={isWalkinOpen ? walkinData.category : editData.category}
                  onChange={(e) =>
                    isWalkinOpen
                      ? setWalkinData({
                          ...walkinData,
                          category: e.target.value,
                        })
                      : setEditData({ ...editData, category: e.target.value })
                  }
                  className="w-full bg-stone-950/50 border border-stone-800 rounded-2xl py-4 px-5 text-stone-200 font-medium focus:border-emerald-500 focus:outline-none appearance-none"
                >
                  <option value="Participant">Participant</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>

              {isWalkinOpen ? (
                <div className="flex flex-col gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !walkinData.name}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 transition-all"
                  >
                    {isSubmitting ? "Processing..." : "Add & Scan Badge"}
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWalkinOpen(false);
                        setWalkinData({ name: "", category: "Participant" });
                      }}
                      className="flex-1 py-4 bg-stone-950 text-stone-500 font-bold uppercase text-[9px] tracking-widest rounded-2xl hover:text-stone-300 transition-all border border-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWalkinAction("close")}
                      disabled={isSubmitting || !walkinData.name}
                      className="flex-1 py-4 bg-stone-800 text-emerald-500 font-bold uppercase text-[9px] tracking-widest rounded-2xl active:scale-95 transition-all"
                    >
                      Save Only
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-4 bg-stone-950 border border-stone-800 text-stone-500 hover:text-stone-300 font-bold uppercase text-[9px] tracking-widest rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-blue-600 text-white font-bold uppercase text-[9px] tracking-widest rounded-2xl active:scale-95 transition-all"
                  >
                    Save
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ParticipantList;
