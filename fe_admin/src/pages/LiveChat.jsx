import { useEffect, useRef, useState } from "react";
import {
  Search,
  Send,
  MessageCircle,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { API, getAuthHeaders, chatHistory, chatWsUrl } from "../api";
import { getAdminToken } from "../api";

export default function LiveChat() {
  // -----------------------------
  // DAFTAR NASABAH (sidebar kontak)
  // -----------------------------
  const [nasabahList, setNasabahList] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);

  // -----------------------------
  // NASABAH YANG SEDANG DIBUKA
  // -----------------------------
  const [selectedNik, setSelectedNik] = useState(null);
  const [selectedNama, setSelectedNama] = useState("");

  // -----------------------------
  // PESAN
  // -----------------------------
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [wsStatus, setWsStatus] = useState("idle"); // idle | connecting | open | closed | error

  const [error, setError] = useState("");

  const wsRef = useRef(null);

  // =========================================================
  // FETCH DAFTAR NASABAH (dengan debounce search)
  // =========================================================
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoadingList(true);
        setError("");

        const url = search.trim()
          ? API.nasabahSearch(search.trim())
          : API.nasabah;

        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil daftar nasabah.");
        }

        const result = await response.json();
        const data = Array.isArray(result) ? result : result.data || [];

        setNasabahList(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoadingList(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // =========================================================
  // BUKA CHAT: fetch riwayat (REST) + connect WebSocket
  // =========================================================
  useEffect(() => {
    if (!selectedNik) return;

    let cancelled = false;

    async function openChat() {
      setLoadingMessages(true);
      setMessages([]);
      setError("");

      // 1. Ambil riwayat chat lewat REST dulu
      try {
        const response = await fetch(chatHistory(selectedNik), {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil riwayat chat.");
        }

        const history = await response.json();

        if (!cancelled) {
          setMessages(Array.isArray(history) ? history : []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }

      // 2. Buka koneksi WebSocket untuk realtime
      const token = getAdminToken();

      if (!token) {
        setError("Sesi admin tidak ditemukan, silakan login ulang.");
        return;
      }

      setWsStatus("connecting");

      const ws = new WebSocket(chatWsUrl(selectedNik, token));
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setWsStatus("open");
      };

      ws.onmessage = (event) => {
        if (cancelled) return;

        try {
          const payload = JSON.parse(event.data);
          setMessages((prev) => [...prev, payload]);
        } catch (err) {
          console.error("Gagal parse pesan WebSocket:", err);
        }
      };

      ws.onerror = () => {
        if (!cancelled) setWsStatus("error");
      };

      ws.onclose = (event) => {
        if (cancelled) return;

        setWsStatus("closed");

        // Kode 4401 dikirim backend kalau token invalid/expired
        if (event.code === 4401) {
          setError("Sesi admin tidak valid untuk chat ini. Silakan login ulang.");
        }
      };
    }

    openChat();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
      setWsStatus("idle");
    };
  }, [selectedNik]);

  // =========================================================
  // FILTER LIST (client-side, di atas hasil search backend)
  // =========================================================
  const filteredList = nasabahList;

  // =========================================================
  // PILIH NASABAH
  // =========================================================
  function selectNasabah(nasabah) {
    setSelectedNik(nasabah.nik);
    setSelectedNama(nasabah.nama || nasabah.nik);
  }

  // =========================================================
  // KIRIM PESAN
  // =========================================================
  function sendMessage(e) {
    e.preventDefault();

    const text = messageText.trim();

    if (!text || wsStatus !== "open" || !wsRef.current) {
      return;
    }

    wsRef.current.send(JSON.stringify({ isi_pesan: text }));
    setMessageText("");
    // Tidak perlu manual push ke messages: backend selalu
    // mengirim balik payload ke pengirim lewat onmessage.
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <PageHeader title="Live Chat" />

      {/* ERROR */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-h-[650px] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">

          {/* =========================
              DAFTAR NASABAH
          ========================== */}
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 p-5">
              <h2 className="mb-4 font-['Poppins'] font-bold text-slate-800">
                Nasabah
              </h2>

              {/* SEARCH */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <Search size={17} className="shrink-0 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, NIK, atau HP..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* LIST NASABAH */}
            <div className="max-h-[500px] overflow-y-auto lg:max-h-none">
              {loadingList && (
                <div className="p-6 text-center text-sm text-slate-400">
                  Memuat daftar nasabah...
                </div>
              )}

              {!loadingList &&
                filteredList.map((nasabah) => (
                  <button
                    key={nasabah.nik}
                    type="button"
                    onClick={() => selectNasabah(nasabah)}
                    className={`w-full border-b border-slate-100 p-4 text-left transition ${
                      selectedNik === nasabah.nik
                        ? "bg-emerald-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* AVATAR */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-600">
                        {nasabah.nama?.charAt(0)?.toUpperCase() || "?"}
                      </div>

                      {/* INFO */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {nasabah.nama}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          NIK: {nasabah.nik}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

              {!loadingList && filteredList.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400">
                  Nasabah tidak ditemukan.
                </div>
              )}
            </div>
          </aside>

          {/* =========================
              DETAIL CHAT
          ========================== */}
          {selectedNik ? (
            <section className="flex min-w-0 flex-col bg-slate-50">

              {/* HEADER CHAT */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-600">
                    {selectedNama?.charAt(0)?.toUpperCase() || "?"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-800">
                      {selectedNama}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      NIK: {selectedNik} ·{" "}
                      {wsStatus === "open" && (
                        <span className="text-emerald-600">Terhubung</span>
                      )}
                      {wsStatus === "connecting" && "Menghubungkan..."}
                      {wsStatus === "closed" && "Terputus"}
                      {wsStatus === "error" && (
                        <span className="text-red-500">Gagal terhubung</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* =========================
                  ISI PERCAKAPAN
              ========================== */}
              <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
                {loadingMessages && (
                  <div className="text-center text-sm text-slate-400">
                    Memuat pesan...
                  </div>
                )}

                {!loadingMessages &&
                  messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex ${
                        msg.sender_type === "admin"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-md ${
                          msg.sender_type === "admin"
                            ? "rounded-br-sm bg-emerald-600 text-white"
                            : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        <p className="break-words text-sm leading-5">
                          {msg.isi_pesan}
                        </p>

                        <p
                          className={`mt-2 text-right text-xs ${
                            msg.sender_type === "admin"
                              ? "text-emerald-100"
                              : "text-slate-400"
                          }`}
                        >
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ))}

                {!loadingMessages && messages.length === 0 && (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Belum ada pesan.
                  </div>
                )}
              </div>

              {/* =========================
                  INPUT BALASAN
              ========================== */}
              <form
                onSubmit={sendMessage}
                className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white p-4 sm:px-7 sm:py-5"
              >
                <MessageCircle
                  size={20}
                  className="hidden shrink-0 text-slate-400 sm:block"
                />

                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Ketik balasan pesan di sini..."
                  disabled={wsStatus !== "open"}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={wsStatus !== "open" || !messageText.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Send size={18} />
                </button>
              </form>
            </section>
          ) : (
            <section className="flex min-w-0 items-center justify-center bg-slate-50 p-10">
              <div className="text-center">
                <MessageCircle
                  size={40}
                  className="mx-auto mb-3 text-slate-300"
                />

                <p className="text-sm font-semibold text-slate-500">
                  Pilih nasabah
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Pilih nasabah di sebelah kiri untuk memulai percakapan.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
