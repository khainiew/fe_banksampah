import { useEffect, useState } from 'react'
import {
  ScanLine,
  Scale,
  Save,
  Printer,
  UserRound,
  PackageCheck,
  Search,
  Loader2,
} from 'lucide-react'

import PageHeader from '../components/PageHeader'
import { API, getAuthHeaders } from '../api'


// ======================================================
// HELPER
// ======================================================

const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value || 0)
}


// ======================================================
// DASHBOARD
// ======================================================

export default function Dashboard() {
  // -----------------------------
  // NASABAH
  // -----------------------------

  const [nik, setNik] = useState('')
  const [nasabah, setNasabah] = useState(null)

  const [loadingNasabah, setLoadingNasabah] = useState(false)
  const [nasabahError, setNasabahError] = useState('')


  // -----------------------------
  // JENIS SAMPAH (dari backend)
  // -----------------------------

  const [daftarJenis, setDaftarJenis] = useState([])
  const [loadingJenis, setLoadingJenis] = useState(true)


  // -----------------------------
  // TRANSAKSI
  // -----------------------------

  // idJenis = id_jenis yang dipilih (dikirim ke backend)
  const [idJenis, setIdJenis] = useState('')
  const [berat, setBerat] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [saved, setSaved] = useState(false)
  const [receipt, setReceipt] = useState(null)


  // -----------------------------
  // AKTIVITAS
  // -----------------------------

  const [aktivitas, setAktivitas] = useState([])
  const [loadingAktivitas, setLoadingAktivitas] = useState(false)


  // ======================================================
  // JENIS SAMPAH YANG SEDANG DIPILIH
  // ======================================================

  const jenisTerpilih = daftarJenis.find(
    (j) => String(j.id_jenis ?? j.id) === String(idJenis)
  )

  const hargaPerKg = jenisTerpilih?.harga_per_kg || 0
  const namaJenisTerpilih = jenisTerpilih?.nama_jenis || jenisTerpilih?.nama || ''


  // ======================================================
  // HITUNG TOTAL
  // ======================================================

  const total = Number(berat || 0) * Number(hargaPerKg || 0)


  // ======================================================
  // AMBIL DAFTAR JENIS SAMPAH SAAT HALAMAN DIBUKA
  // ======================================================

  useEffect(() => {
    async function fetchJenisSampah() {
      try {
        setLoadingJenis(true)

        const response = await fetch(API.jenisSampah, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Gagal mengambil daftar jenis sampah.')
        }

        const result = await response.json()

        const data = Array.isArray(result)
          ? result
          : result.data || []

        setDaftarJenis(data)

        // Pilih jenis pertama sebagai default
        if (data.length > 0) {
          setIdJenis(String(data[0].id_jenis ?? data[0].id))
        }
      } catch (err) {
        console.error(err)
        // Nggak bikin dashboard rusak total, cuma dropdown kosong
      } finally {
        setLoadingJenis(false)
      }
    }

    fetchJenisSampah()
  }, [])


  // ======================================================
  // CARI NASABAH BERDASARKAN NIK
  // ======================================================

  const handleCariNasabah = async () => {
    if (!nik.trim()) {
      setNasabahError('NIK harus diisi.')
      return
    }

    setLoadingNasabah(true)
    setNasabahError('')
    setNasabah(null)

    try {
      // Endpoint: GET /admin/nasabah/{nik} (protected)
      const response = await fetch(API.nasabahDetail(nik.trim()), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Nasabah tidak ditemukan.')
      }

      const result = await response.json()
      const data = result.data || result

      setNasabah(data)

      // Setelah nasabah ditemukan, ambil aktivitas transaksinya
      handleGetAktivitas(nik.trim())
    } catch (error) {
      console.error(error)
      setNasabahError(error.message || 'Gagal mengambil data nasabah.')
    } finally {
      setLoadingNasabah(false)
    }
  }


  // ======================================================
  // AMBIL AKTIVITAS TRANSAKSI NASABAH
  // ======================================================
  // Catatan: backend belum diketahui punya endpoint history
  // yang bisa difilter per-NIK, jadi kita ambil semua riwayat
  // lalu filter di frontend. Kalau backend ternyata support
  // query (misal /transaksi/history?nik=...), ini bisa
  // disederhanakan.

  const handleGetAktivitas = async (nikNasabah) => {
    setLoadingAktivitas(true)

    try {
      const response = await fetch(API.transaksiHistory, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Gagal mengambil aktivitas transaksi.')
      }

      const result = await response.json()

      const history = Array.isArray(result)
        ? result
        : result.data || []

      // Flatten detail transaksi (kalau backend kirim array detail per transaksi)
      const flattened = history.flatMap((trx) => {
        const details = Array.isArray(trx.detail)
          ? trx.detail
          : Array.isArray(trx.details)
          ? trx.details
          : null

        if (!details) {
          return [trx]
        }

        return details.map((detail, index) => ({
          ...trx,
          ...detail,
          id_transaksi:
            trx.id_transaksi ?? trx.transaksi_id ?? trx.id ?? `TRX-${index + 1}`,
          nik: trx.nik ?? trx.nik_nasabah ?? '',
          jenis_sampah:
            detail.nama_jenis ?? detail.jenis_sampah ?? 'Tidak diketahui',
          berat: detail.berat ?? trx.berat ?? 0,
          total: detail.total ?? detail.nominal ?? trx.total ?? trx.nominal ?? 0,
        }))
      })

      // Filter hanya transaksi milik nasabah ini
      const milikNasabah = flattened.filter(
        (item) => String(item.nik) === String(nikNasabah)
      )

      setAktivitas(milikNasabah)
    } catch (error) {
      console.error(error)
      setAktivitas([])
    } finally {
      setLoadingAktivitas(false)
    }
  }


  // ======================================================
  // SIMPAN TRANSAKSI
  // ======================================================

  const handleSimpanTransaksi = async () => {
    if (!nasabah) {
      setSaveError('Cari nasabah berdasarkan NIK terlebih dahulu.')
      return
    }

    if (!idJenis) {
      setSaveError('Jenis sampah belum dipilih.')
      return
    }

    if (!berat || Number(berat) <= 0) {
      setSaveError('Berat sampah harus lebih dari 0 kg.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaved(false)

    // Sesuai kontrak backend: POST /transaksi/create
    const transaksiData = {
      nik: nik.trim(),
      detail: [
        {
          id_jenis: Number(idJenis),
          berat: Number(berat),
        },
      ],
      keterangan: 'Input manual dari dashboard admin',
    }

    try {
      const response = await fetch(API.transaksiCreate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(transaksiData),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || data.detail || 'Gagal menyimpan transaksi.')
      }

      const transaksi = data.data || data

      setReceipt(transaksi)
      setSaved(true)

      // Refresh aktivitas setelah transaksi berhasil
      handleGetAktivitas(nik.trim())
    } catch (error) {
      console.error(error)
      setSaveError(error.message || 'Terjadi kesalahan saat menyimpan transaksi.')
    } finally {
      setSaving(false)
    }
  }


  // ======================================================
  // CETAK STRUK
  // ======================================================

  const handleCetakStruk = () => {
    window.print()
  }


  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-[1120px]">

      <PageHeader title="Transaksi Nasabah" />


      {/* ==================================================
          INPUT TRANSAKSI
      ================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        {/* HEADER */}

        <div className="mb-5 flex items-center gap-2">

          <ScanLine
            size={20}
            className="text-emerald-700"
          />

          <h2 className="font-['Poppins'] text-lg font-bold text-emerald-900">
            Input Transaksi Nasabah
          </h2>

        </div>


        {/* SEARCH NIK */}

        <div className="mb-6 flex gap-3">

          <div className="relative flex-1">

            <input
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="Masukkan NIK Nasabah (Contoh: 3178902345981765)"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-12 outline-none focus:border-emerald-500"
            />

            <Search
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

          </div>


          <button
            onClick={handleCariNasabah}
            disabled={loadingNasabah}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {loadingNasabah ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />

                Mencari...
              </>
            ) : (
              <>
                <Search size={17} />

                Cari Nasabah
              </>
            )}

          </button>

        </div>


        {/* ERROR NASABAH */}

        {nasabahError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {nasabahError}
          </div>
        )}


        {/* DATA NASABAH */}

        {nasabah && (
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600">

              <UserRound size={22} />

            </div>


            <div>

              <p className="text-xs text-slate-500">
                Nasabah ditemukan
              </p>

              <h3 className="font-['Poppins'] font-bold text-emerald-900">
                {nasabah.nama || nasabah.nama_nasabah}
              </h3>

              <p className="text-sm text-slate-500">
                NIK: {nasabah.nik || nik}
              </p>

            </div>

          </div>
        )}


        {/* ==================================================
            TRANSACTION FORM
        ================================================== */}

        <div className="grid grid-cols-2 gap-6">

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

            <div className="mb-3 flex items-center gap-2">

              <PackageCheck
                size={18}
                className="text-emerald-700"
              />

              <h3 className="font-semibold text-slate-700">
                Jenis Sampah Dipilih
              </h3>

            </div>


            <div className="flex h-[202px] flex-col items-center justify-center rounded-lg bg-[#2d3748] text-center text-white">

              <ScanLine
                size={40}
                className="mb-3"
              />

              <p className="text-sm text-slate-300">
                Jenis Sampah
              </p>

              <p className="mt-1 text-xl font-bold">
                {namaJenisTerpilih || '-'}
              </p>

            </div>

          </div>


          {/* DATA SAMPAH */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

            <div className="mb-4 flex items-center gap-2">

              <Scale
                size={18}
                className="text-emerald-700"
              />

              <h3 className="font-semibold text-slate-700">
                Data Timbangan
              </h3>

            </div>


            {/* JENIS SAMPAH */}

            <label className="mb-1 block text-sm font-semibold text-slate-600">
              Jenis Sampah
            </label>

            <select
              value={idJenis}
              onChange={(e) => setIdJenis(e.target.value)}
              disabled={loadingJenis || daftarJenis.length === 0}
              className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              {loadingJenis && (
                <option>Memuat jenis sampah...</option>
              )}

              {!loadingJenis && daftarJenis.length === 0 && (
                <option>Belum ada data jenis sampah</option>
              )}

              {daftarJenis.map((j) => {
                const id = j.id_jenis ?? j.id
                const nama = j.nama_jenis ?? j.nama

                return (
                  <option key={id} value={id}>
                    {nama}
                  </option>
                )
              })}
            </select>


            {/* HARGA */}

            <div className="mb-4 rounded-lg bg-white p-3">

              <p className="text-xs text-slate-500">
                Harga Saat Ini
              </p>

              <p className="font-bold text-emerald-600">
                {formatRupiah(hargaPerKg)} / kg
              </p>

            </div>


            {/* BERAT */}

            <label className="mb-1 block text-sm font-semibold text-slate-600">
              Berat Sampah
            </label>

            <div className="relative">

              <input
                type="number"
                min="0"
                step="0.1"
                value={berat}
                onChange={(e) => setBerat(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-12 outline-none focus:border-emerald-500"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                kg
              </span>

            </div>

          </div>

        </div>


        {/* ==================================================
            TOTAL
        ================================================== */}

        <div className="mt-6 flex items-center justify-between rounded-lg border border-emerald-600 bg-emerald-50 px-5 py-4">

          <div>

            <p className="text-sm text-slate-500">
              Total Diterima
            </p>

            <p className="font-['Poppins'] text-2xl font-bold text-emerald-700">
              {formatRupiah(total)}
            </p>

          </div>

          <div className="text-right">

            <p className="text-xs text-slate-500">
              {namaJenisTerpilih || '-'}
            </p>

            <p className="text-sm font-semibold text-slate-700">
              {berat || 0} kg × {formatRupiah(hargaPerKg)}
            </p>

          </div>

        </div>


        {/* ERROR SAVE */}

        {saveError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {saveError}
          </div>
        )}


        {/* ==================================================
            BUTTON
        ================================================== */}

        <div className="mt-6 flex justify-end gap-3">

          <button
            onClick={handleCetakStruk}
            disabled={!receipt}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >

            <Printer size={18} />

            Cetak Struk

          </button>


          <button
            onClick={handleSimpanTransaksi}
            disabled={saving || !nasabah}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Menyimpan...
              </>
            ) : (
              <>
                <Save size={18} />

                Simpan Transaksi
              </>
            )}

          </button>

        </div>

      </div>


      {/* ==================================================
          STRUK
      ================================================== */}

      {receipt && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between border-b-2 border-dashed border-slate-200 pb-4">

            <div>

              <h2 className="font-['Poppins'] text-base font-bold text-emerald-900">
                EcoBank Struk
              </h2>

              <p className="text-xs text-slate-500">
                {receipt.tanggal || 'Tanggal transaksi'}
                {receipt.waktu && ` | ${receipt.waktu}`}
              </p>

            </div>


            <div className="text-right">

              <p className="text-xs text-slate-500">
                ID Transaksi
              </p>

              <p className="text-sm font-bold text-slate-800">
                {receipt.id_transaksi ||
                  receipt.transaksi_id ||
                  receipt.id ||
                  '-'}
              </p>

            </div>

          </div>


          {/* DATA NASABAH */}

          <div className="my-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">

            <div>

              <p className="text-xs text-slate-500">
                NIK Nasabah
              </p>

              <p className="text-sm font-bold text-slate-800">
                {receipt.nik || nik}
              </p>

            </div>


            <div className="text-right">

              <p className="text-xs text-slate-500">
                Nama Nasabah
              </p>

              <p className="text-sm font-bold text-slate-800">
                {receipt.nama_nasabah ||
                  receipt.nama ||
                  nasabah?.nama ||
                  '-'}
              </p>

            </div>

          </div>


          {/* DETAIL */}

          <div className="space-y-3">

            <div className="flex items-center justify-between text-sm">

              <span className="text-slate-700">
                {namaJenisTerpilih}
                {' '}
                ({berat} kg)
              </span>

              <span className="font-semibold text-slate-900">
                {formatRupiah(receipt.total || total)}
              </span>

            </div>

          </div>


          {/* TOTAL */}

          <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-3">

            <span className="font-['Poppins'] text-sm font-bold text-emerald-900">
              Total Diterima
            </span>

            <span className="font-['Poppins'] text-lg font-bold text-emerald-600">
              {formatRupiah(receipt.total || total)}
            </span>

          </div>

        </div>
      )}


      {/* ==================================================
          AKTIVITAS TERAKHIR
      ================================================== */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center justify-between">

          <h2 className="font-['Poppins'] text-lg font-bold text-emerald-900">
            Aktivitas Terakhir
          </h2>

          {loadingAktivitas && (
            <Loader2
              size={18}
              className="animate-spin text-emerald-600"
            />
          )}

        </div>


        {aktivitas.length === 0 ? (

          <div className="py-8 text-center text-sm text-slate-400">
            {nasabah
              ? 'Belum ada aktivitas transaksi untuk nasabah ini.'
              : 'Cari nasabah terlebih dahulu untuk melihat aktivitas.'}
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-slate-200 text-left">

                  <th className="px-4 py-3 font-bold text-slate-500">
                    Tanggal
                  </th>

                  <th className="px-4 py-3 font-bold text-slate-500">
                    ID Transaksi
                  </th>

                  <th className="px-4 py-3 font-bold text-slate-500">
                    NIK
                  </th>

                  <th className="px-4 py-3 font-bold text-slate-500">
                    Sampah
                  </th>

                  <th className="px-4 py-3 font-bold text-slate-500">
                    Berat
                  </th>

                  <th className="px-4 py-3 text-right font-bold text-slate-500">
                    Nominal
                  </th>

                </tr>

              </thead>


              <tbody>

                {aktivitas.map((item, index) => (

                  <tr
                    key={item.id_transaksi || item.id || index}
                    className="border-b border-slate-100"
                  >

                    <td className="px-4 py-3">
                      {item.tanggal || '-'}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {item.id_transaksi ||
                        item.transaksi_id ||
                        item.id ||
                        '-'}
                    </td>

                    <td className="px-4 py-3">
                      {item.nik || nik}
                    </td>

                    <td className="px-4 py-3">
                      {item.jenis_sampah || '-'}
                    </td>

                    <td className="px-4 py-3">
                      {item.berat ? `${item.berat} kg` : '-'}
                    </td>

                    <td className="px-4 py-3 text-right font-bold">
                      {formatRupiah(item.total || item.nominal || 0)}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  )
}
