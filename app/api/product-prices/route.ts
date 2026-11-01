import { NextRequest, NextResponse } from "next/server";

import { createProductPrice, listProductPrices, ProductPriceError } from "@/lib/product-prices";
import { ForbiddenError, requireAdminUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  try {
    return { userId: await requireAdminUserId() };
  } catch (error) {
    if (error instanceof ForbiddenError) return { response: NextResponse.json({ error: error.message }, { status: 403 }) };
    throw error;
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  return NextResponse.json({ prices: await listProductPrices() });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const price = await createProductPrice(
      {
        category: typeof body?.category === "string" ? body.category : "",
        shade: typeof body?.shade === "string" ? body.shade : "",
        productName: typeof body?.productName === "string" ? body.productName : "",
        unitPriceNpr: Number(body?.unitPriceNpr),
      },
      auth.userId,
    );
    return NextResponse.json({ price }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductPriceError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("POST /api/product-prices failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
