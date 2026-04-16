import Head from "next/head";

export default function MaintenancePage() {
  return (
    <>
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; background: #F8F7F3; color: #08102A; overflow-x: hidden; }
        `}</style>
      </Head>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background:
            "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            background: "white",
            border: "1px solid rgba(15,47,110,0.08)",
            borderRadius: "24px",
            padding: "40px 28px",
            boxShadow: "0 20px 60px rgba(15,47,110,0.10)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 20px",
              borderRadius: "18px",
              background: "rgba(15,47,110,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
            }}
          >
            🛠️
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              lineHeight: 1.1,
              color: "#0f2f6e",
              fontWeight: 800,
            }}
          >
            Sito in manutenzione
          </h1>

          <p
            style={{
              margin: "16px 0 0",
              fontSize: "16px",
              lineHeight: 1.6,
              color: "#4b5b7a",
            }}
          >
            Stiamo aggiornando il sito per migliorare l’esperienza.
            Torna tra poco.
          </p>

          <div
            style={{
              marginTop: "24px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "999px",
              background: "#f3f7ff",
              color: "#0f2f6e",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Astra tornerà online presto
          </div>
        </div>
      </main>
    </>
  );
}