import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { User } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: Partial<User>;
  dbUser?: User;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await prisma.user.findUnique({
      where: { email: decodedToken.email }
    });
    
    if (user) {
       req.dbUser = user;
       req.user = user;
    } else {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    next();
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireTeacher = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  if (!req.dbUser || req.dbUser.role !== 'teacher') {
    return res.status(403).json({ error: 'Forbidden: Teachers only' });
  }
  next();
};
