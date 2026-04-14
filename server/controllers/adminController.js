const Participant = require("../models/Participant");
const User = require("../models/User");
const Settings = require("../models/Settings");
const Scan = require("../models/Scan");
const speakeasy = require("speakeasy");
const crypto = require("crypto");

// --- SYSTEM SETTINGS ---

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings." });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { activeMeal, isScannerLocked } = req.body;
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    if (activeMeal) settings.activeMeal = activeMeal;
    if (typeof isScannerLocked === "boolean")
      settings.isScannerLocked = isScannerLocked;

    await settings.save();
    res.status(200).json({ message: "System settings updated.", settings });
  } catch (error) {
    res.status(500).json({ message: "Error updating settings." });
  }
};

// --- ROSTER FETCHING (For Registration Desk) ---

exports.getAllParticipants = async (req, res) => {
  try {
    // Sort alphabetically by name to make the volunteer's search easier
    const participants = await Participant.find().sort({ name: 1 });
    res.status(200).json(participants);
  } catch (error) {
    console.error("Error fetching roster:", error);
    res.status(500).json({ message: "Error fetching participants." });
  }
};

// --- DATA MANAGEMENT ---

exports.bulkUploadParticipants = async (req, res) => {
  try {
    const participants = req.body;

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: "No data provided." });
    }

    const formattedData = participants.map((p) => {
      const rawName = p.name || p.Name;
      const rawCategory = p.category || p.Category || "Participant";
      const rawDepartment = p.department || p.Department || "N/A";
      const rawQrId = p.qrId || p.QR || p.qr;

      const standardKeys = [
        "name",
        "Name",
        "category",
        "Category",
        "department",
        "Department",
        "qrId",
        "QR",
        "qr",
      ];
      const extraData = {};

      Object.keys(p).forEach((key) => {
        if (!standardKeys.includes(key)) {
          extraData[key] = p[key];
        }
      });

      const newParticipant = {
        name: rawName || "Unknown Participant",
        category: rawCategory,
        department: rawDepartment,
        totpSecret: speakeasy.generateSecret({ length: 20 }).base32,
        metadata: extraData,
      };

      if (rawQrId && String(rawQrId).trim() !== "") {
        newParticipant.qrId = String(rawQrId).trim().toUpperCase();
      }

      return newParticipant;
    });

    const result = await Participant.insertMany(formattedData, {
      ordered: false,
    });

    res.status(201).json({
      message: `Successfully uploaded ${result.length} participants with full data.`,
      count: result.length,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(207).json({
        message: "Partial upload complete. Skipped duplicate IDs.",
        insertedCount: error.insertedDocs?.length || 0,
      });
    }
    console.error("Bulk Upload Error:", error);
    res.status(500).json({ message: "Server error during bulk upload." });
  }
};

// --- ROLE MANAGEMENT ---

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching staff data." });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found." });

    // 🛑 MASTER ADMIN PROTECTION 🛑
    if (user.email === "gurup2076@gmail.com") {
      return res.status(403).json({
        message:
          "SECURITY ALERT: Master Admin credentials cannot be modified or demoted.",
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: "Role updated successfully.", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating role." });
  }
};

// 🗑️ DELETE STAFF MEMBER 🗑️
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 🛑 MASTER ADMIN PROTECTION 🛑
    if (user.email === "gurup2076@gmail.com") {
      return res.status(403).json({
        message: "SECURITY ALERT: The Master Admin account cannot be deleted.",
      });
    }

    // 🛑 BULLETPROOF SELF-DELETION LOCK 🛑 
    // Safely checks for both _id and id, preventing the .toString() crash
    const requestingUserId = req.user?._id || req.user?.id;
    if (requestingUserId && requestingUserId.toString() === req.params.id) {
      return res.status(400).json({
        message: "Action denied: You cannot delete your own admin account.",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Staff member permanently deleted." });
  } catch (error) {
    // 🚨 CONFESSION LOG: Tells you EXACTLY what broke in the Render terminal
    console.error("Delete User CRASH LOG:", error);
    
    // 🚨 Sends the real error message to your React frontend
    res.status(500).json({ 
      message: error.message || "Error deleting staff member." 
    });
  }
};

// --- 🛡️ HMAC-SHA256 SECURE QR ENGINE 🛡️ ---

exports.generateBulkBadges = async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 50;
    const secret = (process.env.QR_SECRET || "Aahaaram_secure_vault_2026").trim();
    const badges = [];

    for (let i = 0; i < count; i++) {
      const id = crypto.randomBytes(4).toString("hex").toUpperCase();
      const signature = crypto
        .createHmac("sha256", secret)
        .update(id)
        .digest("hex")
        .substring(0, 8)
        .toUpperCase();

      badges.push(`${id}-${signature}`);
    }

    res.status(200).json({
      message: `Successfully generated ${count} secure badges.`,
      badges,
    });
  } catch (error) {
    console.error("Badge Generation Error:", error);
    res.status(500).json({ message: "Failed to generate secure badges." });
  }
};

exports.pairBadge = async (req, res) => {
  try {
    let { participantId, qrString } = req.body;
    const secret = (process.env.QR_SECRET || "Aahaaram_secure_vault_2026").trim();

    qrString = String(qrString).trim().toUpperCase();

    if (!qrString || !qrString.includes("-")) {
      return res.status(400).json({ message: "Invalid badge format." });
    }

    const [id, signature] = qrString.split("-");
    const cleanId = id.trim();
    const cleanSignature = signature.trim();

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(cleanId)
      .digest("hex")
      .substring(0, 8)
      .toUpperCase();

    if (cleanSignature !== expectedSignature) {
      console.log(
        `❌ SCAN FAILED | ID: [${cleanId}] | Scanned: [${cleanSignature}] | Expected: [${expectedSignature}]`,
      );
      return res.status(403).json({
        message: `MATH ERROR: Phone read [${cleanSignature}] but server calculated [${expectedSignature}]`,
      });
    }

    const existingUser = await Participant.findOne({ qrId: qrString });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: `Badge already assigned to ${existingUser.name}.` });
    }

    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found." });
    }

    participant.qrId = qrString;
    await participant.save();

    res.status(200).json({
      message: `Successfully paired badge to ${participant.name}.`,
      participant,
    });
  } catch (error) {
    console.error("Pairing Error:", error);
    res.status(500).json({ message: "Server error during pairing process." });
  }
};

// --- 👑 GOD MODE CONTROLS ---

exports.updateParticipant = async (req, res) => {
  try {
    const updatedUser = await Participant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true,
        runValidators: true // 👈 Forces MongoDB to strictly validate rules
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Participant not found." });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update Participant CRASH LOG:", error); 
    res.status(500).json({ 
      message: error.message || "Error updating participant." 
    });
  }
};

exports.deleteParticipant = async (req, res) => {
  try {
    const deletedUser = await Participant.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Participant not found." });
    }

    res.status(200).json({ message: "Participant deleted successfully." });
  } catch (error) {
    console.error("Delete Participant Error:", error);
    res.status(500).json({ message: "Error deleting participant." });
  }
};

// --- 🚨 SYSTEM PURGE ---

exports.purgeDatabase = async (req, res) => {
  try {
    await Participant.deleteMany({});
    await Scan.deleteMany({});
    res
      .status(200)
      .json({
        message: "SYSTEM PURGED: All data has been permanently deleted.",
      });
  } catch (error) {
    console.error("Purge Error:", error);
    res.status(500).json({ message: "Critical error during system purge." });
  }
};