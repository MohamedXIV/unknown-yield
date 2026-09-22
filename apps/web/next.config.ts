import type {NextConfig} from 'next';
const config:NextConfig={output:'export',trailingSlash:true,transpilePackages:['@site/content','@site/sim-core'],devIndicators:false};
export default config;
