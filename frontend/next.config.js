/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * The site is one page now. The two addresses it used to have are kept
   * working, so an old bookmark or an old link lands on the section it used
   * to show instead of on a broken page.
   */
  async redirects() {
    return [
      { source: "/ferries", destination: "/#ferries", permanent: false },
      { source: "/stations", destination: "/#stations", permanent: false },
    ];
  },
};

module.exports = nextConfig;
