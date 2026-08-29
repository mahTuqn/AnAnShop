import { Router } from "express";
import { ok, fail } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Mock GHN/GHTK Calculate Fee API
router.post("/calculate-fee", async (req, res) => {
  try {
    const { to_province, to_district, weight_grams } = req.body;
    
    // Mock logic: 30k for local HCM, 45k for others, plus weight surcharge
    let baseFee = 30000;
    if (to_province && !to_province.toLowerCase().includes("hồ chí minh")) {
      baseFee = 45000;
    }
    
    // 5k extra per 500g above 1kg
    const extraWeight = Math.max(0, (weight_grams || 1000) - 1000);
    const surcharge = Math.ceil(extraWeight / 500) * 5000;
    
    ok(res, {
      provider: "GHN",
      fee: baseFee + surcharge,
      estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
});

// Mock Create Order API
router.post("/create-order", requireAuth, async (req, res) => {
  try {
    const { order_id, address_details } = req.body;
    // In a real app, this sends data to GHN and gets a tracking code
    const trackingCode = "GHN" + Math.random().toString().slice(2, 10);
    ok(res, {
      tracking_code: trackingCode,
      status: "ready_to_pick",
      order_id
    });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
});

export default router;
