import type {Metadata} from 'next';
import './globals.css';
import './game-ui-skins.css';
import './game-ui-geometry.css';
import './game-menu-industrial.css';
import './game-ui-reference-frame.css';
export const metadata:Metadata={title:'Unknown Yield — The First Assignment',description:'A state-operated industrial discovery expedition. Experiment with unknown materials, build physical production lines, and turn evidence into exports.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
