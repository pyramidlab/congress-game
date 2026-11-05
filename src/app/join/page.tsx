import {Suspense} from 'react';
import PlayerScreen from '@/components/player';
export default function Page(){return <Suspense fallback={<main className="loading-page">Getting ready…</main>}><PlayerScreen/></Suspense>;}
