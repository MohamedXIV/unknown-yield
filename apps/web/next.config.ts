import type {NextConfig} from 'next';
// `npm run dev:studio` sets STUDIO_DEV so the generated local Studio API route
// can run. Production builds never set it and always export static files.
const config:NextConfig={...(process.env.STUDIO_DEV?{}:{output:'export'}),trailingSlash:true,transpilePackages:['@site/content','@site/sim-core'],devIndicators:false};
export default config;
