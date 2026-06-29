import { useEffect } from "react";

export default function AdsSlot() {
  useEffect(() => {

      (window.adsbygoogle = window.adsbygoogle || []).push({});
 
  }, []);

  return (
    <>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4477395297407518"
        data-ad-slot="2588784676"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
