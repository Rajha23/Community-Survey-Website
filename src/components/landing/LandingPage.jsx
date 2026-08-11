import React, { useEffect } from 'react';

export default function LandingPage({ onViewChange }) {
  useEffect(() => {
    const handleScroll = () => {
      const reveals = document.querySelectorAll('.reveal-on-scroll');
      for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const elementTop = reveals[i].getBoundingClientRect().top;
        const elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
          reveals[i].classList.add('reveal-visible');
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger on load
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative z-10 w-full">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <a href="#" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center text-brand-yellow border-2 border-white/10 group-hover:border-brand-yellow/50 transition-colors">
                 <span className="font-bold font-serif">CS</span>
              </div>
              <span className="font-semibold text-lg tracking-wide text-white group-hover:text-brand-yellow transition-colors">Community Survey</span>
            </a>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">About</a>
              <a href="#focus" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">Focus Areas</a>
              <button 
                onClick={() => onViewChange('student-login')}
                className="px-6 py-2 rounded-full bg-brand-yellow text-black font-semibold text-sm hover:bg-[#fef08a] transition-all transform hover:scale-105">
                Portal Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-40 pb-20 px-6 max-w-4xl mx-auto flex flex-col items-center text-center">
        <h1 className="reveal-on-scroll text-4xl md:text-6xl lg:text-7xl font-serif font-medium text-white mb-8 leading-tight tracking-tight">
          "Transforming communities with <br />
          <span className="italic text-text-secondary bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-gray-600">actionable data</span>"
        </h1>

        <div className="reveal-on-scroll flex flex-col sm:flex-row gap-4 mt-4">
          <button onClick={() => onViewChange('student-login')} className="px-8 py-3 rounded-full bg-brand-yellow text-black font-semibold hover:scale-105 transition-transform shadow-lg shadow-brand-yellow/20">
            Student Login
          </button>
          <button onClick={() => onViewChange('admin-login')} className="px-8 py-3 rounded-full border border-white/20 text-white hover:bg-white/5 transition-all">
            Admin Login
          </button>
        </div>

        <div className="mt-24 text-text-muted animate-bounce-slow">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4.1 12 6"></path><path d="m5.1 8-2.9-.8"></path><path d="m6 12-1.9 2"></path><path d="M7.2 2.2 8 5.1"></path><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"></path></svg>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-black/60 backdrop-blur-md border-y border-white/5 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="reveal-on-scroll relative group order-2 md:order-1">
            <div className="absolute inset-0 bg-brand-yellow/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 rotate-2 group-hover:rotate-0 transition-transform duration-500 shadow-2xl">
              <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1000&auto=format&fit=crop" alt="Community" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100" />
            </div>
          </div>
          
          <div className="reveal-on-scroll order-1 md:order-2 space-y-8">
            <div className="inline-block px-4 py-1.5 rounded-full border border-brand-yellow/30 bg-brand-yellow/5 text-brand-yellow text-sm font-medium tracking-wide">
              About the Initiative
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">
              Shaping the future with <br />
              <span className="text-text-secondary italic">community voices.</span>
            </h2>
            <div className="space-y-6 text-text-secondary text-lg leading-relaxed">
              <p>
                The Community Survey Portal bridges the gap between students, educators, and administrators to gather meaningful insights. Our philosophy is simple: data should drive impact.
              </p>
              <p>
                By participating in this survey, you contribute directly to improving local infrastructure, educational programs, and community well-being.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Areas */}
      <section id="focus" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="reveal-on-scroll text-center mb-16">
          <h2 className="text-4xl font-serif text-white mb-3">Key Focus Areas</h2>
          <div className="h-1 w-20 bg-brand-green mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
          <div className="reveal-on-scroll md:col-span-2 group relative bg-white/5 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 overflow-hidden hover:border-brand-green/30 hover:bg-white/[0.07] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row gap-8 md:items-center h-full">
                  <div className="flex-1">
                      <h3 className="text-2xl font-medium text-white mb-2">Education & Infrastructure</h3>
                      <p className="text-text-secondary mb-6 leading-relaxed">Gathering data on local schools, digital access, and public infrastructure to identify areas needing immediate investment.</p>
                  </div>
              </div>
          </div>

          <div className="reveal-on-scroll group relative bg-white/5 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 overflow-hidden hover:border-brand-yellow/30 hover:bg-white/[0.07] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-yellow/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="relative z-10">
                  <h3 className="text-xl font-medium text-white mb-2">Healthcare</h3>
                  <p className="text-text-muted text-sm leading-relaxed">Assessing community access to healthcare facilities and well-being programs.</p>
              </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="pt-20 pb-10 px-6 border-t border-white/5 bg-brand-bg">
         <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 text-text-muted text-sm">
               <p>© 2024 Community Survey Portal</p>
            </div>
         </div>
      </footer>
    </div>
  );
}
