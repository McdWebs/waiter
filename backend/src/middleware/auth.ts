import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RestaurantOwner } from "../models/RestaurantOwner";

export async function authenticateOwner(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.slice("Bearer ".length);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Auth is not configured" });
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      ownerId?: string;
      restaurantId?: string;
    };

    if (!decoded.ownerId || !decoded.restaurantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const owner = await RestaurantOwner.findById(decoded.ownerId).lean();
    if (!owner || owner.restaurantId.toString() !== decoded.restaurantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    (req as any).ownerRestaurantId = owner.restaurantId.toString();
    (req as any).ownerEmail = owner.email;

    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export async function authenticateSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.slice("Bearer ".length);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Auth is not configured" });
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      isSuperAdmin?: boolean;
      superAdminEmail?: string;
    };

    if (!decoded.isSuperAdmin || !decoded.superAdminEmail) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    (req as any).superAdminEmail = decoded.superAdminEmail;
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(401).json({ message: "Unauthorized" });
  }
}
