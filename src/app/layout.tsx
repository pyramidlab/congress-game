import type {Metadata} from 'next';
import './globals.css';
import {event} from '@/lib/event';
export const metadata:Metadata={title:'AFCF Ekiti Student Congress 1.0 · Shine for a Purpose',description:`${event.organization}, ${event.area}. ${event.name}: ${event.theme}. ${event.dates}, ${event.venue}. Join the Congress quiz and survey showdown.`,icons:{icon:'/event/afcf-logo.webp'},robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
