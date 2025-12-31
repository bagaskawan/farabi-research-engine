import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function CreateProjectCard() {
  return (
    <Link href="/research" className="h-full">
      <Card
        className="bg-card rounded-xl border-2 border-dashed border-border hover:border-solid hover:border-primary 
             hover:shadow-lg transition-all duration-300 cursor-pointer 
             flex flex-col items-center justify-center h-[200px] group"
      >
        <div className="p-6 text-center">
          <Plus
            className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors duration-300 mx-auto"
            strokeWidth={1.5}
          />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Create New Project
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Click here to add a new project.
          </p>
        </div>
      </Card>
    </Link>
  );
}
