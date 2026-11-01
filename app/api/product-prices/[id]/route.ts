import { NextRequest, NextResponse } from "next/server";

import { ProductPriceError, updateProductPrice } from "@/lib/product-prices";
import { ForbiddenError, requireAdminUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function parseId(idText: string): number | null {
  const id = Number(idText);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let updatedBy: string;
  try {
    updatedBy = await requireAdminUserId();
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const { id: idText } = await params;
  const id = parseId(idText);
  if (id === null) return NextResponse.json({ error: "Invalid product price id." }, { status: 400 });

  try {
    const body = await req.json();
    const price = await updateProductPrice(
      id,
      {
        productName: typeof body?.productName === "string" ? body.productName : "",
        unitPriceNpr: Number(body?.unitPriceNpr),
      },
      updatedBy,
    );
    return NextResponse.json({ price });
  } catch (error) {
    if (error instanceof ProductPriceError) {
      const status = error.message === "Product price not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("PATCH /api/product-prices/[id] failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
