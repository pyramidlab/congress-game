import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Congress Game · Every campus, one game',description:'A live quiz and survey tournament for your congress. Join your campus and play together.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
