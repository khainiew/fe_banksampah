import { useEffect, useState } from 'react'
import { Eye, Search, Loader2, RefreshCw } from 'lucide-react'

import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { API, getAuthHeaders } from '../api'

// ======================================================
// DATABASE NASABAH
// ======================================================

export default function DatabaseNasabah() {

  // -----------------------------
  // DATA
  // -----------------------------

  const [rows, setRows] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  // -----------------------------
  // SEARCH
  // -----------------------------

  const [q, setQ] = useState('')


  // -----------------------------
  // MODAL
  // -----------------------------


  // -----------------------------
  // DETAIL
  // -----------------------------

  const [selectedNasabah, setSelectedNasabah] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [loadingDetail, setLoadingDetail] = useState(false)


  // ======================================================
  // GET SEMUA NASABAH
  // ======================================================

  const getNasabah = async () => {

    setLoading(true)
    setError('')

    try {

      const response = await fetch(
        q.trim() ? API.nasabahSearch(q.trim()) : API.nasabah,
        { headers: getAuthHeaders() }
      )

      if (!response.ok) {
        throw new Error('Gagal mengambil data nasabah.')
      }

      const result = await response.json()

      /*
        Backend bisa mengembalikan:

        [
          {
            nik: "...",
            nama: "...",
            hp: "...",
            status: "Aktif"
          }
        ]

        atau:

        {
          data: [...]
        }
      */

      const data = Array.isArray(result)
        ? result
        : result.data || []

      setRows(data)

    } catch (err) {

      console.error(err)

      setError(
        err.message ||
        'Terjadi kesalahan saat mengambil data.'
      )

    } finally {

      setLoading(false)

    }
  }


  // ======================================================
  // LOAD DATA SAAT PAGE DIBUKA
  // ======================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      getNasabah()
    }, 300)

    return () => clearTimeout(timer)
  }, [q])


  // ======================================================
  // FILTER SEARCH
  // ======================================================

  const filtered = rows.filter((r) => {

    const keyword = q.toLowerCase()

    return (
      String(r.nik || '')
        .toLowerCase()
        .includes(keyword) ||

      String(r.nama || '')
        .toLowerCase()
        .includes(keyword) ||

      String(r.hp || '')
        .toLowerCase()
        .includes(keyword)
    )

  })


  // ======================================================
  // DETAIL NASABAH BERDASARKAN NIK
  // ======================================================

  const handleDetail = async (nik) => {

    setDetailOpen(true)
    setLoadingDetail(true)
    setSelectedNasabah(null)

    try {

      const response = await fetch(
        API.nasabahDetail(nik),
        { headers: getAuthHeaders() }
      )

      if (!response.ok) {
        throw new Error(
          'Gagal mengambil detail nasabah.'
        )
      }

      const result = await response.json()

      const data =
        result.data || result

      setSelectedNasabah(data)

    } catch (err) {

      console.error(err)

      setError(
        err.message ||
        'Gagal mengambil detail nasabah.'
      )

    } finally {

      setLoadingDetail(false)

    }

  }


  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-[1180px]">


      {/* ==================================================
          HEADER
      ================================================== */}

      <PageHeader
        title="Database Nasabah"
        action={
          <button
            onClick={getNasabah}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh Data
          </button>
        }
      />


      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}


      {/* ==================================================
          SEARCH
      ================================================== */}

      <div className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">

        <Search
          size={18}
          className="text-slate-400"
        />

        <input
          value={q}
          onChange={(e) =>
            setQ(e.target.value)
          }
          placeholder="Cari NIK, nama, atau nomor HP..."
          className="w-full outline-none text-sm"
        />

      </div>


      {/* ==================================================
          TABLE
      ================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (

          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">

            <Loader2
              size={20}
              className="animate-spin"
            />

            Memuat data nasabah...

          </div>

        ) : filtered.length === 0 ? (

          <div className="py-16 text-center text-sm text-slate-400">

            {q
              ? 'Nasabah tidak ditemukan.'
              : 'Belum ada data nasabah.'}

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">

                <tr>

                  <th className="whitespace-nowrap px-6 py-4">
                    NIK Nasabah
                  </th>

                  <th className="whitespace-nowrap px-6 py-4">
                    Nama Lengkap
                  </th>

                  <th className="whitespace-nowrap px-6 py-4">
                    No Handphone
                  </th>

                  <th className="whitespace-nowrap px-6 py-4">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-6 py-4">
                    Aksi
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map((r) => (

                  <tr
                    key={r.nik}
                    className="border-t border-slate-100"
                  >

                    <td className="px-6 py-5 font-mono text-sm">
                      {r.nik}
                    </td>

                    <td className="px-6 py-5 font-bold">
                      {r.nama}
                    </td>

                    <td className="px-6 py-5">
                      {r.hp || r.nomor_telepon || '-'}
                    </td>

                    <td className="px-6 py-5">

                      <StatusBadge>
                        {r.status || 'Aktif'}
                      </StatusBadge>

                    </td>

                    <td className="px-6 py-5">

                      <button
                        onClick={() =>
                          handleDetail(r.nik)
                        }
                        className="flex items-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-50"
                      >

                        <Eye size={15} />

                        Detail

                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ==================================================
          MODAL DETAIL NASABAH
      ================================================== */}

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detail Nasabah"
      >

        {loadingDetail ? (

          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">

            <Loader2
              size={20}
              className="animate-spin"
            />

            Memuat detail...

          </div>

        ) : selectedNasabah ? (

          <div className="space-y-4">

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-400">
                NIK Nasabah
              </p>

              <p className="mt-1 font-mono font-bold text-slate-800">
                {selectedNasabah.nik}
              </p>

            </div>


            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-400">
                Nama Lengkap
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {selectedNasabah.nama}
              </p>

            </div>


            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-400">
                No Handphone
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {selectedNasabah.hp ||
                  selectedNasabah.nomor_telepon ||
                  '-'}
              </p>

            </div>


            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-400">
                Status
              </p>

              <div className="mt-2">
                <StatusBadge>
                  {selectedNasabah.status ||
                    'Aktif'}
                </StatusBadge>
              </div>

            </div>

          </div>

        ) : (

          <p className="py-8 text-center text-sm text-slate-400">
            Data nasabah tidak ditemukan.
          </p>

        )}

      </Modal>

    </div>
  )
}