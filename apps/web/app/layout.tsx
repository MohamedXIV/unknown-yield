import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Unknown Yield — Field Operations',description:'An industrial discovery game. Experiment with unknown materials and turn what you learn into a working export line.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
