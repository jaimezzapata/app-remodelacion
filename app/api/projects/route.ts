import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        expenses: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    const list = projects.map((p) => {
      const totalSpent = p.expenses.reduce(
        (sum, e) => sum + (e.status === "pagado" ? e.amount : 0),
        0
      );
      return {
        id: p.id,
        name: p.name,
        budget: p.budget,
        expenseCount: p.expenses.length,
        totalSpent,
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ projects: list });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 500 }
    );
  }
}
