import Link from 'next/link';
import {Brand} from '@/components/brand';
import {event} from '@/lib/event';
export default function Home(){return <main className="landing event-landing">
 <nav className="topnav" aria-label="Main navigation"><Brand/><Link className="text-link" href="/host">Host desk <span aria-hidden="true">↗</span></Link></nav>
 <section className="event-hero" aria-labelledby="event-title">
  <div className="event-welcome"><div className="eyebrow"><span className="dot"/>{event.organization} · {event.area}</div><div className="event-edition">STUDENT CONGRESS <span>1.0</span></div><h1 id="event-title">Shine for<br/>a <em>Purpose.</em></h1><p className="event-intro">Our campuses. One fellowship.<br/>Welcome to the Congress quiz &amp; survey showdown.</p><div className="hero-actions"><Link className="button primary" href="/join">Join the Congress game <span aria-hidden="true">→</span></Link></div><p className="event-join-note">At the event? Enter the six-digit PIN on the big screen.<br/>No app to download.</p><dl className="event-details"><div><dt>THE GATHERING</dt><dd>{event.dates}</dd></div><div><dt>THE PLACE</dt><dd>{event.venue}</dd></div></dl></div>
  <figure className="event-poster"><img src="/event/congress-flier.webp" width="900" height="1125" loading="lazy" decoding="async" alt="Student Congress 1.0 event flier: Shine for a Purpose, AFCF Ekiti Area, 30 October to 1 November 2026, Apostolic Faith Church, Iyin-Ekiti."/><figcaption>Be a shining light. <span>John 1:4–5</span></figcaption></figure>
 </section>
 <section className="how-grid" aria-label="How the Congress game works"><article><span className="step">01</span><h2>Represent your campus.</h2><p>Scan the QR code or enter the host’s PIN. Choose your name and campus to join the room.</p></article><article><span className="step">02</span><h2>Play the quiz together.</h2><p>Start with a practice question, then follow the big screen and tap your answers on your phone.</p></article><article><span className="step">03</span><h2>Shine on the stage.</h2><p>The top eight form four teams for our survey showdown. Cheer them on as we crown our champions.</p></article></section>
 <footer className="footer"><span>AFCF EKITI AREA · STUDENT CONGRESS 1.0</span><span>SHINE FOR A PURPOSE</span></footer>
 </main>;}
