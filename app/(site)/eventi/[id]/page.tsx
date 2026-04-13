"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EventPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      setEvent(data);
    }
    load();
  }, [id]);

  if (!event) return <p>Loading...</p>;

  return (
    <div style={{ padding: "8rem 1.5rem", maxWidth: 800, margin: "0 auto" }}>
      <h1>{event.title}</h1>
      <p>{new Date(event.event_date).toLocaleString()}</p>
      <p>{event.description}</p>
    </div>
  );
}