import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = '';

const stageConfig = {
  uploaded: { color: 'secondary', label: 'Queued', icon: 'fas fa-clock' },
  downloading: { color: 'info', label: 'Downloading', icon: 'fas fa-spinner fa-spin' },
  extracting_audio: { color: 'primary', label: 'Extracting Audio', icon: 'fas fa-spinner fa-spin' },
  transcribing: { color: 'primary', label: 'Transcribing', icon: 'fas fa-spinner fa-spin' },
  summarizing: { color: 'primary', label: 'Summarizing', icon: 'fas fa-spinner fa-spin' },
  extracting_slides: { color: 'primary', label: 'Extracting Slides', icon: 'fas fa-spinner fa-spin' },
  complete: { color: 'success', label: 'Ready', icon: 'fas fa-check-circle' },
  failed: { color: 'danger', label: 'Failed', icon: 'fas fa-exclamation-circle' }
};

function formatDuration(seconds) {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LecturesView() {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLectures = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/lectures`);
      setLectures(data);
    } catch (err) {
      setError('Failed to load lectures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
    const interval = setInterval(fetchLectures, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="container py-5 text-center">
      <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#2575fc' }}></i>
      <p className="mt-3 text-muted">Loading lectures…</p>
    </div>
  );

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1">My Lectures</h2>
          <p className="text-muted mb-0">{lectures.length} lecture{lectures.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/upload" className="btn btn-primary-gradient">
          <i className="fas fa-plus me-2"></i>Upload New
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {lectures.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-book-open fa-4x mb-4" style={{ color: '#c5d5fb' }}></i>
          <h4 className="fw-bold">No lectures yet</h4>
          <p className="text-muted">Upload your first lecture video to get started</p>
          <Link to="/upload" className="btn btn-primary-gradient mt-2">
            <i className="fas fa-upload me-2"></i>Upload Lecture
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {lectures.map(lecture => {
            const cfg = stageConfig[lecture.processingStage] || stageConfig.uploaded;
            const isProcessing = !['complete', 'failed'].includes(lecture.processingStage);
            return (
              <div className="col-sm-6 col-lg-4" key={lecture._id}>
                <Link to={`/lectures/${lecture._id}`} className="lecture-card card h-100 p-0">
                  {/* Header strip */}
                  <div style={{ height: 8, borderRadius: '12px 12px 0 0', background: lecture.processingStage === 'complete' ? '#28a745' : lecture.processingStage === 'failed' ? '#dc3545' : 'var(--gradient)' }}></div>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className={`badge bg-${cfg.color} badge-stage`}>
                        <i className={`${cfg.icon} me-1`}></i>{cfg.label}
                      </span>
                      <small className="text-muted">{formatDate(lecture.uploadDate)}</small>
                    </div>
                    <h5 className="card-title mb-2" style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.4 }}>
                      {lecture.title}
                    </h5>
                    {isProcessing && (
                      <div className="progress mt-2 mb-1" style={{ height: 4 }}>
                        <div className="processing-bar progress-bar" style={{ width: '60%' }}></div>
                      </div>
                    )}
                    <div className="d-flex gap-3 mt-3 text-muted" style={{ fontSize: '0.8rem' }}>
                      <span><i className="fas fa-clock me-1"></i>{formatDuration(lecture.duration)}</span>
                      <span><i className="fas fa-tag me-1"></i>{lecture.source}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
