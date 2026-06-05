import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function InterviewReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Interview report</h1>
      <Card>
        <p className="text-sm text-muted-foreground">
          Interview {params.id} is complete. Detailed scoring can be shown here once the backend
          exposes a report endpoint.
        </p>
      </Card>
      <Link className="text-sm text-primary hover:underline" href="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}
