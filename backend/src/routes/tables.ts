import express from "express";
import { Types } from "mongoose";
import { Table } from "../models/Table";
import { TableMerge } from "../models/TableMerge";

const router = express.Router();

router.get("/restaurants/:restaurantId/tables", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status } = req.query as { status?: string };

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurantId" });
    }

    const match: Record<string, unknown> = {
      restaurantId: new Types.ObjectId(restaurantId),
    };

    if (status && ["active", "inactive"].includes(status)) {
      match.status = status;
    }

    const tables = await Table.find(match).sort({ name: 1 }).lean();

    return res.json(
      tables.map((table) => ({
        _id: table._id,
        restaurantId: table.restaurantId,
        name: table.name,
        number: table.number,
        status: table.status,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load tables" });
  }
});

router.post("/restaurants/:restaurantId/tables", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { number, name } = req.body as { number?: string; name?: string };

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurantId" });
    }

    const trimmedNumber = (number ?? "").trim();
    const trimmedName = (name ?? "").trim();

    if (!trimmedNumber) {
      return res.status(400).json({ message: "Table number is required" });
    }

    const existing = await Table.findOne({
      restaurantId: new Types.ObjectId(restaurantId),
      number: trimmedNumber,
    }).lean();

    if (existing) {
      return res
        .status(409)
        .json({ message: "Table number already exists for this restaurant" });
    }

    const table = await Table.create({
      restaurantId: new Types.ObjectId(restaurantId),
      number: trimmedNumber,
      name: trimmedName || `Table ${trimmedNumber}`,
      status: "active",
    });

    return res.status(201).json({
      _id: table._id,
      restaurantId: table.restaurantId,
      name: table.name,
      number: table.number,
      status: table.status,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create table" });
  }
});

router.post("/restaurants/:restaurantId/merged-tables", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { tables } = req.body as { tables?: string[] };

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurantId" });
    }

    const rid = new Types.ObjectId(restaurantId);
    const uniqueTables = Array.from(
      new Set(
        (tables ?? []).map((t) => (t ?? "").trim()).filter((t) => t.length > 0),
      ),
    );

    // Always clear previous merges that involve any of these tables
    if (uniqueTables.length > 0) {
      await TableMerge.updateMany(
        {
          restaurantId: rid,
          active: true,
          tables: { $in: uniqueTables },
        },
        { $set: { active: false } },
      );
    }

    // If fewer than 2 tables are provided, treat this as "unmerge" and return early
    if (uniqueTables.length < 2) {
      return res.status(200).json({ merged: null });
    }

    const merge = await TableMerge.create({
      restaurantId: rid,
      tables: uniqueTables,
      active: true,
    });

    return res.status(201).json({
      _id: merge._id,
      restaurantId: merge.restaurantId,
      tables: merge.tables,
      active: merge.active,
      createdAt: merge.createdAt,
      updatedAt: merge.updatedAt,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to merge tables" });
  }
});

router.get("/restaurants/:restaurantId/merged-tables", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { tableNumber } = req.query as { tableNumber?: string };

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurantId" });
    }
    const trimmedTable = (tableNumber ?? "").trim();
    if (!trimmedTable) {
      return res.status(400).json({ message: "tableNumber is required" });
    }

    const rid = new Types.ObjectId(restaurantId);
    const merge = await TableMerge.findOne({
      restaurantId: rid,
      active: true,
      tables: trimmedTable,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!merge) {
      return res.status(200).json({ merged: null });
    }

    return res.json({
      merged: {
        _id: merge._id,
        restaurantId: merge.restaurantId,
        tables: merge.tables,
        active: merge.active,
        createdAt: merge.createdAt,
        updatedAt: merge.updatedAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load merged tables" });
  }
});

export default router;
