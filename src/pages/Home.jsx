import { Link } from 'react-router-dom'
import { Sparkles, Brain, Target, Rocket } from 'lucide-react'

function Home() {
  return (
    <div>
      <section className="hero">
        <h1>Transform Your Career with AI</h1>
        <p>Practice interviews with cutting-edge AI technology and showcase your professional portfolio to the world</p>
        <Link to="/ai-interview" className="cta-button">Start AI Interview Practice</Link>
      </section>

      <section className="features">
        <h2>Why Choose Mexty?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Interviews</h3>
            <p>Practice with advanced Gemini AI that adapts to your responses and provides personalized feedback</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Smart Portfolio</h3>
            <p>Showcase your skills and projects in a professional, modern portfolio that stands out</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Track Progress</h3>
            <p>Monitor your improvement with detailed analytics and performance insights</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Career Ready</h3>
            <p>Get interview-ready with realistic practice sessions and expert guidance</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
