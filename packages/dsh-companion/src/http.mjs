// Use DSH's installed proxy route without changing its process-wide policy.
export function createDshFetch(fetcher,proxyRouteFor){
  return (url,options={})=>{
    const route=proxyRouteFor(new URL(url));
    return fetcher(url,{...options,...(route.proxied?{dispatcher:route.dispatcher}:{})});
  };
}
