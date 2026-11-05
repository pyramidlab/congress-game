import {Suspense} from 'react';
import Display from '@/components/display';
export default function Page(){return <Suspense fallback={<main className="loading-page">Opening the big screen…</main>}><Display/></Suspense>;}
