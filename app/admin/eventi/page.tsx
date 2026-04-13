"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminEventi() {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [title, setTitle] = useState("");

  async function load() {
    const { data } = await supabase.from("events").select("*");
    setEvents(data || []);
  }

  useEffect(() => { load(); }, []);

  async function createEvent() {
    await supabase.from("events").insert({ title, event_date: new Date() });
    setTitle("");
    load();
  }

  async function deleteEvent(id: string) {
    await supabase.from("events").delete().eq("id", id);
    load();
  }

  return (
    <div style={{ padding: "8rem 1.5rem" }}>
      <h1>Admin Eventi</h1>

      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo evento" />
      <button onClick={createEvent}>Crea</button>

      {events.map(e => (
        <div key={e.id}>
          {e.title}
          <button onClick={() => deleteEvent(e.id)}>Elimina</button>
        </div>
      ))}
    </div>
  );
}