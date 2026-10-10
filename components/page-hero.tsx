import Image from "next/image";

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="page-hero"><div className="page-hero-media"><Image className="page-hero-image" src="/fleet-mpv.jpg" alt="Armada NaKay Trans siap berangkat" fill sizes="40vw"/></div><div className="page-hero-glow"/><div className="container page-hero-content"><div className="eyebrow light"><span />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div></section>;
}
