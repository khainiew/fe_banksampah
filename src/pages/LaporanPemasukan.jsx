import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Download,
  Filter,
  X,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { API, getAuthHeaders } from "../api";

export default function LaporanPemasukan() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [yayasanRows, setYayasanRows] = useState([]);

  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterYayasan, setFilterYayasan] = useState("");

  const [showFilter, setShowFilter] = useState(false);

  // ======================================================
  // FETCH RIWAYAT TRANSAKSI
  // ======================================================
  useEffect(() => {
    const fetchLaporan = async () => {
      try {
        setLoading(true);
        setError("");

        /*
          ENDPOINT TETAP.
          Tidak ada perubahan endpoint.
        */
        const response = await fetch(
          API.transaksiHistory,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Gagal mengambil riwayat transaksi."
          );
        }

        const result =
          await response.json();

        /*
          Antisipasi response:
          [
            {...}
          ]

          atau:

          {
            data: [...]
          }
        */
        const history = Array.isArray(
          result
        )
          ? result
          : Array.isArray(
              result.data
            )
          ? result.data
          : [];

        // ==================================================
        // FLATTEN DETAIL TRANSAKSI
        // ==================================================
        const flattened =
          history.flatMap((trx) => {
            const details =
              Array.isArray(
                trx.detail
              )
                ? trx.detail
                : Array.isArray(
                    trx.details
                  )
                ? trx.details
                : null;

            /*
              Ambil nama yayasan dari
              transaksi utama.
            */
            const namaYayasan =
              trx.nama_yayasan ??
              trx.yayasan_nama ??
              trx.nama_pengepul ??
              trx.pengepul_nama ??
              trx.yayasan ??
              trx.pengepul ??
              "";

            /*
              Kalau tidak ada detail array,
              gunakan transaksi langsung.
            */
            if (!details) {
              return [
                {
                  ...trx,

                  nama_yayasan:
                    namaYayasan,
                },
              ];
            }

            return details.map(
              (
                detail,
                index
              ) => ({
                ...trx,
                ...detail,

                id_transaksi:
                  trx.id_transaksi ??
                  trx.transaksi_id ??
                  trx.id ??
                  `TRX-${index + 1}`,

                nama_yayasan:
                  detail.nama_yayasan ??
                  detail.yayasan_nama ??
                  detail.nama_pengepul ??
                  namaYayasan,

                jenis_sampah:
                  detail.nama_jenis ??
                  detail.jenis_sampah ??
                  trx.jenis_sampah ??
                  trx.nama_jenis ??
                  "Tidak diketahui",

                berat:
                  detail.berat ??
                  trx.berat ??
                  0,

                total:
                  detail.total ??
                  detail.nominal ??
                  trx.total ??
                  trx.nominal ??
                  trx.jumlah ??
                  0,
              })
            );
          });

        /*
          LAPORAN PEMASUKAN

          Hanya ambil transaksi yang memiliki
          nama yayasan / pengepul.

          Nasabah tidak akan masuk ke laporan ini.
        */
        const yayasan =
          flattened.filter(
            (item) =>
              item.nama_yayasan
          );

        setYayasanRows(yayasan);
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Terjadi kesalahan saat mengambil data laporan."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLaporan();
  }, []);

  // ======================================================
  // FORMAT RUPIAH
  // ======================================================
  const formatRupiah = (
    value
  ) => {
    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(value || 0)
    );
  };

  // ======================================================
  // FORMAT BERAT
  // ======================================================
  const formatBerat = (
    value
  ) => {
    return `${Number(
      value || 0
    ).toLocaleString(
      "id-ID"
    )} kg`;
  };

  // ======================================================
  // AMBIL TANGGAL
  // ======================================================
  const getTanggalValue = (
    row
  ) => {
    return (
      row.tanggal ??
      row.created_at ??
      row.date ??
      ""
    );
  };

  // ======================================================
  // AMBIL NAMA YAYASAN
  // ======================================================
  const getNamaYayasan = (
    row
  ) => {
    return (
      row.nama_yayasan ??
      row.yayasan_nama ??
      row.nama_pengepul ??
      row.pengepul_nama ??
      row.yayasan ??
      row.pengepul ??
      ""
    );
  };

  // ======================================================
  // DAFTAR YAYASAN
  // ======================================================
  const daftarYayasan = useMemo(() => {
    return [
      ...new Set(
        yayasanRows
          .map(
            (row) =>
              getNamaYayasan(
                row
              )
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [yayasanRows]);

  // ======================================================
  // FILTER DATA
  // ======================================================
  const filteredRows =
    useMemo(() => {
      return yayasanRows.filter(
        (row) => {
          const tanggal =
            getTanggalValue(
              row
            );

          const namaYayasan =
            getNamaYayasan(
              row
            );

          /*
            FILTER TANGGAL
          */
          if (filterTanggal) {
            const tanggalRow =
              String(
                tanggal
              ).slice(0, 10);

            if (
              tanggalRow !==
              filterTanggal
            ) {
              return false;
            }
          }

          /*
            FILTER BULAN
          */
          if (filterBulan) {
            const bulanRow =
              String(
                tanggal
              ).slice(0, 7);

            if (
              bulanRow !==
              filterBulan
            ) {
              return false;
            }
          }

          /*
            FILTER YAYASAN
          */
          if (
            filterYayasan &&
            namaYayasan !==
              filterYayasan
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      yayasanRows,
      filterTanggal,
      filterBulan,
      filterYayasan,
    ]);

  // ======================================================
  // TOTAL TRANSAKSI
  // ======================================================
  const totalTransaksi =
    filteredRows.length;

  // ======================================================
  // TOTAL BERAT
  // ======================================================
  const totalBerat =
    filteredRows.reduce(
      (sum, item) =>
        sum +
        Number(
          item.berat || 0
        ),
      0
    );

  // ======================================================
  // TOTAL PEMASUKAN
  // ======================================================
  const totalPemasukan =
    filteredRows.reduce(
      (sum, item) =>
        sum +
        Number(
          item.total ??
            item.nominal ??
            item.jumlah ??
            0
        ),
      0
    );

  // ======================================================
  // PEMASUKAN PER BULAN
  // ======================================================
  const pemasukanPerBulan =
    useMemo(() => {
      const byMonth = {};

      filteredRows.forEach(
        (item) => {
          const tanggal =
            getTanggalValue(
              item
            );

          const bulan =
            String(
              tanggal
            ).slice(0, 7);

          if (!bulan) {
            return;
          }

          const nominal =
            Number(
              item.total ??
                item.nominal ??
                item.jumlah ??
                0
            );

          byMonth[bulan] =
            (byMonth[bulan] ||
              0) + nominal;
        }
      );

      return Object.entries(
        byMonth
      )
        .map(
          ([
            bulan,
            total,
          ]) => ({
            bulan,
            total,
          })
        )
        .sort(
          (a, b) =>
            b.bulan.localeCompare(
              a.bulan
            )
        );
    }, [filteredRows]);

  // ======================================================
  // JENIS SAMPAH
  // ======================================================
  const jenisSampah =
    useMemo(() => {
      const byJenis = {};

      filteredRows.forEach(
        (item) => {
          const nama =
            item.jenis_sampah ??
            item.nama_jenis ??
            "Tidak diketahui";

          byJenis[nama] =
            (byJenis[nama] ||
              0) +
            Number(
              item.berat || 0
            );
        }
      );

      return Object.entries(
        byJenis
      )
        .map(
          ([
            nama,
            berat,
          ]) => ({
            nama,
            berat,
          })
        )
        .sort(
          (a, b) =>
            b.berat - a.berat
        );
    }, [filteredRows]);

  const totalBeratSampah =
    jenisSampah.reduce(
      (total, item) =>
        total +
        Number(
          item.berat || 0
        ),
      0
    );

  // ======================================================
  // RESET FILTER
  // ======================================================
  const resetFilter = () => {
    setFilterTanggal("");
    setFilterBulan("");
    setFilterYayasan("");
  };

  const hasFilter =
    filterTanggal ||
    filterBulan ||
    filterYayasan;

  // ======================================================
  // DOWNLOAD EXCEL / CSV
  // ======================================================
  const downloadExcel = () => {
    if (
      filteredRows.length ===
      0
    ) {
      alert(
        "Tidak ada data transaksi yang sesuai dengan filter."
      );
      return;
    }

    const headers = [
      "Tanggal",
      "ID Transaksi",
      "Yayasan",
      "Jenis Sampah",
      "Berat (kg)",
      "Total Pemasukan",
    ];

    const rows =
      filteredRows.map(
        (row) => [
          getTanggalValue(
            row
          ),

          row.id_transaksi ??
            row.transaksi_id ??
            row.id ??
            "",

          getNamaYayasan(
            row
          ),

          row.jenis_sampah ??
            row.nama_jenis ??
            "",

          row.berat ?? 0,

          row.total ??
            row.nominal ??
            row.jumlah ??
            0,
        ]
      );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value
              ).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob =
      new Blob(
        [
          "\ufeff" +
            csv,
        ],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      "laporan-pemasukan-yayasan.csv";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );
  };

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <PageHeader title="Laporan Pemasukan" />

      {/* ==================================================
          ERROR
      ================================================== */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {/* ==================================================
          LOADING
      ================================================== */}
      {loading && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500 shadow-sm">
          Memuat data laporan...
        </div>
      )}

      {/* ==================================================
          FILTER
      ================================================== */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-['Poppins'] text-lg font-bold text-slate-800">
              Filter Laporan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Filter transaksi berdasarkan
              tanggal, bulan, atau yayasan.
            </p>
          </div>

          <div className="flex gap-2">
            {hasFilter && (
              <button
                onClick={
                  resetFilter
                }
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <X
                  size={16}
                />

                Reset
              </button>
            )}

            <button
              onClick={() =>
                setShowFilter(
                  !showFilter
                )
              }
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <Filter
                size={16}
              />

              {showFilter
                ? "Tutup Filter"
                : "Filter"}
            </button>
          </div>
        </div>

        {showFilter && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
            {/* TANGGAL */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Tanggal
              </label>

              <input
                type="date"
                value={
                  filterTanggal
                }
                onChange={(e) =>
                  setFilterTanggal(
                    e.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* BULAN */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Bulan
              </label>

              <input
                type="month"
                value={
                  filterBulan
                }
                onChange={(e) =>
                  setFilterBulan(
                    e.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* YAYASAN */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Yayasan
              </label>

              <select
                value={
                  filterYayasan
                }
                onChange={(e) =>
                  setFilterYayasan(
                    e.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">
                  Semua Yayasan
                </option>

                {daftarYayasan.map(
                  (yayasan) => (
                    <option
                      key={
                        yayasan
                      }
                      value={
                        yayasan
                      }
                    >
                      {yayasan}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* ==================================================
          TOTAL PEMASUKAN PER BULAN
      ================================================== */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="font-['Poppins'] text-xl font-bold text-slate-800">
            Total Pemasukan
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Rekap pemasukan berdasarkan bulan
          </p>
        </div>

        {pemasukanPerBulan.length ===
        0 ? (
          <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400">
            Belum ada data pemasukan.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pemasukanPerBulan.map(
              (item) => {
                const [
                  tahun,
                  bulan,
                ] =
                  item.bulan.split(
                    "-"
                  );

                const namaBulan =
                  new Date(
                    Number(
                      tahun
                    ),
                    Number(
                      bulan
                    ) - 1
                  ).toLocaleDateString(
                    "id-ID",
                    {
                      month:
                        "long",
                      year:
                        "numeric",
                    }
                  );

                return (
                  <div
                    key={
                      item.bulan
                    }
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm font-bold capitalize text-slate-500">
                      {namaBulan}
                    </p>

                    <p className="mt-2 font-['Poppins'] text-2xl font-bold text-emerald-900">
                      {formatRupiah(
                        item.total
                      )}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* TOTAL KESELURUHAN */}
        <div className="mt-4 rounded-xl bg-emerald-50 p-5">
          <p className="text-sm font-bold text-emerald-700">
            Total Pemasukan Keseluruhan
          </p>

          <p className="mt-1 font-['Poppins'] text-2xl font-bold text-emerald-900">
            {formatRupiah(
              totalPemasukan
            )}
          </p>
        </div>
      </section>

      {/* ==================================================
          JENIS SAMPAH TERBANYAK
      ================================================== */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-5 font-['Poppins'] text-xl font-bold text-slate-800">
          Jenis Sampah Terbanyak
        </h2>

        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          {/* DONUT CHART */}
          <div className="flex justify-center">
            <div className="relative h-64 w-64">
              <svg
                viewBox="0 0 100 100"
                className="h-full w-full -rotate-90"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="18"
                />

                {(() => {
                  const circumference =
                    2 *
                    Math.PI *
                    40;

                  let offset = 0;

                  const colors =
                    [
                      "#3b82f6",
                      "#a855f7",
                      "#f59e0b",
                      "#eab308",
                    ];

                  return jenisSampah
                    .slice(
                      0,
                      4
                    )
                    .map(
                      (
                        item,
                        index
                      ) => {
                        const percentage =
                          totalBeratSampah >
                          0
                            ? Number(
                                item.berat
                              ) /
                              totalBeratSampah
                            : 0;

                        const dash =
                          percentage *
                          circumference;

                        const currentOffset =
                          offset;

                        offset +=
                          dash;

                        return (
                          <circle
                            key={
                              item.nama
                            }
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={
                              colors[
                                index
                              ] ||
                              "#94a3b8"
                            }
                            strokeWidth="18"
                            strokeDasharray={`${dash} ${circumference}`}
                            strokeDashoffset={
                              -currentOffset
                            }
                          />
                        );
                      }
                    );
                })()}
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-slate-400">
                    Total
                  </p>

                  <p className="font-['Poppins'] text-xl font-bold text-emerald-900">
                    {formatBerat(
                      totalBeratSampah
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* LEGEND */}
          <div className="space-y-4">
            {jenisSampah.length ===
            0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Belum ada data jenis sampah.
              </div>
            ) : (
              jenisSampah.map(
                (
                  item,
                  index
                ) => {
                  const persen =
                    totalBeratSampah >
                    0
                      ? (
                          (Number(
                            item.berat
                          ) /
                            totalBeratSampah) *
                          100
                        ).toFixed(
                          2
                        )
                      : 0;

                  return (
                    <div
                      key={
                        item.nama
                      }
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`h-3.5 w-3.5 shrink-0 rounded-md ${
                            index ===
                            0
                              ? "bg-blue-500"
                              : index ===
                                1
                              ? "bg-purple-500"
                              : index ===
                                2
                              ? "bg-amber-500"
                              : "bg-yellow-300"
                          }`}
                        />

                        <span className="break-words text-base text-slate-800">
                          {
                            item.nama
                          }
                        </span>
                      </div>

                      <div className="shrink-0 text-right">
                        <b className="font-['Poppins'] text-lg text-slate-800">
                          {formatBerat(
                            item.berat
                          )}
                        </b>

                        <p className="text-xs text-slate-400">
                          {
                            persen
                          }
                          %
                        </p>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          LAPORAN YAYASAN
      ================================================== */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <Building2
              size={20}
              className="shrink-0 text-emerald-600"
            />

            <div className="min-w-0">
              <h2 className="break-words font-['Poppins'] text-lg font-bold text-emerald-900">
                Laporan Pemasukan Yayasan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Riwayat penjualan sampah kepada yayasan
              </p>
            </div>
          </div>

          <button
            onClick={
              downloadExcel
            }
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <Download
              size={16}
            />

            <span>
              Download Excel
            </span>
          </button>
        </div>

        {/* TABLE LANGSUNG TAMPIL */}
        <div className="border-t border-slate-200 p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">
                    Tanggal
                  </th>

                  <th className="px-5 py-4">
                    ID Transaksi
                  </th>

                  <th className="px-5 py-4">
                    Yayasan
                  </th>

                  <th className="px-5 py-4">
                    Jenis Sampah
                  </th>

                  <th className="px-5 py-4">
                    Berat
                  </th>

                  <th className="px-5 py-4">
                    Total Pemasukan
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length >
                0 ? (
                  filteredRows.map(
                    (
                      row,
                      index
                    ) => (
                      <tr
                        key={
                          row.id ||
                          row.id_transaksi ||
                          index
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-5 py-4">
                          {getTanggalValue(
                            row
                          ) ||
                            "-"}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {row.id_transaksi ??
                            row.transaksi_id ??
                            row.id ??
                            "-"}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {getNamaYayasan(
                            row
                          ) ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">
                          {row.jenis_sampah ??
                            row.nama_jenis ??
                            "-"}
                        </td>

                        <td className="px-5 py-4">
                          {formatBerat(
                            row.berat
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-emerald-700">
                          {formatRupiah(
                            row.total ??
                              row.nominal ??
                              row.jumlah ??
                              0
                          )}
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      {hasFilter
                        ? "Tidak ada transaksi yang sesuai dengan filter."
                        : "Belum ada data transaksi yayasan."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}