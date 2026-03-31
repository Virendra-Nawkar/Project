import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = '';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ lecture }) {
  const statusItems = [
    {
      label: 'Transcript',
      done: !!lecture.transcriptMd,
      icon: 'fas fa-file-alt',
      color: '#2575fc'
    },
    {
      label: 'Summary',
      done: !!lecture.summaryMd,
      icon: 'fas fa-list-alt',
      color: '#6a11cb'
    },
    {
      label: 'Quiz',
      done: lecture.quizzes?.length > 0,
      icon: 'fas fa-question-circle',
      color: '#11cb6a'
    },
    {
      label: 'Slides',
      done: lecture.slides?.length > 0,
      icon: 'fas fa-images',
      color: '#fc7b25'
    }
  ];

  return (
    <div>
      <div className="status-grid mb-4">
        {statusItems.map(item => (
          <div key={item.label} className="status-item">
            <div className="status-icon" style={{ color: item.done ? item.color : '#ccc' }}>
              <i className={item.icon}></i>
            </div>
            <div className="fw-semibold">{item.label}</div>
            <div>
              {item.done ? (
                <span className="badge bg-success">Ready</span>
              ) : (
                <span className="badge bg-secondary">Pending</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {lecture.duration && (
        <div className="content-box">
          <div className="row g-3 text-center">
            <div className="col-4">
              <div className="fw-bold fs-4" style={{ color: '#2575fc' }}>{formatTime(lecture.duration)}</div>
              <small className="text-muted">Duration</small>
            </div>
            <div className="col-4">
              <div className="fw-bold fs-4" style={{ color: '#6a11cb' }}>{lecture.slides?.length || 0}</div>
              <small className="text-muted">Slides</small>
            </div>
            <div className="col-4">
              <div className="fw-bold fs-4" style={{ color: '#11cb6a' }}>{lecture.quizzes?.length || 0}</div>
              <small className="text-muted">Quiz Questions</small>
            </div>
          </div>
        </div>
      )}

      {lecture.processingStage === 'failed' && lecture.processingError && (
        <div className="alert alert-danger mt-4">
          <strong>Processing Error:</strong> {lecture.processingError}
        </div>
      )}

      {!['complete', 'failed'].includes(lecture.processingStage) && (
        <div className="alert alert-info mt-4">
          <i className="fas fa-spinner fa-spin me-2"></i>
          Currently processing: <strong>{lecture.processingStage?.replace(/_/g, ' ')}</strong>
        </div>
      )}
    </div>
  );
}

// ── Transcript Tab ─────────────────────────────────────────────────────────────
function TranscriptTab({ lecture }) {
  if (!lecture.transcriptHtml && !lecture.transcriptMd) {
    return <div className="alert alert-info">Transcript not available yet.</div>;
  }
  return (
    <div className="content-box">
      {lecture.transcriptHtml ? (
        <div dangerouslySetInnerHTML={{ __html: lecture.transcriptHtml }} />
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{lecture.transcriptMd}</pre>
      )}
    </div>
  );
}

// ── Summary Tab ────────────────────────────────────────────────────────────────
function SummaryTab({ lecture }) {
  if (!lecture.summaryHtml && !lecture.summaryMd) {
    return <div className="alert alert-info">Summary not available yet.</div>;
  }
  return (
    <div className="content-box">
      {lecture.summaryHtml ? (
        <div dangerouslySetInnerHTML={{ __html: lecture.summaryHtml }} />
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{lecture.summaryMd}</pre>
      )}
    </div>
  );
}

// ── Quiz Tab ───────────────────────────────────────────────────────────────────
function QuizTab({ lecture }) {
  const [answers, setAnswers] = useState({});

  if (!lecture.quizzes || lecture.quizzes.length === 0) {
    return <div className="alert alert-info">Quiz not available yet.</div>;
  }

  const handleAnswer = (qIdx, optIdx) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const score = Object.entries(answers).filter(([qi, ai]) => lecture.quizzes[qi]?.correctAnswer === ai).length;

  return (
    <div>
      {Object.keys(answers).length === lecture.quizzes.length && (
        <div className="alert alert-success mb-4 fw-semibold fs-5 text-center">
          Score: {score} / {lecture.quizzes.length}
          {score === lecture.quizzes.length ? ' 🎉 Perfect!' : score >= lecture.quizzes.length * 0.6 ? ' 👍 Good job!' : ' 📖 Keep studying!'}
        </div>
      )}

      {lecture.quizzes.map((q, qi) => {
        const selected = answers[qi];
        const revealed = selected !== undefined;
        return (
          <div key={qi} className="mb-5">
            <h6 className="fw-bold mb-3">
              <span className="badge me-2" style={{ background: 'var(--gradient)' }}>Q{qi + 1}</span>
              {q.question}
            </h6>
            <div>
              {q.options.map((opt, oi) => {
                let cls = 'quiz-option';
                if (revealed) {
                  cls += ' revealed';
                  if (oi === q.correctAnswer) cls += ' correct';
                  else if (oi === selected) cls += ' incorrect';
                }
                return (
                  <div key={oi} className={cls} onClick={() => handleAnswer(qi, oi)}>
                    <span className="me-2 fw-bold">{String.fromCharCode(65 + oi)}.</span>{opt}
                    {revealed && oi === q.correctAnswer && <i className="fas fa-check ms-2"></i>}
                    {revealed && oi === selected && oi !== q.correctAnswer && <i className="fas fa-times ms-2"></i>}
                  </div>
                );
              })}
            </div>
            {revealed && q.explanation && (
              <div className="mt-2 p-3 rounded-3" style={{ background: '#f0f4ff', borderLeft: '3px solid #2575fc', fontSize: '0.9rem' }}>
                <i className="fas fa-lightbulb me-2" style={{ color: '#2575fc' }}></i>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Slides Tab ─────────────────────────────────────────────────────────────────
function SlidesTab({ lecture }) {
  const handleDownload = () => {
    window.open(`${API_BASE}/api/lectures/${lecture._id}/download-ppt`, '_blank');
  };

  if (!lecture.slides || lecture.slides.length === 0) {
    return <div className="alert alert-info">Slides not available yet.</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <span className="text-muted">{lecture.slides.length} slides extracted</span>
        <button className="btn btn-primary-gradient" onClick={handleDownload}>
          <i className="fas fa-file-powerpoint me-2"></i>Download as PowerPoint
        </button>
      </div>
      <div className="slide-grid">
        {lecture.slides.map((slide, i) => (
          <div key={i} className="slide-item">
            <img
              src={`${API_BASE}/uploads${slide.image}`}
              alt={`Slide ${i + 1}`}
              loading="lazy"
              onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" style="background:%23eee"><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Image unavailable</text></svg>'; }}
            />
            <div className="slide-timestamp">{formatTime(slide.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chat Tab ───────────────────────────────────────────────────────────────────
function ChatTab({ lecture }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I've read the lecture "${lecture.title}". Ask me anything about it!` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const { data } = await axios.post(`${API_BASE}/api/chat/${lecture._id}`, {
        message: userMsg,
        history
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!lecture.transcriptMd) {
    return <div className="alert alert-info">Chat is available once transcription is complete.</div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <i className="fas fa-spinner fa-spin me-2"></i>Thinking…
          </div>
        )}
        <div ref={bottomRef}></div>
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Ask a question about this lecture…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Transcript', 'Summary', 'Quiz', 'Slides', 'Chat'];

export default function LectureDetailView() {
  const { id } = useParams();
  const [lecture, setLecture] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLecture = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/lectures/${id}`);
        setLecture(data);
      } catch (err) {
        setError('Lecture not found');
      } finally {
        setLoading(false);
      }
    };

    fetchLecture();

    // Poll if still processing
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/lectures/${id}`);
        setLecture(data);
        if (['complete', 'failed'].includes(data.processingStage)) clearInterval(interval);
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  if (loading) return (
    <div className="container py-5 text-center">
      <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#2575fc' }}></i>
    </div>
  );

  if (error || !lecture) return (
    <div className="container py-5">
      <div className="alert alert-danger">{error || 'Lecture not found'}</div>
      <Link to="/lectures" className="btn btn-outline-primary">Back to Lectures</Link>
    </div>
  );

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="mb-4">
        <Link to="/lectures" className="text-muted small text-decoration-none">
          <i className="fas fa-arrow-left me-1"></i>All Lectures
        </Link>
        <h2 className="fw-bold mt-2 mb-1">{lecture.title}</h2>
        <div className="d-flex gap-3 text-muted" style={{ fontSize: '0.85rem' }}>
          {lecture.duration && <span><i className="fas fa-clock me-1"></i>{formatTime(lecture.duration)}</span>}
          <span><i className="fas fa-calendar me-1"></i>{new Date(lecture.uploadDate).toLocaleDateString()}</span>
          <span><i className="fas fa-tag me-1"></i>{lecture.source}</span>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {TABS.map(tab => (
          <li className="nav-item" key={tab}>
            <button
              className={`nav-link ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Content */}
      {activeTab === 'Overview' && <OverviewTab lecture={lecture} />}
      {activeTab === 'Transcript' && <TranscriptTab lecture={lecture} />}
      {activeTab === 'Summary' && <SummaryTab lecture={lecture} />}
      {activeTab === 'Quiz' && <QuizTab lecture={lecture} />}
      {activeTab === 'Slides' && <SlidesTab lecture={lecture} />}
      {activeTab === 'Chat' && <ChatTab lecture={lecture} />}
    </div>
  );
}
