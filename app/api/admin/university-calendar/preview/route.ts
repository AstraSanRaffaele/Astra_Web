import type { NextRequest } from "next/server";
import { previewCalendar } from "@/lib/university-calendar/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) { return previewCalendar(request, "admin"); }
