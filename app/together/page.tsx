import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import TogetherSpace from "@/components/space/TogetherSpace";

export default function TogetherPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <TogetherSpace />
    </Suspense>
  );
}
