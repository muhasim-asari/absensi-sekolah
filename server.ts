import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, requireTeacher, AuthRequest } from "./src/middleware/auth.js";
import { getOrCreateUser } from "./src/db/users.js";
import { db } from "./src/db/index.js";
import { attendanceLogs, users } from "./src/db/schema.js";
import { eq, desc } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase the payload size limit for image uploads
  app.use(express.json({ limit: '10mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Login / Sync user
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ error: "No user" });
    try {
      const user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name || "Unknown");
      res.json({ user });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Submit attendance (students & teachers can do this for themselves)
  app.post("/api/attendance", requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) return res.status(401).json({ error: "User not in DB" });
    
    try {
      const { date, time, latitude, longitude, imageUrl } = req.body;
      
      const newLog = await db.insert(attendanceLogs).values({
        userId: req.dbUser.id,
        date,
        time,
        latitude,
        longitude,
        imageUrl
      }).returning();
      
      res.json({ success: true, log: newLog[0] });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Get daily recap (Teacher only)
  app.get("/api/admin/attendance", requireAuth, requireTeacher, async (req: AuthRequest, res) => {
    try {
      const { date } = req.query; // optional filter
      let query = db.select({
        id: attendanceLogs.id,
        date: attendanceLogs.date,
        time: attendanceLogs.time,
        latitude: attendanceLogs.latitude,
        longitude: attendanceLogs.longitude,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        imageUrl: attendanceLogs.imageUrl
      })
      .from(attendanceLogs)
      .innerJoin(users, eq(attendanceLogs.userId, users.id));

      const logs = await query.orderBy(desc(attendanceLogs.date), desc(attendanceLogs.time));
      
      res.json({ logs });
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
