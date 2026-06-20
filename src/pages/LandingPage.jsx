import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState('menu');
  
  // Particle Canvas refs
  const canvasRef = useRef(null);
  
  // Stats counter trigger refs
  const statsRef = useRef(null);
  const [stats, setStats] = useState({
    restaurants: 0,
    security: 0,
    orders: 0,
    rating: 0
  });

  // 1. Auth Status Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session?.user);
      } catch (err) {
        console.error('Error checking auth on landing page:', err);
      }
    };
    checkAuth();
  }, []);



  // 3. Navigation Bar Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 4. Particle System Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    let particles = [];
    let animationFrameId;

    const resize = () => {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 25 : 65;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * .3,
        vy: (Math.random() - .5) * .3,
        r: Math.random() * 1.5 + .5,
        o: Math.random() * .5 + .1
      });
    }

    const drawParticles = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);
      const maxDistSq = 14400; // 120 * 120

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap edges
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 149, 42, ${p.o})`;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(201, 149, 42, ${.15 * (1 - dist / 120)})`;
            ctx.lineWidth = .5;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(drawParticles);
    };
    drawParticles();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 5. Stat Counter IntersectionObserver
  useEffect(() => {
    const targetStats = {
      restaurants: 200,
      security: 98,
      orders: 40,
      rating: 4.9
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const duration = 2000;
          const start = performance.now();

          const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out

            setStats({
              restaurants: Math.round(targetStats.restaurants * ease),
              security: Math.round(targetStats.security * ease),
              orders: Math.round(targetStats.orders * ease),
              rating: parseFloat((targetStats.rating * ease).toFixed(1))
            });

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setStats(targetStats);
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    const currentStatsRef = statsRef.current;
    if (currentStatsRef) {
      observer.observe(currentStatsRef);
    }

    return () => {
      if (currentStatsRef) {
        observer.unobserve(currentStatsRef);
      }
    };
  }, []);

  // 6. Scroll Reveal Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // 7. Navigation Actions
  const handleFeatureKeyDown = (e, feature) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveFeature(feature);
    }
  };

  const handleCtaClick = async () => {
    if (isLoggedIn) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email?.toLowerCase();
        const ADMIN_EMAILS = ['sunnykiran715@gmail.com', 'revanthrevanth4248@gmail.com'];
        if (email && ADMIN_EMAILS.includes(email)) {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        navigate('/dashboard');
      }
    } else {
      navigate('/register');
    }
  };

  // 8. Render Dynamic Feature Previews
  const renderPreviewContent = () => {
    switch (activeFeature) {
      case 'menu':
        return (
          <>
            <div className="preview-bar">
              <div className="preview-dot" style={{ background: '#FF5F57' }}></div>
              <div className="preview-dot" style={{ background: '#FEBC2E' }}></div>
              <div className="preview-dot" style={{ background: '#28C840' }}></div>
              <span style={{ fontSize: '12px', color: 'rgba(249,243,232,0.4)', marginLeft: '8px' }}>menu.qconnect.in/spicegarden</span>
            </div>
            <div className="preview-screen">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 'bold' }}>Spice Garden</h4>
                  <p style={{ fontSize: '11px', color: 'rgba(249,243,232,0.4)', margin: 0 }}>Choose your favorite starters & mains</p>
                </div>
                <div style={{ background: 'rgba(201,149,42,0.1)', color: 'var(--gold)', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>Table 5</div>
              </div>
              <div className="phone-menu-item">
                <div className="phone-item-thumb" style={{ background: 'linear-gradient(135deg, #C4541F, #E87D4A)' }}></div>
                <div>
                  <div className="phone-item-name">Paneer Tikka</div>
                  <div className="phone-item-price">₹ 280</div>
                </div>
                <div className="phone-item-add">+</div>
              </div>
              <div className="phone-menu-item">
                <div className="phone-item-thumb" style={{ background: 'linear-gradient(135deg, #3A5A3C, #5A8C5C)' }}></div>
                <div>
                  <div className="phone-item-name">Dal Makhani</div>
                  <div className="phone-item-price">₹ 220</div>
                </div>
                <div className="phone-item-add">+</div>
              </div>
              <div className="phone-menu-item">
                <div className="phone-item-thumb" style={{ background: 'linear-gradient(135deg, #8B4513, #C4841A)' }}></div>
                <div>
                  <div className="phone-item-name">Butter Chicken</div>
                  <div className="phone-item-price">₹ 340</div>
                </div>
                <div className="phone-item-add">+</div>
              </div>
            </div>
          </>
        );
      case 'orders':
        return (
          <>
            <div className="preview-bar">
              <div className="preview-dot" style={{ background: '#FF5F57' }}></div>
              <div className="preview-dot" style={{ background: '#FEBC2E' }}></div>
              <div className="preview-dot" style={{ background: '#28C840' }}></div>
              <span style={{ fontSize: '12px', color: 'rgba(249,243,232,0.4)', marginLeft: '8px' }}>kds.qconnect.in/live-orders</span>
            </div>
            <div className="preview-screen" style={{ gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Kitchen KDS Display</span>
                <span style={{ fontSize: '10px', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', padding: '2px 6px', borderRadius: '4px' }}>● Live Sync</span>
              </div>
              <div className="phone-menu-item" style={{ background: 'rgba(139, 58, 26, 0.08)', borderColor: 'rgba(139, 58, 26, 0.3)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Table 3 (Order #824)</span>
                    <span style={{ color: 'var(--gold-light)', fontSize: '11px', fontWeight: 'bold' }}>Preparing (4m ago)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(249,243,232,0.7)', margin: 0 }}>
                    1x Paneer Tikka, 2x Garlic Naan, 1x Dal Makhani
                  </div>
                </div>
              </div>
              <div className="phone-menu-item" style={{ background: 'rgba(201, 149, 42, 0.05)', borderColor: 'rgba(201, 149, 42, 0.2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Table 7 (Order #825)</span>
                    <span style={{ color: '#FFC107', fontSize: '11px', fontWeight: 'bold' }}>New Order (1m ago)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(249,243,232,0.7)', margin: 0 }}>
                    2x Butter Chicken, 4x Tandoori Roti
                  </div>
                </div>
              </div>
              <div className="phone-menu-item" style={{ background: 'rgba(58, 90, 60, 0.05)', borderColor: 'rgba(58, 90, 60, 0.2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Table 12 (Order #821)</span>
                    <span style={{ color: '#4CAF50', fontSize: '11px', fontWeight: 'bold' }}>Served (12m ago)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(249, 243, 232, 0.5)', margin: 0 }}>
                    1x Gulab Jamun, 1x Masala Chai
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'waiter':
        return (
          <>
            <div className="preview-bar">
              <div className="preview-dot" style={{ background: '#FF5F57' }}></div>
              <div className="preview-dot" style={{ background: '#FEBC2E' }}></div>
              <div className="preview-dot" style={{ background: '#28C840' }}></div>
              <span style={{ fontSize: '12px', color: 'rgba(249,243,232,0.4)', marginLeft: '8px' }}>dashboard.qconnect.in/waiters</span>
            </div>
            <div className="preview-screen" style={{ gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Waiter Operations</span>
                <span style={{ fontSize: '11px', color: 'rgba(249,243,232,0.5)' }}>3 Waiters Online</span>
              </div>
              <div className="phone-menu-item" style={{ gap: '14px' }}>
                <div className="testi-avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>RK</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Ramesh Kumar</span>
                    <span style={{ color: '#4CAF50', fontSize: '11px' }}>● Active</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '2px', fontSize: '11px', color: 'rgba(249,243,232,0.5)' }}>
                    <span>Tables: 1, 2, 3</span>
                    <span>Avg Resp: 2.1m</span>
                  </div>
                </div>
              </div>
              <div className="phone-menu-item" style={{ gap: '14px' }}>
                <div className="testi-avatar" style={{ width: '36px', height: '36px', fontSize: '14px', background: 'linear-gradient(135deg, var(--gold-light), var(--rust))' }}>PS</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Priya Sharma</span>
                    <span style={{ color: '#4CAF50', fontSize: '11px' }}>● Active</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '2px', fontSize: '11px', color: 'rgba(249,243,232,0.5)' }}>
                    <span>Tables: 4, 5, 7</span>
                    <span>Avg Resp: 1.8m</span>
                  </div>
                </div>
              </div>
              <div className="phone-menu-item" style={{ gap: '14px', opacity: 0.6 }}>
                <div className="testi-avatar" style={{ width: '36px', height: '36px', fontSize: '14px', background: 'gray' }}>AM</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Arjun Mehta</span>
                    <span style={{ color: 'rgba(249,243,232,0.4)', fontSize: '11px' }}>Offline</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '2px', fontSize: '11px', color: 'rgba(249,243,232,0.4)' }}>
                    <span>Shift ended</span>
                    <span>Avg Resp: 2.4m</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'dashboard':
        return (
          <>
            <div className="preview-bar">
              <div className="preview-dot" style={{ background: '#FF5F57' }}></div>
              <div className="preview-dot" style={{ background: '#FEBC2E' }}></div>
              <div className="preview-dot" style={{ background: '#28C840' }}></div>
              <span style={{ fontSize: '12px', color: 'rgba(249,243,232,0.4)', marginLeft: '8px' }}>dashboard.qconnect.in/analytics</span>
            </div>
            <div className="preview-screen">
              <div className="dash-preview">
                <div className="dash-row">
                  <div className="dash-card">
                    <p className="dash-card-label" style={{ margin: '0 0 6px 0' }}>Today's Sales</p>
                    <h3 className="dash-card-val" style={{ margin: 0 }}>₹ 14,820</h3>
                  </div>
                  <div className="dash-card">
                    <p className="dash-card-label" style={{ margin: '0 0 6px 0' }}>Total Orders</p>
                    <h3 className="dash-card-val" style={{ margin: 0 }}>52</h3>
                  </div>
                </div>
                <div className="dash-card">
                  <p className="dash-card-label" style={{ marginBottom: '10px' }}>Top Selling Items</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                        <span>Paneer Tikka (24 orders)</span>
                        <span style={{ color: 'var(--gold)' }}>₹6,720</span>
                      </div>
                      <div className="dash-bar-row">
                        <div className="dash-bar-fill" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                        <span>Dal Makhani (18 orders)</span>
                        <span style={{ color: 'var(--gold)' }}>₹3,960</span>
                      </div>
                      <div className="dash-bar-row">
                        <div className="dash-bar-fill" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                        <span>Butter Chicken (12 orders)</span>
                        <span style={{ color: 'var(--gold)' }}>₹4,080</span>
                      </div>
                      <div className="dash-bar-row">
                        <div className="dash-bar-fill" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'qr':
        return (
          <>
            <div className="preview-bar">
              <div className="preview-dot" style={{ background: '#FF5F57' }}></div>
              <div className="preview-dot" style={{ background: '#FEBC2E' }}></div>
              <div className="preview-dot" style={{ background: '#28C840' }}></div>
              <span style={{ fontSize: '12px', color: 'rgba(249,243,232,0.4)', marginLeft: '8px' }}>dashboard.qconnect.in/qr-codes</span>
            </div>
            <div className="preview-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div className="qr-preview-card">
                <div style={{ fontSize: '11px', color: 'rgba(249,243,232,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Spice Garden - Table 7</div>
                <div className="qr-grid">
                  {Array.from({ length: 49 }).map((_, idx) => {
                    const isFilled = (idx % 2 === 0 && idx % 3 !== 0) || idx < 7 || idx % 7 === 0 || idx > 42 || idx % 7 === 6;
                    return (
                      <div 
                        key={idx} 
                        className="qr-cell" 
                        style={{ background: isFilled ? 'var(--gold)' : 'transparent' }}
                      ></div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Scan to Order Menu</div>
                <div style={{ fontSize: '10px', color: 'rgba(249,243,232,0.4)' }}>Powered by QConnect</div>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="landing-page-root">

      {/* 2. Nav Bar */}
      <nav className={isScrolled ? 'scrolled' : ''}>
        <div className="nav-logo">
          <div className="nav-logo-icon">🍽</div>
          QConnect
        </div>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#testimonials">Reviews</a>
        </div>
        <button onClick={handleCtaClick} className="nav-cta">
          {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
        </button>
      </nav>

      {/* 3. Hero Section */}
      <section id="hero">
        <div className="hero-bg"></div>
        <canvas id="hero-canvas" ref={canvasRef}></canvas>

        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          Now live in 200+ restaurants across India
        </div>

        <h1 className="hero-title">
          The <em>smarter</em><br />way to run<br />your restaurant
        </h1>
        <p className="hero-sub">
          QConnect OS brings QR menus, waiter management, real-time orders, and owner analytics into one seamless platform — built for modern Indian dining.
        </p>

        <div className="hero-actions">
          <button onClick={handleCtaClick} className="btn-primary">
            {isLoggedIn ? 'Go to Dashboard →' : 'Start Free Trial →'}
          </button>
          <a href="#how" className="btn-ghost">See How It Works</a>
        </div>

        <div className="hero-stats" ref={statsRef}>
          <div className="hero-stat">
            <span className="hero-stat-num">{stats.restaurants}+</span>
            <span className="hero-stat-label">Restaurants</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{stats.security}%</span>
            <span className="hero-stat-label">Security Score</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{stats.orders}%</span>
            <span className="hero-stat-label">Faster Orders</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{stats.rating}</span>
            <span className="hero-stat-label">App Rating</span>
          </div>
        </div>

        <div className="scroll-hint">
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* 4. Strip Marquee */}
      <div className="strip">
        <div className="strip-track">
          <span className="strip-item">QR Code Menus</span><span className="strip-dot"></span>
          <span className="strip-item">Real-Time Orders</span><span className="strip-dot"></span>
          <span className="strip-item">Waiter Management</span><span className="strip-dot"></span>
          <span className="strip-item">Owner Dashboard</span><span className="strip-dot"></span>
          <span className="strip-item">Multi-Branch Support</span><span className="strip-dot"></span>
          <span className="strip-item">Customer Insights</span><span className="strip-dot"></span>
          <span className="strip-item">Instant Notifications</span><span className="strip-dot"></span>
          <span className="strip-item">Secure & Fast</span><span className="strip-dot"></span>
          <span className="strip-item">QR Code Menus</span><span className="strip-dot"></span>
          <span className="strip-item">Real-Time Orders</span><span className="strip-dot"></span>
          <span className="strip-item">Waiter Management</span><span className="strip-dot"></span>
          <span className="strip-item">Owner Dashboard</span><span className="strip-dot"></span>
          <span className="strip-item">Multi-Branch Support</span><span className="strip-dot"></span>
          <span className="strip-item">Customer Insights</span><span className="strip-dot"></span>
          <span className="strip-item">Instant Notifications</span><span className="strip-dot"></span>
          <span className="strip-item">Secure & Fast</span><span className="strip-dot"></span>
        </div>
      </div>

      {/* 5. How It Works */}
      <section id="how">
        <div className="reveal">
          <span className="section-label">How It Works</span>
          <h2 className="section-title">From table scan<br />to kitchen in <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>seconds</em></h2>
        </div>
        <div className="steps-grid reveal reveal-delay-1">
          <div className="step-card">
            <span className="step-num">01</span>
            <div className="step-icon">📱</div>
            <h3 className="step-title">Customer scans QR</h3>
            <p className="step-desc">Every table gets a unique QR code. Customers scan it, instantly see your full digital menu — no app download, no login needed.</p>
          </div>
          <div className="step-card">
            <span className="step-num">02</span>
            <div className="step-icon">🛒</div>
            <h3 className="step-title">Browse & order</h3>
            <p className="step-desc">Beautiful menu with photos, descriptions, dietary tags, and live availability. Customers add items, customize, and place their order in under a minute.</p>
          </div>
          <div className="step-card">
            <span className="step-num">03</span>
            <div className="step-icon">🔔</div>
            <h3 className="step-title">Waiter is notified</h3>
            <p className="step-desc">The assigned waiter gets an instant push notification with the table, items, and any special requests. No shouting across the floor.</p>
          </div>
          <div className="step-card">
            <span className="step-num">04</span>
            <div className="step-icon">📊</div>
            <h3 className="step-title">Owner sees everything</h3>
            <p className="step-desc">Real-time dashboard shows live orders, top-selling dishes, revenue trends, waiter performance, and table turnover — all from your phone.</p>
          </div>
        </div>
      </section>

      {/* 6. Features Grid */}
      <section id="features">
        <div className="reveal">
          <span className="section-label">Platform Features</span>
          <h2 className="section-title">Everything your<br />restaurant needs</h2>
          <p className="section-desc">Built from the ground up for the pace and complexity of modern restaurant operations.</p>
        </div>

        <div className="features-layout">
          <div className="features-list reveal reveal-delay-1" role="tablist" aria-label="Platform Features">
            <div 
              className={`feature-tab ${activeFeature === 'menu' ? 'active' : ''}`}
              onClick={() => setActiveFeature('menu')}
              onKeyDown={(e) => handleFeatureKeyDown(e, 'menu')}
              role="tab"
              tabIndex={0}
              aria-selected={activeFeature === 'menu'}
              aria-controls="feature-preview"
              id="tab-menu"
            >
              <div className="feature-tab-head">
                <div className="feature-tab-icon">🍽</div>
                <div className="feature-tab-title">Smart Digital Menus</div>
              </div>
              <div className="feature-tab-desc">Upload your full menu with photos, pricing, and dietary flags. Update instantly — no reprinting, no downtime. Customers always see your latest offerings.</div>
            </div>
            <div 
              className={`feature-tab ${activeFeature === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveFeature('orders')}
              onKeyDown={(e) => handleFeatureKeyDown(e, 'orders')}
              role="tab"
              tabIndex={0}
              aria-selected={activeFeature === 'orders'}
              aria-controls="feature-preview"
              id="tab-orders"
            >
              <div className="feature-tab-head">
                <div className="feature-tab-icon">⚡</div>
                <div className="feature-tab-title">Real-Time Order Flow</div>
              </div>
              <div className="feature-tab-desc">Orders go from table → waiter → kitchen instantly. Live status tracking so your team stays in sync without a single phone call.</div>
            </div>
            <div 
              className={`feature-tab ${activeFeature === 'waiter' ? 'active' : ''}`}
              onClick={() => setActiveFeature('waiter')}
              onKeyDown={(e) => handleFeatureKeyDown(e, 'waiter')}
              role="tab"
              tabIndex={0}
              aria-selected={activeFeature === 'waiter'}
              aria-controls="feature-preview"
              id="tab-waiter"
            >
              <div className="feature-tab-head">
                <div className="feature-tab-icon">👤</div>
                <div className="feature-tab-title">Waiter Management</div>
              </div>
              <div className="feature-tab-desc">Assign waiters to tables, track their active orders, monitor response times, and manage shifts — all from one dashboard.</div>
            </div>
            <div 
              className={`feature-tab ${activeFeature === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveFeature('dashboard')}
              onKeyDown={(e) => handleFeatureKeyDown(e, 'dashboard')}
              role="tab"
              tabIndex={0}
              aria-selected={activeFeature === 'dashboard'}
              aria-controls="feature-preview"
              id="tab-dashboard"
            >
              <div className="feature-tab-head">
                <div className="feature-tab-icon">📈</div>
                <div className="feature-tab-title">Owner Analytics Dashboard</div>
              </div>
              <div className="feature-tab-desc">Revenue by day, week, month. Top items. Peak hours. Table efficiency. Everything an owner needs to make smart decisions, live.</div>
            </div>
            <div 
              className={`feature-tab ${activeFeature === 'qr' ? 'active' : ''}`}
              onClick={() => setActiveFeature('qr')}
              onKeyDown={(e) => handleFeatureKeyDown(e, 'qr')}
              role="tab"
              tabIndex={0}
              aria-selected={activeFeature === 'qr'}
              aria-controls="feature-preview"
              id="tab-qr"
            >
              <div className="feature-tab-head">
                <div className="feature-tab-icon">🔲</div>
                <div className="feature-tab-title">QR Code Generator</div>
              </div>
              <div className="feature-tab-desc">One-click QR generation per table or branch. Print-ready, customizable with your logo and brand colors. Works on any device instantly.</div>
            </div>
          </div>

          <div className="features-preview reveal reveal-delay-2" id="feature-preview" role="tabpanel" aria-labelledby={`tab-${activeFeature}`} aria-hidden="true">
            {renderPreviewContent()}
          </div>
        </div>
      </section>

      {/* 7. Phone Simulator Details */}
      <section style={{ background: 'var(--dark2)', padding: '100px 60px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div className="reveal">
            <span className="section-label">Customer Experience</span>
            <h2 className="section-title" style={{ marginBottom: '20px' }}>A menu your guests<br />will actually <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>love</em></h2>
            <p style={{ fontSize: '17px', color: 'rgba(249,243,232,0.6)', lineHeight: '1.7', marginBottom: '36px' }}>
              Scan. Browse. Order. In seconds — no app, no account, no friction. Just a beautiful menu that works every time.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px', padding: 0 }}>
              <li style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%', marginTop: '7px', flexShrink: 0 }}></div>
                <span style={{ fontSize: '15px', color: 'rgba(249,243,232,0.75)' }}>High-res food photos that convert browsers to orderers</span>
              </li>
              <li style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%', marginTop: '7px', flexShrink: 0 }}></div>
                <span style={{ fontSize: '15px', color: 'rgba(249,243,232,0.75)' }}>Dietary filters: Veg, Jain, Gluten-Free, Spice level</span>
              </li>
              <li style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%', marginTop: '7px', flexShrink: 0 }}></div>
                <span style={{ fontSize: '15px', color: 'rgba(249,243,232,0.75)' }}>Cart and special instructions with one tap</span>
              </li>
              <li style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%', marginTop: '7px', flexShrink: 0 }}></div>
                <span style={{ fontSize: '15px', color: 'rgba(249,243,232,0.75)' }}>Works on any phone, any browser — zero installs</span>
              </li>
            </ul>
          </div>
          
          <div className="phone-wrap reveal reveal-delay-2" aria-hidden="true">
            <div className="phone">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(249,243,232,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Table 7 · Spice Garden</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '700' }}>Choose your dishes</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--gold)', color: 'var(--dark)', fontSize: '11px', fontWeight: '600', padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>All</div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', fontSize: '11px', padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap', color: 'rgba(249,243,232,0.6)' }}>Starters</div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', fontSize: '11px', padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap', color: 'rgba(249,243,232,0.6)' }}>Mains</div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', fontSize: '11px', padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap', color: 'rgba(249,243,232,0.6)' }}>Drinks</div>
                </div>
                <div className="phone-menu-item">
                  <div className="phone-item-thumb" style={{ background: 'linear-gradient(135deg, #C4541F, #E87D4A)' }}></div>
                  <div>
                    <div className="phone-item-name">Paneer Tikka</div>
                    <div className="phone-item-price">₹ 280</div>
                  </div>
                  <div className="phone-item-add">+</div>
                </div>
                <div className="phone-menu-item">
                  <div className="phone-item-thumb" style={{ background: 'linear-gradient(135deg, #3A5A3C, #5A8C5C)' }}></div>
                  <div>
                    <div className="phone-item-name">Dal Makhani</div>
                    <div className="phone-item-price">₹ 220</div>
                  </div>
                  <div className="phone-item-add">+</div>
                </div>
                <div className="phone-menu-item">
                  <div className="phone-item-thumb" style={{ background: 'linear-gradient(135deg, #8B4513, #C4841A)' }}></div>
                  <div>
                    <div className="phone-item-name">Butter Chicken</div>
                    <div className="phone-item-price">₹ 340</div>
                  </div>
                  <div className="phone-item-add">+</div>
                </div>
                <div className="phone-menu-item">
                  <div className="phone-item-thumb" style={{ background: 'linear-gradient(135deg, #1A1A6E, #4040B2)' }}></div>
                  <div>
                    <div className="phone-item-name">Gulab Jamun</div>
                    <div className="phone-item-price">₹ 120</div>
                  </div>
                    <div className="phone-item-add">+</div>
                </div>
                <div style={{ marginTop: '16px', background: 'var(--gold)', borderRadius: '14px', padding: '14px', textAlign: 'center', color: 'var(--dark)', fontWeight: '700', fontSize: '14px' }}>
                  Place Order · ₹ 840
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div style={{ position: 'absolute', top: '50px', right: '-20px', background: 'var(--dark3)', border: '0.5px solid rgba(201,149,42,0.3)', borderRadius: '14px', padding: '12px 16px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', zIndex: 10 }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--gold)', fontFamily: 'Playfair Display, serif' }}>2.4s</div>
              <div style={{ fontSize: '10px', color: 'rgba(249,243,232,0.5)', letterSpacing: '.5px' }}>avg order time</div>
            </div>
            <div style={{ position: 'absolute', bottom: '80px', left: '-20px', background: 'var(--dark3)', border: '0.5px solid rgba(201,149,42,0.3)', borderRadius: '14px', padding: '12px 16px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#4CAF50', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>Order confirmed</div>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(249,243,232,0.5)', marginTop: '2px' }}>Table 7 · 3 items</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Pricing Grid */}
      <section id="pricing">
        <div className="reveal">
          <span className="section-label">Simple Pricing</span>
          <h2 className="section-title">One platform,<br />fair <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>pricing</em></h2>
          <p className="section-desc">No hidden fees. No per-transaction cuts. Flat monthly plans that grow with you.</p>
        </div>
        
        <div className="pricing-grid">
          <div className="plan-card reveal reveal-delay-1">
            <div className="plan-name">Starter</div>
            <div className="plan-desc">For small cafes and single-table eateries just getting started.</div>
            <div className="plan-price">₹999<span>/mo</span></div>
            <div className="plan-period">billed monthly · no contract</div>
            <ul className="plan-features">
              <li>Up to 10 tables</li>
              <li>QR menu generation</li>
              <li>3 waiter accounts</li>
              <li>Basic analytics</li>
              <li>Email support</li>
            </ul>
            <button onClick={handleCtaClick} className="plan-btn plan-btn-outline" style={{ width: '100%' }}>
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
          
          <div className="plan-card featured reveal reveal-delay-2">
            <div className="plan-name">Professional</div>
            <div className="plan-desc">For growing restaurants that need full control and insights.</div>
            <div className="plan-price">₹2,499<span>/mo</span></div>
            <div className="plan-period">billed monthly · no contract</div>
            <ul className="plan-features">
              <li>Up to 50 tables</li>
              <li>Custom branded QR codes</li>
              <li>Unlimited waiter accounts</li>
              <li>Full analytics + exports</li>
              <li>Real-time order dashboard</li>
              <li>Priority support</li>
            </ul>
            <button onClick={handleCtaClick} className="plan-btn plan-btn-fill" style={{ width: '100%' }}>
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
          
          <div className="plan-card reveal reveal-delay-3">
            <div className="plan-name">Enterprise</div>
            <div className="plan-desc">Multi-branch chains with custom integrations and dedicated support.</div>
            <div className="plan-price" style={{ fontSize: '36px' }}>Custom</div>
            <div className="plan-period">annual contract · SLA included</div>
            <ul className="plan-features">
              <li>Unlimited tables & branches</li>
              <li>White-label option</li>
              <li>API access</li>
              <li>Dedicated account manager</li>
              <li>Custom integrations</li>
              <li>99.9% uptime SLA</li>
            </ul>
            <button onClick={handleCtaClick} className="plan-btn plan-btn-outline" style={{ width: '100%' }}>
              {isLoggedIn ? 'Go to Dashboard' : 'Contact Sales'}
            </button>
          </div>
        </div>
      </section>

      {/* 9. Reviews Section */}
      <section id="testimonials">
        <div className="reveal">
          <span className="section-label">What Owners Say</span>
          <h2 className="section-title">Loved by restaurant<br />owners across <em style={{ color: 'var(--rust)', fontStyle: 'italic' }}>India</em></h2>
        </div>
        <div className="testi-grid">
          <div className="testi-card reveal reveal-delay-1">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">"We cut our order errors by 80% in the first week. The QR system is so slick that even our older customers figured it out without help."</p>
            <div className="testi-author">
              <div className="testi-avatar">RK</div>
              <div>
                <div className="testi-name">Rajesh Kumar</div>
                <div className="testi-role">Owner · Spice Garden, Hyderabad</div>
              </div>
            </div>
          </div>
          <div className="testi-card reveal reveal-delay-2">
            <div className="testi-stars">★★★★★</div>
            <p class="testi-text">"My waiters spend less time running back and forth — orders go straight from customer to kitchen. Table turnover is up 35% since we launched."</p>
            <div className="testi-author">
              <div className="testi-avatar">PS</div>
              <div>
                <div className="testi-name">Priya Sharma</div>
                <div className="testi-role">Owner · Tandoor House, Bangalore</div>
              </div>
            </div>
          </div>
          <div className="testi-card reveal reveal-delay-3">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">"The owner dashboard alone is worth it. I can see exactly what's selling, which waiter is fastest, and where my revenue is coming from — in real time."</p>
            <div className="testi-author">
              <div className="testi-avatar">AM</div>
              <div>
                <div className="testi-name">Arjun Mehta</div>
                <div className="testi-role">Owner · The Curry Leaf, Mumbai</div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* 11. Final Call To Action */}
      <section id="cta">
        <div className="reveal">
          <h2 className="cta-title">Ready to <em>transform</em><br />your restaurant?</h2>
          <p className="cta-sub">Join 200+ restaurants already running smarter with QConnect OS. Setup takes under 10 minutes.</p>
          <div className="cta-actions">
            <button onClick={handleCtaClick} className="btn-primary">
              {isLoggedIn ? 'Go to Dashboard' : 'Start Free 14-Day Trial →'}
            </button>
            <a href="tel:+919999999999" className="btn-ghost">Talk to Sales</a>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(249,243,232,0.3)', marginTop: '24px', position: 'relative' }}>
            No credit card required · Cancel anytime · Setup in 10 minutes
          </p>
        </div>
      </section>

      {/* 12. Footer */}
      <footer>
        <div className="footer-grid">
          <div>
            <div className="footer-brand">🍽 QConnect</div>
            <p className="footer-brand-desc">The complete restaurant operating system for modern Indian dining. QR menus, order management, and owner analytics — all in one.</p>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#">Changelog</a></li>
              <li><a href="#">API Docs</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              <li><Link to="/about">About Us</Link></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Legal</div>
            <ul className="footer-links">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2025 QConnect Technologies Pvt. Ltd. · Hyderabad, India</div>
          <div className="footer-copy">Built with ♥ for Indian restaurants</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
