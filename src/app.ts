import express from "express";
import { requireAuth, requireAdmin, AuthRequest, JWT_SECRET } from "./middleware/auth.js";
import { prisma } from "./lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();

// Increase the payload size limit for image uploads
app.use(express.json({ limit: '10mb' }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const role = email === "hasim.visione@gmail.com" ? "admin" : "teacher";

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
       return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.status !== "approved" && user.role !== "admin") {
      return res.status(403).json({ error: "Akun Anda belum disetujui. Silakan tunggu persetujuan dari Admin." });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.dbUser) return res.status(401).json({ error: "No user" });
  const { password: _, ...userWithoutPassword } = req.dbUser;
  res.json({ user: userWithoutPassword });
});

// Submit attendance (teachers & admins can do this for themselves)
app.post("/api/attendance", requireAuth, async (req: AuthRequest, res) => {
  if (!req.dbUser) return res.status(401).json({ error: "User not in DB" });
  
  try {
    const { date, time, latitude, longitude, imageUrl, type } = req.body;
    
    const newLog = await prisma.attendanceLog.create({
      data: {
        userId: req.dbUser.id,
        date,
        time,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        type: type || 'berangkat',
        imageUrl
      }
    });
    
    res.json({ success: true, log: newLog });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Get user's own attendance
app.get("/api/attendance/me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.dbUser) return res.status(401).json({ error: "User not in DB" });
  
  try {
    const { date } = req.query;
    const whereClause: any = { userId: req.dbUser.id };
    
    if (date) {
      whereClause.date = String(date);
    }
    
    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      orderBy: { time: 'desc' } // Most recent first
    });
    
    res.json({ logs });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get daily recap (Teacher only)
app.get("/api/admin/attendance", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Auto cleanup data older than 2 months
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const deleteThreshold = twoMonthsAgo.toISOString().split('T')[0];
    await prisma.attendanceLog.deleteMany({
      where: { date: { lt: deleteThreshold } }
    });

    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.date = { gte: String(startDate), lte: String(endDate) };
    } else if (startDate) {
      whereClause.date = String(startDate);
    }

    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      include: {
        user: true
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' }
      ]
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      date: log.date,
      time: log.time,
      latitude: log.latitude,
      longitude: log.longitude,
      type: log.type,
      userId: log.user.id,
      userName: log.user.name,
      userEmail: log.user.email,
      imageUrl: log.imageUrl
    }));
    
    res.json({ logs: formattedLogs });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default app;

// User Management (Admin Only)
app.get("/api/admin/users", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const usersWithoutPassword = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    res.json({ users: usersWithoutPassword });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/users", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, password, name, role, status } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || "teacher",
        status: status || "approved"
      }
    });

    res.json({ success: true, user });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/users/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, name, password, role, status } = req.body;
    
    const data: any = { email, name, role, status };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data
    });
    
    res.json({ success: true, user });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.attendanceLog.deleteMany({ where: { userId: Number(id) } });
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk Delete Attendance
app.delete("/api/admin/attendance/bulk", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: "Missing ranges" });
    
    await prisma.attendanceLog.deleteMany({
      where: {
        date: { gte: startDate, lte: endDate }
      }
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

