import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: 'fas fa-microphone-alt',
    title: 'AI Transcription',
    desc: 'Automatic speech-to-text using Whisper. Get accurate transcripts of your lectures instantly.',
    color: '#2575fc'
  },
  {
    icon: 'fas fa-question-circle',
    title: 'Smart Quizzes',
    desc: 'AI generates 5 MCQ questions from lecture content to test your understanding.',
    color: '#6a11cb'
  },
  {
    icon: 'fas fa-comments',
    title: 'Q&A Chatbot',
    desc: 'Ask questions about any lecture and get AI-powered answers based on the transcript.',
    color: '#11cb6a'
  },
  {
    icon: 'fas fa-images',
    title: 'Slide Extraction',
    desc: 'Automatically extract and download key frames as a PowerPoint presentation.',
    color: '#fc7b25'
  }
];

export default function HomeView() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-section">
        <div className="container text-center">
          <div className="mb-3">
            <i className="fas fa-tree fa-3x" style={{ color: 'rgba(255,255,255,0.85)' }}></i>
          </div>
          <h1>Study Tree</h1>
          <p className="mb-4 mx-auto" style={{ maxWidth: 560 }}>
            Transform your lecture videos into interactive learning materials — transcripts,
            summaries, quizzes, slides, and AI chatbot, all automatically.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/upload" className="btn btn-light btn-lg px-4 fw-bold" style={{ color: '#2575fc' }}>
              <i className="fas fa-upload me-2"></i>Upload Lecture
            </Link>
            <Link to="/lectures" className="btn btn-outline-light btn-lg px-4">
              <i className="fas fa-book-open me-2"></i>My Lectures
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-5 mt-3">
        <h2 className="text-center fw-bold mb-2" style={{ color: '#1a1a2e' }}>What Study Tree Does</h2>
        <p className="text-center text-muted mb-5">Upload once — get everything automatically</p>
        <div className="row g-4">
          {features.map((f, i) => (
            <div className="col-sm-6 col-lg-3" key={i}>
              <div className="feature-card card p-4 text-center h-100">
                <div className="feature-icon" style={{ background: `linear-gradient(135deg, ${f.color}88, ${f.color})` }}>
                  <i className={f.icon}></i>
                </div>
                <h5 className="fw-bold mb-2">{f.title}</h5>
                <p className="text-muted small mb-0">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: 'white' }} className="py-5">
        <div className="container">
          <h2 className="text-center fw-bold mb-5">How It Works</h2>
          <div className="row g-4 align-items-center">
            {[
              { step: '01', icon: 'fas fa-upload', title: 'Upload MP4', desc: 'Upload your lecture video file (up to 2GB)' },
              { step: '02', icon: 'fas fa-cogs', title: 'AI Processing', desc: 'Whisper transcribes, AI summarizes and generates quiz' },
              { step: '03', icon: 'fas fa-film', title: 'Slides Extracted', desc: 'Key frames extracted using intelligent slide detection' },
              { step: '04', icon: 'fas fa-graduation-cap', title: 'Start Learning', desc: 'Read, quiz yourself, and chat with your lecture' }
            ].map((item, i) => (
              <div className="col-sm-6 col-lg-3 text-center" key={i}>
                <div className="mb-3">
                  <span className="badge rounded-pill px-3 py-2 mb-3" style={{ background: 'var(--gradient)', fontSize: '0.85rem' }}>
                    Step {item.step}
                  </span>
                  <div className="feature-icon mx-auto">
                    <i className={item.icon}></i>
                  </div>
                  <h6 className="fw-bold">{item.title}</h6>
                  <p className="text-muted small">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-3">
            <Link to="/upload" className="btn btn-primary-gradient btn-lg">
              <i className="fas fa-rocket me-2"></i>Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
