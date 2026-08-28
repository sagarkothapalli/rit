import WorkspaceShell from "@/components/cases/WorkspaceShell";
import CaseTypeChooser from "@/components/cases/CaseTypeChooser";

export default function NewCasePage() {
  return (
    <WorkspaceShell>
      <CaseTypeChooser />
    </WorkspaceShell>
  );
}
