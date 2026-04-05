import { Sparkles } from "lucide-react";
import { useDishani } from "./DishaniContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DishaniFloatingButton() {
  const { toggleDishani, isOpen } = useDishani();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleDishani}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all duration-300",
              "bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl",
              isOpen && "ring-2 ring-accent ring-offset-2 ring-offset-background"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Ask Dishani</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Your AI guide for Operix</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
