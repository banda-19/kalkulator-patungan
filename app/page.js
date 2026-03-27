'use client';
import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const receiptRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mode, setMode] = useState('rata'); 
  const [diskon, setDiskon] = useState('');
  const [pajak, setPajak] = useState('');
  const [servis, setServis] = useState('');
  const [bulatkan, setBulatkan] = useState(true);
  const [infoBayar, setInfoBayar] = useState('');

  const [tagihan, setTagihan] = useState('');
  const [orang, setOrang] = useState('2');

  const [items, setItems] = useState([
    { id: 1, nama: '', harga: '' },
    { id: 2, nama: '', harga: '' }
  ]);

  const [pesanSaran, setPesanSaran] = useState('');
  const [statusKirim, setStatusKirim] = useState('idle');

  useEffect(() => {
    setIsMounted(true);
    const savedData = localStorage.getItem('splitbill_data');
    if (savedData) {
      const data = JSON.parse(savedData);
      setMode(data.mode || 'rata');
      setDiskon(data.diskon || '');
      setPajak(data.pajak || '');
      setServis(data.servis || '');
      setBulatkan(data.bulatkan !== undefined ? data.bulatkan : true);
      setInfoBayar(data.infoBayar || '');
      setTagihan(data.tagihan || '');
      setOrang(data.orang || '2');
      if (data.items) setItems(data.items);
      if (data.isDarkMode) setIsDarkMode(data.isDarkMode);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('splitbill_data', JSON.stringify({ mode, diskon, pajak, servis, bulatkan, infoBayar, tagihan, orang, items, isDarkMode }));
    }
  }, [mode, diskon, pajak, servis, bulatkan, infoBayar, tagihan, orang, items, isDarkMode, isMounted]);

  if (!isMounted) return null;

  const pjk = Number(pajak) || 0;
  const srv = Number(servis) || 0;
  const dsk = Number(diskon) || 0;
  const multiplier = 1 + (pjk / 100) + (srv / 100);

  const formatAngka = (angka) => {
    if (!angka) return 0;
    let hasil = Math.max(0, angka);
    if (bulatkan) hasil = Math.ceil(hasil / 1000) * 1000;
    return Math.round(hasil);
  };

  const kotorRata = Number(tagihan) || 0;
  const bersihRata = Math.max(0, kotorRata - dsk);
  const totalRata = bersihRata * multiplier;
  const perOrangRata = formatAngka(totalRata / (Number(orang) || 1));

  const totalHargaKotorBeda = items.reduce((acc, curr) => acc + (Number(curr.harga) || 0), 0);
  const hasilBeda = items.map(item => {
    const hargaAsli = Number(item.harga) || 0;
    const proporsiDiskon = totalHargaKotorBeda > 0 ? (hargaAsli / totalHargaKotorBeda) * dsk : 0;
    const hargaSetelahDiskon = Math.max(0, hargaAsli - proporsiDiskon);
    return { ...item, bayar: formatAngka(hargaSetelahDiskon * multiplier) };
  });
  const grandTotalBeda = hasilBeda.reduce((acc, curr) => acc + curr.bayar, 0);

  const tambahItem = () => setItems([...items, { id: Date.now(), nama: '', harga: '' }]);
  const hapusItem = (id) => setItems(items.filter(item => item.id !== id));
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

  const unduhStruk = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 3, 
        backgroundColor: '#ffffff'
      });
      const link = document.createElement("a");
      link.download = `Struk_Patungan_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal membuat struk", err);
      alert("Gagal mengunduh struk. Coba lagi.");
    }
  };

  const bagikanWA = () => {
    let teks = '';
    const teksBayar = infoBayar ? `\n\n💳 *Transfer ke:* ${infoBayar}` : '';
    const teksDiskon = dsk > 0 ? ` (Udah potong diskon Rp${dsk.toLocaleString('id-ID')})` : '';

    if (mode === 'rata') {
      teks = `Eh guys, total makan kita tadi Rp${kotorRata.toLocaleString('id-ID')}${teksDiskon}.\nKarena dibagi ${orang} orang, per orang transfer *Rp${perOrangRata.toLocaleString('id-ID')}* ya! (Inc. Pajak/Servis) 💸${teksBayar}`;
    } else {
      teks = `Eh guys, ini rincian patungan makan kita${teksDiskon} plus pajak ${pjk}% & servis ${srv}%:\n\n`;
      hasilBeda.forEach(i => {
        if (i.nama || i.harga) {
          teks += `▪️ ${i.nama || 'Tanpa Nama'}: *Rp${i.bayar.toLocaleString('id-ID')}*\n`;
        }
      });
      teks += `\n*(Total kumpul: Rp${grandTotalBeda.toLocaleString('id-ID')})* 💸${teksBayar}`;
    }
    teks += `\n\n_Dihitung otomatis pakai: kalkulator patungan v1.0_`; 
    window.open(`https://wa.me/?text=${encodeURIComponent(teks)}`, '_blank');
  };

  const kirimSaran = async (e) => {
    e.preventDefault();
    setStatusKirim('loading');
    const accessKey = '4c776fef-3cd3-42f3-93f6-9fcebf4f8cda'; 
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: accessKey, message: pesanSaran, subject: '💡 Saran Kalkulator', from_name: 'Pengunjung Web' }),
      });
      if ((await response.json()).success) {
        setStatusKirim('success');
        setPesanSaran('');
      } else setStatusKirim('error');
    } catch (error) { setStatusKirim('error'); }
  };

  const tanggalHariIni = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-10 px-4 transition-colors duration-300">
        
        <div className="w-full max-w-md flex justify-end mb-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-800 dark:text-yellow-400 border border-gray-200 dark:border-gray-700 transition-all">
            {isDarkMode ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700 transition-colors">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">💸 Split Bill Cepat</h1>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
            <button onClick={() => setMode('rata')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'rata' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-300'}`}>Bagi Rata</button>
            <button onClick={() => setMode('beda')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'beda' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-300'}`}>Beda-Beda</button>
          </div>

          <div className="space-y-4 mb-6 border-b dark:border-gray-700 pb-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Diskon Resto (Nominal Rp)</label>
              <input type="number" placeholder="Contoh: 50000" value={diskon} onChange={(e) => setDiskon(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold placeholder-gray-400" />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pajak (%)</label>
                <input type="number" placeholder="Misal: 11" value={pajak} onChange={(e) => setPajak(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold placeholder-gray-400" />
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Servis (%)</label>
                <input type="number" placeholder="Misal: 5" value={servis} onChange={(e) => setServis(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold placeholder-gray-400" />
              </div>
            </div>
          </div>

          {mode === 'rata' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total Tagihan Dasar (Rp)</label>
                <input type="number" placeholder="Contoh: 150000" value={tagihan} onChange={(e) => setTagihan(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-lg placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Dibagi Berapa Orang?</label>
                <input type="number" min="1" value={orang} onChange={(e) => setOrang(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-lg placeholder-gray-400" />
              </div>
              <div className="mt-6 bg-blue-50 dark:bg-blue-900 border border-blue-100 dark:border-blue-800 p-6 rounded-xl text-center">
                <p className="text-gray-500 dark:text-blue-200 text-sm font-medium mb-1">Seorang Bayar:</p>
                <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-300">Rp{perOrangRata.toLocaleString('id-ID')}</p>
              </div>
            </div>
          )}

          {mode === 'beda' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Daftar Orang & Harga Makanan</label>
              <div>
                {items.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border dark:border-gray-600 mb-2">
                    <input type="text" placeholder="Nama" value={item.nama} onChange={(e) => updateItem(item.id, 'nama', e.target.value)} className="w-1/3 p-2 text-sm border-r dark:border-gray-500 bg-transparent outline-none text-gray-900 dark:text-white font-semibold placeholder-gray-400" />
                    <input type="number" placeholder="Harga (Rp)" value={item.harga} onChange={(e) => updateItem(item.id, 'harga', e.target.value)} className="w-1/2 p-2 text-sm bg-transparent outline-none text-gray-900 dark:text-white font-semibold placeholder-gray-400" />
                    <button onClick={() => hapusItem(item.id)} className="w-1/6 text-red-400 hover:text-red-600 font-bold text-xl">×</button>
                  </div>
                ))}
                <button onClick={tambahItem} className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-all">+ Tambah Orang Lain</button>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 border-b dark:border-gray-700 pb-2">🧾 Rincian Akhir (Inc. Pajak/Servis/Diskon):</p>
                {hasilBeda.map((h) => (
                  <div key={h.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{h.nama || 'Tanpa Nama'}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">Rp{h.bayar.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t dark:border-gray-700 pt-4 mt-6">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Transfer ke (Bank / E-Wallet)</label>
            <input type="text" placeholder="Contoh: BCA 123456 a.n Budi" value={infoBayar} onChange={(e) => setInfoBayar(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold placeholder-gray-400" />
          </div>

          <div>
            <div className="mt-6 flex items-center justify-center gap-2 mb-4">
              <input type="checkbox" id="bulatkan" checked={bulatkan} onChange={(e) => setBulatkan(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
              <label htmlFor="bulatkan" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">Bulatkan tagihan ke atas (Ribuan)</label>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={unduhStruk} className="w-1/3 bg-gray-800 dark:bg-gray-100 hover:bg-gray-900 dark:hover:bg-white text-white dark:text-gray-900 font-bold py-3 px-2 rounded-lg shadow transition-all flex justify-center items-center text-xs text-center">
                📸 Simpan Struk
              </button>
              <button onClick={bagikanWA} className="w-2/3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold py-3 px-4 rounded-lg shadow transition-all flex justify-center items-center gap-2 text-sm">
                📱 Bagikan WA
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center w-full max-w-md">
          <a href="https://saweria.co/Banda23" target="_blank" rel="noreferrer" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 px-6 rounded-full shadow transition-all mb-8">
            ☕ Traktir Developer Kopi
          </a>

          {/* FORM SARAN YANG TADI HILANG SUDAH KEMBALI */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 text-left transition-colors">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">💡 Ada Masukan?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Kasih tahu developer fitur apa yang kurang dari web ini.</p>
            
            <form onSubmit={kirimSaran}>
              <textarea required rows="3" placeholder="Tulis saran atau nemu error di sini..." value={pesanSaran} onChange={(e) => setPesanSaran(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mb-3 resize-none"></textarea>
              <button type="submit" disabled={statusKirim === 'loading'} className={`w-full font-bold py-2 px-4 rounded-lg transition-all text-sm ${statusKirim === 'loading' ? 'bg-gray-300 text-gray-500' : statusKirim === 'success' ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                {statusKirim === 'loading' ? 'Mengirim...' : statusKirim === 'success' ? '✅ Pesan Terkirim!' : 'Kirim Pesan'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* STRUK TERSEMBUNYI UNTUK DI-DOWNLOAD */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
        <div ref={receiptRef} className="bg-white text-black w-[350px] p-6 font-mono text-sm leading-relaxed tracking-tight">
          
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-1">SPLIT BILL</h2>
            <p className="text-xs text-gray-600">Patungan Gak Pake Ribet</p>
            <p className="text-xs text-gray-600 mt-2">{tanggalHariIni}</p>
          </div>
          
          <div className="border-b-2 border-dashed border-gray-400 mb-4"></div>

          {mode === 'rata' ? (
             <div>
               <div className="flex justify-between mb-1">
                 <span>Tagihan Awal</span>
                 <span>Rp{kotorRata.toLocaleString('id-ID')}</span>
               </div>
               <div className="flex justify-between mb-1">
                 <span>Dibagi</span>
                 <span>{orang} Orang</span>
               </div>
             </div>
          ) : (
            <div>
              <p className="font-bold mb-2">Daftar Pesanan:</p>
              {items.map((i, idx) => (
                 (i.nama || i.harga) && (
                   <div key={idx} className="flex justify-between mb-1">
                     <span className="truncate w-1/2">{i.nama || 'Item'}</span>
                     <span>Rp{Number(i.harga || 0).toLocaleString('id-ID')}</span>
                   </div>
                 )
              ))}
              <div className="flex justify-between font-bold mt-2">
                 <span>Total Kotor</span>
                 <span>Rp{totalHargaKotorBeda.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          <div className="border-b-2 border-dashed border-gray-400 my-4"></div>

          <div className="text-xs">
             {dsk > 0 && (
               <div className="flex justify-between mb-1 text-red-600">
                 <span>Diskon</span>
                 <span>- Rp{dsk.toLocaleString('id-ID')}</span>
               </div>
             )}
             <div className="flex justify-between mb-1">
               <span>Pajak</span>
               <span>{pajak || 0}%</span>
             </div>
             <div className="flex justify-between mb-1">
               <span>Servis</span>
               <span>{servis || 0}%</span>
             </div>
          </div>

          <div className="border-b-2 border-dashed border-gray-400 my-4"></div>

          {mode === 'rata' ? (
            <div className="text-center bg-gray-100 p-3 rounded-lg border border-gray-300">
              <p className="text-xs mb-1">Per Orang Bayar:</p>
              <p className="text-2xl font-bold">Rp{perOrangRata.toLocaleString('id-ID')}</p>
            </div>
          ) : (
            <div>
              <p className="font-bold mb-2">Tagihan Per Orang (Inc. Pjk/Srv/Dsk):</p>
              {hasilBeda.map((h, idx) => (
                (h.nama || h.harga) && (
                  <div key={idx} className="flex justify-between mb-1 font-bold text-base">
                    <span className="truncate w-1/2">{h.nama || 'Item'}</span>
                    <span>Rp{h.bayar.toLocaleString('id-ID')}</span>
                  </div>
                )
              ))}
              <div className="border-t border-gray-400 mt-2 pt-2 flex justify-between text-xs">
                <span>Total Kumpul:</span>
                <span>Rp{grandTotalBeda.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          {infoBayar && (
            <div className="mt-4 p-3 border-2 border-black rounded-lg text-center">
              <p className="text-xs mb-1">💳 Transfer Ke:</p>
              <p className="font-bold text-sm">{infoBayar}</p>
            </div>
          )}

          <div className="text-center mt-6 text-xs text-gray-500">
            <p className="font-bold">✨ Kalkulator Patungan Makan ✨</p>
            <p className="mt-1">Terima Kasih!</p>
          </div>

        </div>
      </div>
    </div>
  );
}