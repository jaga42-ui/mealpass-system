const express = require("express");
const router = express.Router();

// 🚀 FIX: Imported getScanHistory here!
const {
  verifyAndLogScan,
  getTodayStats,
  getScanHistory,
} = require("../controllers/scanController");
const { getSettings } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/verify", protect, verifyAndLogScan);
router.get("/stats", protect, adminOnly, getTodayStats);

// 🚀 NEW: The endpoint for your multi-page Audit Ledger PDF
router.get("/history", protect, adminOnly, getScanHistory);

// NEW: Read-only config route for the volunteer scanners
router.get("/config", protect, getSettings);

module.exports = router;
