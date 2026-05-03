// app/api/book-convention/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type PaymentMethod = "contanti" | "bonifico" | "carta";

const PAYMENT_METHODS: PaymentMethod[] = ["contanti", "bonifico", "carta"];

function isPaymentMethod(value: unknown): value is PaymentMethod {
    return typeof value === "string" && PAYMENT_METHODS.includes(value as PaymentMethod);
}

function cleanBookTitles(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => String(item).trim())
        .filter(Boolean);
}

async function getSupabase() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
            },
        }
    );
}

// GET /api/book-convention
// Controlla se l'utente loggato ha già aderito
export async function GET(req: NextRequest) {
    const supabase = await getSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Non autenticato." },
            { status: 401 }
        );
    }

    const { searchParams } = new URL(req.url);
    const conventionIdParam = searchParams.get("convention_id");
    const conventionId = conventionIdParam ? Number(conventionIdParam) : null;

    if (conventionIdParam && (!conventionId || Number.isNaN(conventionId))) {
        return NextResponse.json(
            { error: "Convenzione non valida." },
            { status: 400 }
        );
    }

    let query = supabase
        .from("book_convention_adhesions")
        .select("id, convention_id, payment_method, book_titles, created_at")
        .eq("user_id", user.id);

    if (conventionId) {
        query = query.eq("convention_id", conventionId);
    }

    const { data, error } = conventionId
        ? await query.maybeSingle()
        : await query.order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        hasAdhered: conventionId ? !!data : Array.isArray(data) && data.length > 0,
        adhesion: conventionId ? data ?? null : null,
        adhesions: conventionId ? [] : data ?? [],
    });
}

// POST /api/book-convention
// Crea adesione per l'utente loggato
export async function POST(req: NextRequest) {
    const supabase = await getSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Non autenticato." },
            { status: 401 }
        );
    }

    let body: {
        convention_id?: number | string | null;
        payment_method?: unknown;
        book_titles?: unknown;
    } = {};

    try {
        body = await req.json();
    } catch {
        body = {};
    }

    const conventionId = body.convention_id ? Number(body.convention_id) : null;
    const paymentMethod = body.payment_method;
    const bookTitles = cleanBookTitles(body.book_titles);

    if (!conventionId || Number.isNaN(conventionId)) {
        return NextResponse.json(
            { error: "Convenzione non valida." },
            { status: 400 }
        );
    }

    if (!isPaymentMethod(paymentMethod)) {
        return NextResponse.json(
            { error: "Metodo di pagamento non valido." },
            { status: 400 }
        );
    }

    const { data: convention, error: conventionError } = await supabase
        .from("convenzioni")
        .select("id, convenzione_libri")
        .eq("id", conventionId)
        .maybeSingle();

    if (conventionError) {
        return NextResponse.json(
            { error: conventionError.message },
            { status: 500 }
        );
    }

    if (!convention) {
        return NextResponse.json(
            { error: "Convenzione non trovata." },
            { status: 404 }
        );
    }

    if (!convention.convenzione_libri) {
        return NextResponse.json(
            { error: "Questa convenzione non è una convenzione libri." },
            { status: 400 }
        );
    }

    const { data: existingAdhesion } = await supabase
        .from("book_convention_adhesions")
        .select("id")
        .eq("user_id", user.id)
        .eq("convention_id", conventionId)
        .maybeSingle();

    if (existingAdhesion) {
        return NextResponse.json({
            ok: true,
            hasAdhered: true,
            message: "Hai già aderito a questa convenzione libri.",
        });
    }

    const { error } = await supabase
        .from("book_convention_adhesions")
        .insert({
            user_id: user.id,
            convention_id: conventionId,
            payment_method: paymentMethod,
            book_titles: bookTitles,
        });

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json({
                ok: true,
                hasAdhered: true,
                message: "Hai già aderito a questa convenzione libri.",
            });
        }

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        hasAdhered: true,
        message: "Adesione registrata correttamente.",
    });
}