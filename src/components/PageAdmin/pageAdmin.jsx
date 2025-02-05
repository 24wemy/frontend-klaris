import React, { useState, useRef, useEffect } from 'react';
import '../PageAdmin/pageAdmin.css';
import { Link } from 'react-router-dom';

const PageAdmin = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState('');
  const backendUrl = 'https://klaris.my.id/backend';
  const testResultRef = useRef(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Pilih file terlebih dahulu.');
      return;
    }

    setUploadStatus('Sedang mengunggah...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus('File berhasil diunggah dan diproses.');
      } else {
        setUploadStatus(`Gagal mengunggah: ${data.message}`);
      }
    } catch (error) {
      console.error('Error during upload:', error);
      setUploadStatus('Terjadi kesalahan saat mengunggah.');
    }
  };

    const handleTestQueryChange = (event) => {
        setTestQuery(event.target.value);
    };

    const handleTestQuery = async () => {
        if (!testQuery) {
            setTestResult('Masukkan query terlebih dahulu.');
            return;
        }

        setTestResult('Sedang memproses query...');

        try {
            const response = await fetch(`${backendUrl}/api/test_query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: testQuery }),
            });
            const data = await response.json();

            if (response.ok) {
                setTestResult(`Jawaban: ${data.answer}`);
            } else {
                setTestResult(`Gagal memproses query: ${data.error}`);
            }

        } catch(error) {
            console.error('Error during query test: ', error);
            setTestResult('Terjadi kesalahan saat melakukan uji coba query.')
        }
    };


    useEffect(() => {
        if (testResultRef.current) {
            testResultRef.current.scrollTop = 0;
        }
    },[testResult])

  return (
    <div className="page-admin-container">
        <h1>Selamat Datang di Halaman Admin!</h1>
        <div className="admin-content">
            <div className="upload-container">
                <h2>Unggah Data</h2>
                <input type="file" onChange={handleFileChange} />
                <button onClick={handleUpload}>Upload</button>
                <p>{uploadStatus}</p>
            </div>
            <div className="test-query-container">
                <h2>Uji Query</h2>
                <input
                    type='text'
                    placeholder='Masukkan query uji coba'
                    value={testQuery}
                    onChange={handleTestQueryChange}
                />
                <button onClick={handleTestQuery}>Tes Query</button>
                <div className="test-result-container" ref={testResultRef}>
                    <p>{testResult}</p>
                </div>
            </div>
            <div className="guidelines-container">
                <h2>Panduan Penggunaan</h2>
                <p>
                    Halaman ini digunakan untuk mengunggah data dan menguji query.
                    Pastikan untuk mengikuti panduan di bawah ini:
                </p>
                <h3>Jenis Data yang Didukung:</h3>
                <ul>
                    <li><b>File PDF:</b> Dokumen dengan format PDF.</li>
                    <li><b>File Teks:</b> Dokumen teks biasa dengan format .txt.</li>
                </ul>
                <h3>Format Data:</h3>
                <ul>
                    <li>Data harus dalam format teks yang dapat dibaca.</li>
                    <li>Untuk PDF, pastikan teks dapat diekstrak dari dokumen.</li>
                </ul>
                <h3>Cara Penggunaan:</h3>
                <ol>
                    <li><b>Unggah Data:</b> Pilih file PDF atau TXT yang ingin diunggah.</li>
                    <li><b>Uji Query:</b> Masukkan query uji coba untuk melihat bagaimana data baru direspon.</li>
                    <li><b>Periksa Hasil:</b> Pastikan hasil query sesuai dengan data yang diunggah.</li>
                </ol>
            </div>
        </div>
        <div className='back-button-container'>
            <Link to="/" className='back-button'>Kembali ke Halaman Utama</Link>
        </div>
    </div>
  );
};

export default PageAdmin;