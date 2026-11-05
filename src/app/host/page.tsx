import {Suspense} from 'react';
import Host from '@/components/host';
export default function Page(){return <Suspense fallback={<main className="loading-page">Opening the control room…</main>}><Host/></Suspense>;}
