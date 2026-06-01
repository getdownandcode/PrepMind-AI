import { InterviewSession } from "@/components/interview/interview-session";

export default function InterviewPage({ params }: { params: { id: string } }) {
  return <InterviewSession initialInterviewId={params.id} />;
}
