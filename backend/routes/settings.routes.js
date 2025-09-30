import { Router } from "express";
import DatabaseManager from "../db-utils.js";
import { authenticateToken } from "../middleware/auth.js";

const settingsRouter = Router();

settingsRouter.get("/integration", authenticateToken, async (req, res) => {
  const dbManager = new DatabaseManager();

  try {
    await dbManager.connect();
    const settings = await dbManager.getUserIntegration(req.userId);

    res.json({
      settings: settings ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch integration settings", error.message);
    res.status(500).json({
      error: "Failed to load integration settings.",
      details: error.message,
    });
  } finally {
    await dbManager.disconnect();
  }
});

settingsRouter.put("/integration", authenticateToken, async (req, res) => {
  const {
    geminiApiKey,
    geminiModel,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
  } = req.body || {};

  if (!geminiApiKey && !smtpUser && !smtpPass) {
    return res.status(400).json({
      error: "Please provide at least one credential to update.",
    });
  }

  const dbManager = new DatabaseManager();

  try {
    await dbManager.connect();
    const updated = await dbManager.upsertUserIntegration(req.userId, {
      geminiApiKey,
      geminiModel,
      smtpUser,
      smtpPass,
      smtpHost,
      smtpPort,
    });

    res.json({
      settings: updated,
      message: "Integration settings saved successfully.",
    });
  } catch (error) {
    console.error("Failed to update integration settings", error.message);
    res.status(500).json({
      error: "Failed to save integration settings.",
      details: error.message,
    });
  } finally {
    await dbManager.disconnect();
  }
});

// Get user profile information
settingsRouter.get("/profile", authenticateToken, async (req, res) => {
  const dbManager = new DatabaseManager();

  try {
    await dbManager.connect();
    const user = await dbManager.prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        street: true,
        postalCode: true,
        city: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      profile: user,
    });
  } catch (error) {
    console.error("Failed to fetch user profile", error.message);
    res.status(500).json({
      error: "Failed to load user profile.",
      details: error.message,
    });
  } finally {
    await dbManager.disconnect();
  }
});

// Update user profile information
settingsRouter.put("/profile", authenticateToken, async (req, res) => {
  const {
    firstName,
    lastName,
    street,
    postalCode,
    city,
    phone,
  } = req.body || {};

  const dbManager = new DatabaseManager();

  try {
    await dbManager.connect();
    
    // Prepare update data (only include non-undefined values)
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (street !== undefined) updateData.street = street;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (city !== undefined) updateData.city = city;
    if (phone !== undefined) updateData.phone = phone;
    
    // Update name field if firstName or lastName changed
    if (firstName !== undefined || lastName !== undefined) {
      const currentUser = await dbManager.prisma.user.findUnique({
        where: { id: req.userId },
        select: { firstName: true, lastName: true },
      });
      
      const newFirstName = firstName !== undefined ? firstName : currentUser.firstName;
      const newLastName = lastName !== undefined ? lastName : currentUser.lastName;
      updateData.name = `${newFirstName} ${newLastName}`;
    }

    const updatedUser = await dbManager.prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        street: true,
        postalCode: true,
        city: true,
        phone: true,
      },
    });

    res.json({
      profile: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.error("Failed to update user profile", error.message);
    res.status(500).json({
      error: "Failed to save user profile.",
      details: error.message,
    });
  } finally {
    await dbManager.disconnect();
  }
});

export default settingsRouter;
