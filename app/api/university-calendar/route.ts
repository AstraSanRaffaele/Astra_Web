import type { NextRequest } from "next/server";
import { listCalendars, mutateCalendar } from "@/lib/university-calendar/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) { return listCalendars(request, "user"); }
export async function POST(request: NextRequest) { return mutateCalendar(request, "user"); }
