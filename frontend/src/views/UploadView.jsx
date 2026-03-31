import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = '';

const STAGES = [
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'extracting_audio', label: 'Extracting Audio' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'summarizing', label: 'Summarizing' },
  { key: 'extracting_slides', label: 'Extracting Slides' },
  { key: 'complete', label: 'Complete' }
];

export default function UploadView() {
  const [activeTab, setActiveTab] = useState('file');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lectureId, setLectureId] = useState(null);
  const [stage, setStage] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();
  const pollRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('video/')) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, ''));
    }
  }, [title]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    }
  };

  const startPolling = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/status/${id}`);
        setStage(data.stage);
        if (data.stage === 'complete') {
          clearInterval(pollRef.current);
          setTimeout(() => navigate(`/lectures/${id}`), 1200);
        } else if (data.stage === 'failed') {
          clearInterval(pollRef.current);
          setError(data.error || 'Processing failed');
          setUploading(false);
        }
      } catch {
        // ignore poll errors
      }
    }, 2500);
  };

  const handleUpload = async () => {
    if (!file) return;
    setError('');
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title || file.name);

    try {
      const { data } = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      setLectureId(data.lectureId);
      setStage('uploaded');
      startPolling(data.lectureId);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setUploading(false);
    }
  };

  const currentStageIndex = STAGES.findIndex(s => s.key === stage);

  return (
    <div className="container py-5" style={{ maxWidth: 720 }}>
      <h2 className="fw-bold mb-1 text-center">Upload Lecture</h2>
      <p className="text-center text-muted mb-4">Upload an MP4 video and let AI do the rest</p>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'file' ? 'active' : ''}`} onClick={() => setActiveTab('file')}>
            <i className="fas fa-file-video me-2"></i>Upload MP4 File
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'youtube' ? 'active' : ''}`} onClick={() => setActiveTab('youtube')}>
            <i className="fab fa-youtube me-2" style={{ color: '#ff0000' }}></i>YouTube How-to
          </button>
        </li>
      </ul>

      {/* File Upload Tab */}
      {activeTab === 'file' && !uploading && (
        <div>
          {/* Drop zone */}
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            {file ? (
              <div>
                <p className="fw-bold mb-1" style={{ color: '#2575fc' }}>{file.name}</p>
                <small className="text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</small>
              </div>
            ) : (
              <div>
                <p className="fw-bold mb-1">Drag & drop your MP4 here</p>
                <p className="text-muted small mb-0">or click to browse — up to 2GB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/mp4,video/*" hidden onChange={handleFileChange} />
          </div>

          {file && (
            <div className="mt-4">
              <label className="form-label fw-semibold">Lecture Title</label>
              <input
                type="text"
                className="form-control form-control-lg"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter lecture title"
              />
              {error && <div className="alert alert-danger mt-3">{error}</div>}
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary-gradient btn-lg flex-grow-1" onClick={handleUpload}>
                  <i className="fas fa-rocket me-2"></i>Upload & Process
                </button>
                <button className="btn btn-outline-secondary btn-lg" onClick={() => { setFile(null); setTitle(''); setError(''); }}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing state */}
      {uploading && (
        <div className="content-box mt-2">
          {uploadProgress < 100 ? (
            <div>
              <h5 className="fw-bold mb-3"><i className="fas fa-upload me-2 text-primary"></i>Uploading…</h5>
              <div className="progress mb-2" style={{ height: 8 }}>
                <div className="progress-bar" style={{ width: `${uploadProgress}%`, background: 'var(--gradient)' }}></div>
              </div>
              <small className="text-muted">{uploadProgress}% — Please wait, do not close this page</small>
            </div>
          ) : (
            <div>
              <h5 className="fw-bold mb-4"><i className="fas fa-cogs me-2 text-primary"></i>Processing Lecture…</h5>
              <div className="d-flex flex-column gap-2">
                {STAGES.slice(0, -1).map((s, i) => {
                  const done = currentStageIndex > i;
                  const active = currentStageIndex === i;
                  return (
                    <div key={s.key} className="d-flex align-items-center gap-3">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? '#28a745' : active ? '#2575fc' : '#e0e7ff', color: done || active ? 'white' : '#aaa', fontSize: 13, flexShrink: 0 }}>
                        {done ? <i className="fas fa-check"></i> : active ? <i className="fas fa-spinner fa-spin"></i> : i + 1}
                      </div>
                      <span style={{ fontWeight: active ? 700 : 400, color: done ? '#28a745' : active ? '#2575fc' : '#aaa' }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {stage === 'complete' && (
                <div className="alert alert-success mt-4 mb-0">
                  <i className="fas fa-check-circle me-2"></i>Processing complete! Redirecting…
                </div>
              )}
              {error && <div className="alert alert-danger mt-4 mb-0">{error}</div>}
            </div>
          )}
        </div>
      )}

      {/* YouTube tab */}
      {activeTab === 'youtube' && (
        <div className="content-box">
          <div className="text-center mb-4">
            <i className="fab fa-youtube fa-4x" style={{ color: '#ff0000' }}></i>
            <h4 className="fw-bold mt-3">How to Use YouTube Videos</h4>
            <p className="text-muted">Direct YouTube download is not available on cloud servers<br/>(YouTube blocks cloud IPs). Use this workaround:</p>
          </div>
          <div className="d-flex flex-column gap-3">
            {[
              { n: 1, icon: 'fas fa-external-link-alt', title: 'Go to cobalt.tools', desc: 'Open cobalt.tools in your browser — a free YouTube downloader', link: null },
              { n: 2, icon: 'fab fa-youtube', title: 'Paste YouTube URL', desc: 'Copy your lecture\'s YouTube URL and paste it into cobalt.tools' },
              { n: 3, icon: 'fas fa-download', title: 'Download as MP4', desc: 'Select MP4 format and download the video to your computer' },
              { n: 4, icon: 'fas fa-upload', title: 'Upload Here', desc: 'Switch to the "Upload MP4 File" tab and upload the downloaded video' }
            ].map(step => (
              <div key={step.n} className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ background: '#f0f4ff' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  {step.n}
                </div>
                <div>
                  <div className="fw-semibold"><i className={`${step.icon} me-2`} style={{ color: '#2575fc' }}></i>{step.title}</div>
                  <small className="text-muted">{step.desc}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <button className="btn btn-primary-gradient" onClick={() => setActiveTab('file')}>
              <i className="fas fa-arrow-left me-2"></i>Go to File Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
