import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import type { ExpenseItem, ProjectConfig } from "@/app/lib/types";

interface SyncPayload {
  projectId?: string;
  project?: ProjectConfig;
  expenses?: ExpenseItem[];
  deletedIds?: string[];
  deleteProject?: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "default";

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        expenses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({
        exists: false,
        projectId,
        project: null,
        expenses: [],
      });
    }

    return NextResponse.json({
      exists: true,
      projectId: project.id,
      project: {
        name: project.name,
        budget: project.budget,
      },
      expenses: project.expenses.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        kind: e.kind,
        quantity: e.quantity,
        unit: e.unit,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        paymentOwner: e.paymentOwner ?? undefined,
        status: e.status,
        date: e.date,
        note: e.note ?? undefined,
      })),
    });
  } catch (error) {
    console.error("GET /api/sync error:", error);
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncPayload;
    const projectId = body.projectId || "default";

    if (body.deleteProject) {
      await prisma.project.deleteMany({
        where: { id: projectId },
      });
      return NextResponse.json({
        ok: true,
        syncedAt: new Date().toISOString(),
      });
    }

    const project = body.project;
    const expenses = Array.isArray(body.expenses) ? body.expenses : [];
    const deletedIds = Array.isArray(body.deletedIds) ? body.deletedIds : [];

    if (!project || typeof project.name !== "string") {
      return NextResponse.json(
        { error: "Invalid project payload" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.upsert({
        where: { id: projectId },
        update: {
          name: project.name,
          budget: project.budget ?? null,
        },
        create: {
          id: projectId,
          name: project.name,
          budget: project.budget ?? null,
        },
      });

      if (deletedIds.length > 0) {
        await tx.expense.deleteMany({
          where: {
            id: { in: deletedIds },
            projectId,
          },
        });
      }

      for (const item of expenses) {
        await tx.expense.upsert({
          where: { id: item.id },
          update: {
            projectId,
            name: item.name,
            category: item.category,
            kind: item.kind,
            quantity: item.quantity ?? null,
            unit: item.unit,
            amount: item.amount,
            paymentMethod: item.paymentMethod ?? "",
            paymentOwner: item.paymentOwner ?? null,
            status: item.status,
            date: item.date,
            note: item.note ?? null,
          },
          create: {
            id: item.id,
            projectId,
            name: item.name,
            category: item.category,
            kind: item.kind,
            quantity: item.quantity ?? null,
            unit: item.unit,
            amount: item.amount,
            paymentMethod: item.paymentMethod ?? "",
            paymentOwner: item.paymentOwner ?? null,
            status: item.status,
            date: item.date,
            note: item.note ?? null,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      projectId,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
