import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Restaurant } from "../models/Restaurant";
import { RestaurantOwner } from "../models/RestaurantOwner";

const router = express.Router();

function generateSlug(source: string) {
  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, restaurantName, restaurantSlug, currency } =
      req.body as {
        email?: string;
        password?: string;
        restaurantName?: string;
        restaurantSlug?: string;
        currency?: string;
      };

    if (
      !email ||
      !email.trim() ||
      !password ||
      password.length < 8 ||
      !restaurantName?.trim()
    ) {
      return res.status(400).json({
        message:
          "Email, password (min 8 chars), and restaurant name are required",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Auth is not configured" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingOwner = await RestaurantOwner.findOne({
      email: normalizedEmail,
    }).lean();
    if (existingOwner) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const slugSource = restaurantSlug?.trim() || restaurantName;
    const slug = generateSlug(slugSource);
    if (!slug) {
      return res
        .status(400)
        .json({ message: "Valid restaurant slug is required" });
    }

    const existingRestaurant = await Restaurant.findOne({ slug }).lean();
    if (existingRestaurant) {
      return res
        .status(409)
        .json({ message: "Restaurant slug is already in use" });
    }

    const restaurantPayload: { name: string; slug: string; currency?: string } =
      {
        name: restaurantName.trim(),
        slug,
      };
    if (typeof currency === "string" && currency.trim()) {
      restaurantPayload.currency = currency.trim().toUpperCase();
    }

    const restaurant = await Restaurant.create(restaurantPayload);

    const passwordHash = await bcrypt.hash(password, 10);
    const owner = await RestaurantOwner.create({
      email: normalizedEmail,
      passwordHash,
      restaurantId: restaurant._id,
    });

    const token = jwt.sign(
      {
        ownerId: owner._id.toString(),
        restaurantId: restaurant._id.toString(),
      },
      jwtSecret,
      { expiresIn: "12h" },
    );

    return res.status(201).json({
      token,
      owner: { email: owner.email },
      restaurant,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to register restaurant owner" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !email.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Auth is not configured" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const owner = await RestaurantOwner.findOne({ email: normalizedEmail });
    if (!owner) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordValid = await bcrypt.compare(password, owner.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const restaurant = await Restaurant.findById(owner.restaurantId).lean();
    if (!restaurant) {
      return res
        .status(500)
        .json({ message: "Associated restaurant not found" });
    }

    const token = jwt.sign(
      {
        ownerId: owner._id.toString(),
        restaurantId: owner.restaurantId.toString(),
      },
      jwtSecret,
      { expiresIn: "12h" },
    );

    return res.json({
      token,
      owner: { email: owner.email },
      restaurant,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to log in" });
  }
});

router.get("/auth/me", async (req, res) => {
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

    const restaurant = await Restaurant.findById(decoded.restaurantId).lean();
    if (!restaurant) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.json({
      owner: { email: owner.email },
      restaurant,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(401).json({ message: "Unauthorized" });
  }
});

// Super-admin login: env-based (SUPER_ADMIN_EMAILS + SUPER_ADMIN_PASSWORD)
router.post("/auth/super-admin/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !email.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    const allowedEmails = process.env.SUPER_ADMIN_EMAILS;
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!jwtSecret || !allowedEmails || expectedPassword === undefined) {
      return res
        .status(500)
        .json({ message: "Super-admin auth is not configured" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emails = allowedEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.includes(normalizedEmail)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Support both bcrypt hashes (starting with $2b$) and plain-text passwords for
    // backward-compatibility. New deployments should store a bcrypt hash in
    // SUPER_ADMIN_PASSWORD (e.g. generated with: node -e "const b=require('bcrypt');b.hash('pw',12).then(console.log)").
    const isBcryptHash =
      expectedPassword.startsWith("$2b$") ||
      expectedPassword.startsWith("$2a$");
    const passwordValid = isBcryptHash
      ? await bcrypt.compare(password, expectedPassword)
      : password === expectedPassword;

    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { isSuperAdmin: true, superAdminEmail: normalizedEmail },
      jwtSecret,
      { expiresIn: "12h" },
    );

    return res.json({
      token,
      superAdmin: { email: normalizedEmail },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to log in" });
  }
});

router.get("/auth/super-admin/me", async (req, res) => {
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

    return res.json({
      superAdmin: { email: decoded.superAdminEmail },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(401).json({ message: "Unauthorized" });
  }
});

export default router;
