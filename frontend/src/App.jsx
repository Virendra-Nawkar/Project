import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView';
import UploadView from './views/UploadView';
import LecturesView from './views/LecturesView';
import LectureDetailView from './views/LectureDetailView';

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white sticky-top">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <i className="fas fa-tree me-2" style={{ color: '#2575fc' }}></i>
          Study Tree
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navMenu">
          <ul className="navbar-nav ms-auto gap-1">
            <li className="nav-item">
              <NavLink className="nav-link" to="/">Home</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/upload">Upload</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/lectures">My Lectures</NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="py-4 mt-5" style={{ background: '#1a1a2e', color: '#aaa' }}>
      <div className="container text-center">
        <div className="mb-2">
          <span style={{ fontWeight: 700, color: '#2575fc' }}>Study Tree</span>
          <span className="ms-2">— AI-Powered Lecture Learning System</span>
        </div>
        <small>Upload lectures &rarr; Get transcripts, summaries, quizzes &amp; slides automatically</small>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Navbar />
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/upload" element={<UploadView />} />
            <Route path="/lectures" element={<LecturesView />} />
            <Route path="/lectures/:id" element={<LectureDetailView />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
