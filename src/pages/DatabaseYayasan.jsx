import { useEffect, useState } from 'react'
import {
  ChevronDown,
  Plus,
  Pencil,
  X,
  Loader2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

import { API, getAuthHeaders } from '../api'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

// ==========================================================
// HELPER
// ==========================================================

function formatRupiah(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const number = Number(value)

  if (Number.isNaN(number)) {
    return value
  }

  return `Rp ${number.toLocaleString('id-ID')} / kg`
}


// ==========================================================
// COMPONENT
// ==========================================================

export default function DatabaseYayasan() {
  const [rows, setRows] = useState([])

  const [open, setOpen] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  // modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')

  // form
  const [form, setForm] = useState({
    id: '',
    nama: '',
    lokasi: '',
    alamat: '',
    kontak: '',
    email: '',
    penanggung_jawab: '',

    harga_pet: '',
    harga_kardus: '',
    harga_logam: '',
  })


  // ==========================================================
  // GET DATA YAYASAN
  // ==========================================================

  async function fetchYayasan() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(API.mitra, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Gagal mengambil data yayasan')
      }

      const result = await response.json()

      /*
       * Backend bisa aja mengirim:
       *
       * [
       *   {...},
       *   {...}
       * ]
       *
       * atau:
       *
       * {
       *   data: [...]
       * }
       */

      const data = Array.isArray(result)
        ? result
        : result.data || []

      setRows(data)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }


  // ==========================================================
  // LOAD DATA SAAT HALAMAN DIBUKA
  // ==========================================================

  useEffect(() => {
    fetchYayasan()
  }, [])


  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetForm() {
    setForm({
      id: '',
      nama: '',
      lokasi: '',
      alamat: '',
      kontak: '',
      email: '',
      harga_pet: '',
      harga_kardus: '',
      harga_logam: '',
    })
  }


  // ==========================================================
  // TAMBAH YAYASAN
  // ==========================================================

  function handleAdd() {
    resetForm()

    setModalMode('add')
    setModalOpen(true)
  }


  // ==========================================================
  // EDIT YAYASAN
  // ==========================================================

  function handleEdit(yayasan) {
    setForm({
      id: yayasan.id_mitra || yayasan.id || yayasan.mitra_id || '',

      nama: yayasan.nama_mitra || yayasan.nama || yayasan.nama_yayasan || '',

      lokasi: yayasan.lokasi || yayasan.kecamatan || '',

      alamat: yayasan.alamat || yayasan.alamat_lengkap || '',

      kontak:
        yayasan.kontak ||
        yayasan.nomor_kontak ||
        yayasan.telepon ||
        '',

      email: yayasan.email || '',

      harga_pet:
        yayasan.harga_pet ||
        yayasan.harga_plastik ||
        yayasan.harga_plastik_pet ||
        '',

      harga_kardus:
        yayasan.harga_kardus ||
        yayasan.harga_kertas ||
        '',

      harga_logam:
        yayasan.harga_logam ||
        yayasan.harga_besi ||
        yayasan.harga_logam_besi ||
        '',
    })

    setModalMode('edit')
    setModalOpen(true)
  }


  // ==========================================================
  // HANDLE INPUT
  // ==========================================================

  function handleChange(e) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }


  // ==========================================================
  // SIMPAN DATA
  // ==========================================================
  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')

      const authHeaders = getAuthHeaders()

      const jenisResponse = await fetch(API.jenisSampah)
      if (!jenisResponse.ok) {
        throw new Error('Gagal mengambil jenis sampah.')
      }

      const jenisResult = await jenisResponse.json()
      const jenisList = Array.isArray(jenisResult)
        ? jenisResult
        : jenisResult.data || []

      const findJenisId = (keywords) => {
        const item = jenisList.find((j) => {
          const nama = String(
            j.nama_jenis ?? j.nama ?? ''
          ).toLowerCase()

          return keywords.some((keyword) =>
            nama.includes(keyword)
          )
        })

        return item?.id_jenis ?? item?.id
      }

      const hargaItems = [
        {
          id_jenis: findJenisId(['pet', 'plastik']),
          harga_beli_per_kg: Number(form.harga_pet),
        },
        {
          id_jenis: findJenisId(['kardus', 'kertas']),
          harga_beli_per_kg: Number(form.harga_kardus),
        },
        {
          id_jenis: findJenisId(['logam', 'besi', 'metal']),
          harga_beli_per_kg: Number(form.harga_logam),
        },
      ].filter(
        (item) =>
          item.id_jenis !== undefined &&
          item.id_jenis !== null &&
          Number.isFinite(item.harga_beli_per_kg)
      )

      let mitraId = form.id

      if (modalMode === 'add') {
        const response = await fetch(API.mitraCreate, {
          method: 'POST',
          headers: {
            ...JSON_HEADERS,
            ...authHeaders,
          },
          body: JSON.stringify({
            nama_mitra: form.nama,
            deskripsi: form.lokasi
              ? `Lokasi/Kecamatan: ${form.lokasi}`
              : '',
            alamat: form.alamat,
            no_hp: form.kontak,
            email: form.email,
            nama_penanggung_jawab:
              form.penanggung_jawab,
          }),
        })

        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(
            result.message ||
              'Gagal menambahkan yayasan/mitra.'
          )
        }

        const created = result.data || result
        mitraId =
          created.id_mitra ??
          created.id ??
          created.mitra_id

        if (!mitraId) {
          throw new Error(
            'Mitra berhasil dibuat, tetapi ID mitra tidak ditemukan pada response backend.'
          )
        }
      }

      if (!mitraId) {
        throw new Error('ID mitra tidak ditemukan.')
      }

      if (hargaItems.length > 0) {
        for (const item of hargaItems) {
          const response = await fetch(
            API.mitraHarga(mitraId),
            {
              method: 'POST',
              headers: {
                ...JSON_HEADERS,
                ...authHeaders,
              },
              body: JSON.stringify(item),
            }
          )

          const result = await response.json().catch(() => ({}))

          if (!response.ok) {
            throw new Error(
              result.message ||
                `Gagal menyimpan harga jenis sampah ID ${item.id_jenis}.`
            )
          }
        }
      }

      await fetchYayasan()
      setModalOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1180px]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Database Yayasan"
        action={
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus size={18} />
            Tambah Yayasan
          </button>
        }
      />


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            onClick={() => setError('')}
            className="rounded p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center gap-3 text-slate-500">

            <Loader2
              size={22}
              className="animate-spin text-emerald-600"
            />

            <span>Memuat data yayasan...</span>

          </div>

        </div>
      ) : rows.length === 0 ? (

        /* ===================================================
           EMPTY DATA
        =================================================== */

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <p className="font-bold text-slate-600">
            Belum ada data yayasan
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Tambahkan yayasan terlebih dahulu.
          </p>

          <button
            onClick={handleAdd}
            className="mt-5 rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700"
          >
            Tambah Yayasan
          </button>

        </div>

      ) : (

        /* ===================================================
           LIST YAYASAN
        =================================================== */

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {rows.map((y) => {

            const id = y.id_mitra || y.id || y.mitra_id

            const nama =
              y.nama_mitra ||
              y.nama ||
              y.nama_yayasan ||
              'Nama Yayasan'

            const lokasi =
              y.lokasi ||
              y.kecamatan ||
              y.deskripsi ||
              '-'

            const isOpen = open === id

            return (
              <div
                key={id || nama}
                className="border-b border-slate-100 last:border-0"
              >

                {/* ==========================================
                    HEADER YAYASAN
                ========================================== */}

                <div className="flex flex-wrap items-center gap-4 px-6 py-5">

                  {/* DROPDOWN */}

                  <button
                    onClick={() =>
                      setOpen(isOpen ? null : id)
                    }
                    className="shrink-0 rounded-full p-1 text-emerald-600 hover:bg-emerald-50"
                  >
                    <ChevronDown
                      size={20}
                      className={`transition ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>


                  {/* INFO */}

                  <div className="min-w-0 flex-1">

                    <b className="block break-words text-lg text-emerald-900">
                      {nama}
                    </b>

                    <p className="mt-1 text-sm text-slate-500">
                      {lokasi}
                    </p>

                  </div>


                  {/* ACTION */}

                  <div className="flex shrink-0 items-center gap-2">

                    {/* EDIT */}

                    <button
                      onClick={() => handleEdit(y)}
                      title="Edit"
                      className="rounded-md border border-emerald-600 p-2 text-emerald-600 hover:bg-emerald-50"
                    >
                      <Pencil size={16} />
                    </button>

                  </div>

                </div>


                {/* ==========================================
                    DETAIL HARGA
                ========================================== */}

                {isOpen && (
                  <div className="bg-slate-50 px-6 py-5 md:px-16">

                    <p className="mb-4 text-xs font-bold uppercase text-slate-500">
                      Rincian Harga Beli Saat Ini
                    </p>


                    <div className="grid gap-4 md:grid-cols-3">

                      {/* PET */}

                      <div className="rounded-lg border border-slate-200 bg-white p-4">

                        <p className="text-sm text-slate-500">
                          Botol Plastik PET
                        </p>

                        <b className="mt-2 block text-emerald-700">
                          {formatRupiah(
                            y.harga_pet ||
                            y.harga_plastik ||
                            y.harga_plastik_pet
                          )}
                        </b>

                      </div>


                      {/* KARDUS */}

                      <div className="rounded-lg border border-slate-200 bg-white p-4">

                        <p className="text-sm text-slate-500">
                          Kardus
                        </p>

                        <b className="mt-2 block text-emerald-700">
                          {formatRupiah(
                            y.harga_kardus ||
                            y.harga_kertas
                          )}
                        </b>

                      </div>


                      {/* LOGAM */}

                      <div className="rounded-lg border border-slate-200 bg-white p-4">

                        <p className="text-sm text-slate-500">
                          Logam / Besi
                        </p>

                        <b className="mt-2 block text-emerald-700">
                          {formatRupiah(
                            y.harga_logam ||
                            y.harga_besi ||
                            y.harga_logam_besi
                          )}
                        </b>

                      </div>

                    </div>

                  </div>
                )}

              </div>
            )
          })}

        </div>
      )}


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <p className="mt-6 text-center text-xs text-slate-400">
        Klik pada baris yayasan untuk melihat detail harga per jenis sampah.
      </p>


      {/* =====================================================
          MODAL TAMBAH / EDIT
      ===================================================== */}

      {modalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <h2 className="font-['Poppins'] text-xl font-bold text-emerald-900">
                  {modalMode === 'add'
                    ? 'Tambah Yayasan'
                    : 'Edit Data Yayasan'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'add'
                    ? 'Masukkan data yayasan baru.'
                    : 'Ubah informasi dan harga sampah yayasan.'}
                </p>

              </div>


              <button
                onClick={() => {
                  setModalOpen(false)
                  resetForm()
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>


            {/* =================================================
                FORM
            ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              {/* NAMA + LOKASI */}

              <div className="grid gap-5 md:grid-cols-2">

                <label className="block">

                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Nama Yayasan
                  </span>

                  <input
                    required
                    name="nama"
                    value={form.nama}
                    onChange={handleChange}
                    placeholder="Contoh: Yayasan Hijau Lestari"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  />

                </label>


                <label className="block">

                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Lokasi / Kecamatan
                  </span>

                  <input
                    required
                    name="lokasi"
                    value={form.lokasi}
                    onChange={handleChange}
                    placeholder="Contoh: Bojongsari"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  />

                </label>

              </div>


              {/* ALAMAT */}

              <label className="block">

                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Alamat Lengkap
                </span>

                <textarea
                  required
                  name="alamat"
                  value={form.alamat}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Masukkan alamat lengkap yayasan..."
                  className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />

              </label>


              {/* KONTAK + EMAIL */}

              <div className="grid gap-5 md:grid-cols-2">

                <label className="block">

                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Nomor Kontak
                  </span>

                  <input
                    required
                    name="kontak"
                    value={form.kontak}
                    onChange={handleChange}
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  />

                </label>


                <label className="block">

                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Email
                  </span>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="yayasan@email.com"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  />

                </label>

              </div>


              {/* =================================================
                  HARGA SAMPAH
              ================================================= */}

              <div>

                <div className="mb-3">

                  <h3 className="font-bold text-slate-800">
                    Harga Beli Sampah
                  </h3>

                  <p className="text-sm text-slate-400">
                    Masukkan harga per kilogram.
                  </p>

                </div>


                <div className="grid gap-4 md:grid-cols-3">

                  {/* PET */}

                  <label className="block">

                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Botol Plastik PET
                    </span>

                    <div className="relative">

                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        Rp
                      </span>

                      <input
                        required
                        type="number"
                        min="0"
                        name="harga_pet"
                        value={form.harga_pet}
                        onChange={handleChange}
                        placeholder="3000"
                        className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
                      />

                    </div>

                  </label>


                  {/* KARDUS */}

                  <label className="block">

                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Kardus
                    </span>

                    <div className="relative">

                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        Rp
                      </span>

                      <input
                        required
                        type="number"
                        min="0"
                        name="harga_kardus"
                        value={form.harga_kardus}
                        onChange={handleChange}
                        placeholder="2000"
                        className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
                      />

                    </div>

                  </label>


                  {/* LOGAM */}

                  <label className="block">

                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Logam / Besi
                    </span>

                    <div className="relative">

                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        Rp
                      </span>

                      <input
                        required
                        type="number"
                        min="0"
                        name="harga_logam"
                        value={form.harga_logam}
                        onChange={handleChange}
                        placeholder="8000"
                        className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
                      />

                    </div>

                  </label>

                </div>

              </div>


              {/* =================================================
                  BUTTON
              ================================================= */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    resetForm()
                  }}
                  className="rounded-lg border border-slate-300 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>


                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? 'Menyimpan...'
                    : modalMode === 'add'
                      ? 'Simpan Data'
                      : 'Simpan Perubahan'}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  )
}