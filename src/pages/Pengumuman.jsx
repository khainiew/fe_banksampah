import { useEffect, useState } from "react";
import {
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { API, getAuthHeaders } from "../api";

export default function Pengumuman() {
  const [rows, setRows] = useState([]);

  const [form, setForm] = useState({
    judul: "",
    isi: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // GET DATA PENGUMUMAN
  // =========================================================
  async function fetchAnnouncements() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API.pengumuman, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data pengumuman.");
      }

      const result = await response.json();

      /*
        Diasumsikan response backend:

        [
          {
            id: 1,
            judul: "...",
            isi: "...",
            tanggal: "2026-05-14",
            jam: "09:00",
            status: "Aktif"
          }
        ]

        Kalau backend membungkus data:
        {
          data: [...]
        }

        maka gunakan:
        setRows(result.data || []);
      */

      setRows(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Ambil data saat halaman pertama kali dibuka
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // =========================================================
  // POST DRAFT + PUT PUBLISH
  // =========================================================
  async function publish(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      // Endpoint PDF: POST /pengumuman/create dengan status draft.
      const createResponse = await fetch(API.pengumumanCreate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          judul: form.judul,
          isi: form.isi,
          status: "draft",
        }),
      });

      const createdResult = await createResponse
        .json()
        .catch(() => ({}));

      if (!createResponse.ok) {
        throw new Error(
          createdResult.message ||
            "Gagal membuat draft pengumuman."
        );
      }

      const created = createdResult.data || createdResult;
      const id =
        created.id ??
        created.id_pengumuman ??
        created.pengumuman_id;

      if (!id) {
        throw new Error(
          "Draft berhasil dibuat, tetapi ID pengumuman tidak ditemukan."
        );
      }

      // Endpoint PDF: PUT /pengumuman/{id} untuk publish.
      const publishResponse = await fetch(
        API.pengumumanDetail(id),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );

      const publishResult = await publishResponse
        .json()
        .catch(() => ({}));

      if (!publishResponse.ok) {
        throw new Error(
          publishResult.message ||
            "Draft berhasil dibuat, tetapi gagal dipublish."
        );
      }

      setForm({
        judul: "",
        isi: "",
      });

      await fetchAnnouncements();

      alert("Pengumuman berhasil diterbitkan.");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE - HAPUS PENGUMUMAN
  // =========================================================
  async function deleteAnnouncement(id) {
    const yakin = window.confirm(
      "Apakah kamu yakin ingin menghapus pengumuman ini?"
    );

    if (!yakin) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/pengumuman/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Gagal menghapus pengumuman."
        );
      }

      await fetchAnnouncements();

      alert("Pengumuman berhasil dihapus.");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <PageHeader title="Pengumuman Sistem" />

      {/* ERROR */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* BUAT PENGUMUMAN */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Plus
            size={18}
            className="shrink-0 text-slate-800"
          />

          <h2 className="font-['Poppins'] text-sm font-bold text-slate-800">
            Buat Pengumuman Baru
          </h2>
        </div>

        <form
          onSubmit={publish}
          className="space-y-4"
        >
          <input
            required
            type="text"
            placeholder="Judul Pengumuman..."
            value={form.judul}
            onChange={(e) =>
              setForm({
                ...form,
                judul: e.target.value,
              })
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
          />

          <textarea
            required
            rows={3}
            placeholder="Tulis isi pesan pengumuman di sini..."
            value={form.isi}
            onChange={(e) =>
              setForm({
                ...form,
                isi: e.target.value,
              })
            }
            className="w-full min-w-0 resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
          />

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />

              <span>
                {saving
                  ? "Menyimpan..."
                  : "Terbitkan Sekarang"}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* DAFTAR PENGUMUMAN */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">
                  Judul & Isi Pengumuman
                </th>

                <th className="px-6 py-4">
                  Tanggal Rilis
                </th>

                <th className="px-6 py-4">
                  Status
                </th>

                <th className="px-6 py-4">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}
              {loading && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    Memuat data pengumuman...
                  </td>
                </tr>
              )}

              {/* DATA */}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100"
                  >
                    {/* JUDUL & ISI */}
                    <td className="max-w-xl px-6 py-5">
                      <p className="break-words text-sm font-bold text-emerald-900">
                        {row.judul}
                      </p>

                      <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                        {row.isi}
                      </p>
                    </td>

                    {/* TANGGAL */}
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-slate-800">
                        {row.tanggal || "-"}
                      </p>

                      <p className="text-xs text-slate-400">
                        {row.jam || "-"}
                      </p>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-5">
                      <StatusBadge>
                        {row.status || "Aktif"}
                      </StatusBadge>
                    </td>

                    {/* AKSI */}
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">


                        <button
                          type="button"
                          onClick={() =>
                            deleteAnnouncement(row.id)
                          }
                          disabled={saving}
                          title="Hapus Pengumuman"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {/* DATA KOSONG */}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    Belum ada pengumuman.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>


    </div>
  );
}
