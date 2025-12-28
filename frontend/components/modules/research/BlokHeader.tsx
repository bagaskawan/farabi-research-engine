import { AudioWaveIcon } from "@/components/ui/icons";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ButtonX from "@/components/ui/button-x";

export default function BlokHeader() {
  return (
    <>
      <ThemeToggle />
      <header className="w-full min-w-full h-full mx-auto">
        <Link href="/">
          <div className="bg-foreground h-10 px-4 sm:px-6 lg:px-8 sticky top-0 z-10 flex justify-end cursor-pointer">
            <ButtonX className="text-primary-foreground" />
          </div>
        </Link>
      </header>
    </>
  );
}
