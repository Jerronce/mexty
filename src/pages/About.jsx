function About() {
  return (
    <div className="features">
      <h1>About Mexty</h1>
      <p style={{textAlign: 'center', maxWidth: '800px', margin: '0 auto 3rem'}}>Mexty is your AI-powered career companion, combining cutting-edge interview practice with professional portfolio showcasing.</p>
      
      <div className="feature-grid">
        <div className="feature-card">
          <h3>🎯 Our Mission</h3>
          <p>To democratize interview preparation and professional development by making AI-powered coaching accessible to everyone.</p>
        </div>
        
        <div className="feature-card">
          <h3>💡 The Technology</h3>
          <p>Built with React, Firebase, and Google's Gemini AI, we leverage the latest in web and AI technologies to deliver exceptional user experiences.</p>
        </div>
        
        <div className="feature-card">
          <h3>📈 Your Growth</h3>
          <p>Our platform tracks your progress, identifies areas for improvement, and helps you build confidence for your next interview.</p>
        </div>
        
        <div className="feature-card">
          <h3>🌐 Global Impact</h3>
          <p>Join thousands of professionals worldwide who are using Mexty to advance their careers and land their dream jobs.</p>
        </div>
      </div>
    </div>
  )
}

export default About
