import type { Metadata } from "next";
import PageTransition from "@/components/PageTransition";
import StoryStage from "@/components/story/StoryStage";
import "./story.css";

// Not linked anywhere: this route is only for recording the video's title, stat and closing cards.
export const metadata: Metadata = {
  title: "RipWatch",
  robots: { index: false, follow: false },
};

export default function StoryPage() {
  return (
    <PageTransition>
      <StoryStage />
    </PageTransition>
  );
}
