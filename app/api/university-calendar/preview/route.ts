import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getCalendarUser, processSyncBatch } from "@/app/(site)/profile/calendario-universita/_lib/server";
import { COURSES, availableLines, courseHasLines, unassignedSubjects, type CourseKey } from "@/app/(site)/profile/calendario-universita/_lib/types";
import { calendarPeriod, calendarRefreshOpen, calendarSeasonOpen } from "@/app/(site)/profile/calendario-universita/_lib/period";
import { cachedSourceThrough, ensureSharedSource, previewCovered, readSharedSource, WEEKEND_CACHE_UNAVAILABLE } from "@/app/(site)/profile/calendario-universita/_lib/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!(await getCalendarUser())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers: noStore });
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Richiesta non autorizzata." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  const year = Number(body?.year), course = body?.course as CourseKey;
  if (!COURSES.some((item) => item.key === course) || !Number.isInteger(year) || year < 1 || year > 6) return NextResponse.json({ error: "Scegli un corso e un anno validi." }, { status: 400 });
  if (!calendarSeasonOpen()) return NextResponse.json({ error: "Il calendario è in pausa estiva. La lettura degli orari riprenderà dal 1° settembre." }, { status: 403, headers: noStore });
  try {
    const period = calendarPeriod();
    const date = period.start;
    const parsed = new Date(`${date}T12:00:00Z`);
    const end = [period.end, new Date(parsed.getTime() + 6 * 86400000).toISOString().slice(0, 10)].sort()[0];
    const hasLines = courseHasLines(course);
    // Optional activities must be chosen from the semester before saving. The
    // shared metadata already includes every course line, across all years.
    const selectionEnd = hasLines ? period.end : end;
    if (calendarRefreshOpen()) await ensureSharedSource(course, period.start, period.end);
    let source = await readSharedSource(course, year, date, selectionEnd);
    if (!previewCovered(source, date, selectionEnd) && calendarRefreshOpen()) {
      await processSyncBatch(course);
      source = await readSharedSource(course, year, date, selectionEnd);
    }
    const cached = !calendarRefreshOpen();
    const through = cachedSourceThrough({ course, semester_start: date, semester_end: period.end }, source);
    if (cached && !through) return NextResponse.json({ error: WEEKEND_CACHE_UNAVAILABLE }, { status: 503, headers: noStore });
    if (!cached && !previewCovered(source, date, selectionEnd) && source?.sync_error) throw new Error("La lettura UniSR è stata interrotta. Riproviamo automaticamente tra qualche minuto.");
    if (!cached && !previewCovered(source, date, selectionEnd)) return NextResponse.json({ pending: true }, { status: 202, headers: { ...noStore, "Retry-After": "3" } });
    const previewEnd = cached && through && through < end ? through : end;
    const catalogueEnd = source!.ready ? period.end : through!;
    const semesterLessons = source!.events.filter((lesson) => lesson.year === year && lesson.date >= date && lesson.date <= catalogueEnd);
    const lessons = semesterLessons.filter((lesson) => lesson.date <= previewEnd);
    const lines = hasLines ? (source!.lines.length ? source!.lines : availableLines(semesterLessons)) : [];
    return NextResponse.json({ lessons, lines, subjects: hasLines ? unassignedSubjects(semesterLessons, year) : [], start: date, end: previewEnd, period, cached, cachedThrough: source!.ready ? null : through, last_synced_at: source!.last_synced_at }, { headers: noStore });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile leggere gli orari UniSR." }, { status: 502, headers: { "Cache-Control": "private, no-store" } }); }
}
