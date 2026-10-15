import { Hero } from "@/components/site/sections/Hero";
import { Manifesto } from "@/components/site/sections/Manifesto";
import { Marquee } from "@/components/site/sections/Marquee";
import { Locks } from "@/components/site/sections/Locks";
import { SpacePreview } from "@/components/site/sections/SpacePreview";
import { Process } from "@/components/site/sections/Process";
import { Figures } from "@/components/site/sections/Figures";
import { FinalCta } from "@/components/site/sections/FinalCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Manifesto />
      <Marquee />
      <Locks />
      <SpacePreview />
      <Process />
      <Figures />
      <FinalCta />
    </>
  );
}
