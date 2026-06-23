import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, requireTeacher, AuthRequest, JWT_SECRET } from "./src/middleware/auth.js";
import { prisma } from "./src/lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      
      const role = email === "hasim.visione@gmail.com" ? "teacher" : "student";

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

  // Submit attendance (students & teachers can do this for themselves)
  app.post("/api/attendance", requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) return res.status(401).json({ error: "User not in DB" });
    
    try {
      const { date, time, latitude, longitude, imageUrl } = req.body;
      
      const newLog = await prisma.attendanceLog.create({
        data: {
          userId: req.dbUser.id,
          date,
          time,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          imageUrl
        }
      });
      
      res.json({ success: true, log: newLog });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Get daily recap (Teacher only)
  app.get("/api/admin/attendance", requireAuth, requireTeacher, async (req: AuthRequest, res) => {
    try {
      const logs = await prisma.attendanceLog.findMany({
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
