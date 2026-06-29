// public/gtag-init.js
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

// Thay thế ID của bạn
const GA_TRACKING_ID = 'G-DYSN7QBH35'; 
gtag('config', GA_TRACKING_ID, {
  page_path: window.location.pathname,
});